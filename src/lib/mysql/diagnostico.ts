/**
 * Diagnóstico de falhas do banco (correção pedida em 2026-10-17).
 *
 * Com o MySQL fora do ar, todas as rotas respondiam 500 com mensagens
 * genéricas ("Falha ao carregar configuração pública", "Falha ao criar a
 * conta") e nada dizia que o problema era o banco. Aqui a falha é
 * classificada: a API responde 503 (serviço indisponível) com uma mensagem
 * clara e o terminal do servidor ganha uma linha com a causa e o comando
 * que resolve.
 */

export type FalhaDoBanco =
  'sem-conexao' | 'acesso-negado' | 'banco-inexistente' | 'sem-migrations';

const SEM_CONEXAO = new Set([
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'EAI_AGAIN',
  'ECONNRESET',
  'PROTOCOL_CONNECTION_LOST',
  'ER_CON_COUNT_ERROR',
]);

function codigoDoErro(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }
  const codigo = (error as { code?: unknown }).code;
  return typeof codigo === 'string' ? codigo : null;
}

/** Tipo de falha do banco, ou `null` quando o erro não é de banco. */
export function classificarFalhaDoBanco(error: unknown): FalhaDoBanco | null {
  const codigo = codigoDoErro(error);
  if (!codigo) {
    return null;
  }
  if (SEM_CONEXAO.has(codigo)) {
    return 'sem-conexao';
  }
  if (
    codigo === 'ER_ACCESS_DENIED_ERROR' ||
    codigo === 'ER_DBACCESS_DENIED_ERROR'
  ) {
    return 'acesso-negado';
  }
  if (codigo === 'ER_BAD_DB_ERROR') {
    return 'banco-inexistente';
  }
  if (codigo === 'ER_NO_SUCH_TABLE' || codigo === 'ER_BAD_FIELD_ERROR') {
    return 'sem-migrations';
  }
  return null;
}

/** Mensagem para quem usa o app: sem detalhes internos. */
export const MENSAGEM_DE_BANCO_INDISPONIVEL =
  'O banco de dados está indisponível no momento. Tente de novo em instantes.';

/** Destino que o app tenta usar, para a linha de diagnóstico. */
function destinoDoBanco(): string {
  const host = process.env.MYSQL_HOST ?? '(MYSQL_HOST ausente)';
  const porta = process.env.MYSQL_PORT ?? '3306';
  const banco = process.env.MYSQL_DATABASE ?? '(MYSQL_DATABASE ausente)';
  return `${host}:${porta}/${banco}`;
}

/** Causa e comando que resolve, para o terminal do servidor. */
export function dicaParaOTerminal(falha: FalhaDoBanco): string {
  const destino = destinoDoBanco();
  switch (falha) {
    case 'sem-conexao':
      return `MySQL inacessível em ${destino}. Suba o banco com "./run.sh db" (WSL2/Linux), "py run_windows.py db" (Windows) ou "pnpm db:start", e confira MYSQL_HOST e MYSQL_PORT no .env.local.`;
    case 'acesso-negado':
      return `O MySQL recusou o usuário em ${destino}. Confira MYSQL_USER e MYSQL_PASSWORD no .env.local (devem ser os mesmos usados quando o volume do banco foi criado).`;
    case 'banco-inexistente':
      return `O banco ${destino} não existe. Rode "./run.sh db", "py run_windows.py db" ou "pnpm db:start" para criá-lo e aplicar as migrations.`;
    case 'sem-migrations':
      return `Faltam tabelas ou colunas em ${destino}: há migrations pendentes. Rode "./run.sh migrate", "py run_windows.py migrate" ou "pnpm db:migrate".`;
  }
}

// Uma linha por tipo de falha a cada 30 s: com o banco fora do ar, cada
// página dispara várias requisições e o terminal ficaria ilegível.
const INTERVALO_DO_AVISO_MS = 30_000;
const ultimoAviso = new Map<FalhaDoBanco, number>();

/** Registra a dica no terminal, no máximo uma vez a cada 30 s por tipo. */
export function avisarFalhaDoBanco(falha: FalhaDoBanco, agora = Date.now()) {
  const anterior = ultimoAviso.get(falha);
  if (anterior !== undefined && agora - anterior < INTERVALO_DO_AVISO_MS) {
    return false;
  }
  ultimoAviso.set(falha, agora);
  console.error(`[banco] ${dicaParaOTerminal(falha)}`);
  return true;
}
