import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import {
  assinaturaDaCadeia,
  cadeiaTemModelo,
  gerarNaCadeia,
  montarCadeia,
  somenteLocais,
} from '@/lib/ai/cadeia-de-modelos';
import { lerConfiguracaoDeIa } from '@/lib/ai/provedores-da-plataforma';
import { preferenciasDaMemoria } from '@/lib/memoria/servico';
import { lerContextoDoCoach } from '@/lib/coach/contexto';
import { gerarDiaLocal } from '@/lib/coach/gerador-local';
import { LocalSemNascerDoSolError } from '@/lib/astrology/panchang';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { requireFeatureEnabled, recursoHabilitado } from '@/lib/plans/service';
import { exigirDiaNoHistorico } from '@/lib/plans/historico';
import type { AppSession } from '@/types/app-session';
import type { DescricoesDasMetricas } from './catalogo';
import {
  assinaturaDasDescricoes,
  descricoesSchema,
  entradasDasDescricoes,
  ESQUEMA_DAS_DESCRICOES,
  lerDescricoes,
  SISTEMA_DAS_DESCRICOES,
} from './geracao';

export interface ResultadoDasDescricoes {
  estado:
    'pronto' | 'sem_modelo' | 'privado' | 'atualizando' | 'limite' | 'falha';
  descricoes: DescricoesDasMetricas;
  atualizadoEm?: string;
}
interface Linha extends RowDataPacket {
  inputs_hash: string;
  status: string;
  content: unknown;
  attempts: number;
  ocupado: number;
  aguardar: number;
  generated_at: string | null;
}
function conteudo(bruto: unknown) {
  try {
    return descricoesSchema.safeParse(
      typeof bruto === 'string' ? JSON.parse(bruto) : bruto
    );
  } catch {
    return null;
  }
}
export const LIMITE_DIARIO_DE_DESCRICOES = 6;
export const TEMPO_MAXIMO_DAS_DESCRICOES_MS = 120_000;

/** Uma reserva durável por titular/dia impede duplicação entre processos. */
export async function obterDescricoesDoPainel(
  session: AppSession,
  data: string,
  privado: boolean
): Promise<ResultadoDasDescricoes> {
  await requireFeatureEnabled(session, 'health_intelligence');
  await exigirDiaNoHistorico(session.user.id, data);
  const vazio = (
    estado: ResultadoDasDescricoes['estado']
  ): ResultadoDasDescricoes => ({ estado, descricoes: {} });
  if (privado) return vazio('privado');
  const configuracao = await lerConfiguracaoDeIa();
  const preferencias = await preferenciasDaMemoria(session.user.id);
  const completa = montarCadeia(configuracao);
  const cadeia = preferencias?.allow_cloud ? completa : somenteLocais(completa);
  if (!cadeiaTemModelo(cadeia)) return vazio('sem_modelo');
  const lerEntradas = async () => {
    const [linha] = await queryRows<Record<string, unknown>>(
      'SELECT * FROM daily_metrics WHERE user_id=? AND date=?',
      [session.user.id, data]
    );
    const comEscores = await recursoHabilitado(
      session.user.id,
      session.user.role,
      'ai_scores'
    );
    return entradasDasDescricoes(
      linha && !comEscores
        ? { ...linha, readiness_score: null, recovery_score: null }
        : (linha ?? null)
    );
  };
  const entradas = await lerEntradas();
  const instanteDaLeitura = new Date(`${data}T12:00:00Z`);
  const lerInterpretacao = async () => {
    if (
      !(await recursoHabilitado(
        session.user.id,
        session.user.role,
        'vedic_insights'
      ))
    )
      return {
        indisponivel: 'A leitura interpretativa não está habilitada no plano.',
      };
    const contexto = await lerContextoDoCoach(
      session.user.id,
      instanteDaLeitura
    );
    if (contexto.estado !== 'pronto' || contexto.contexto.data !== data)
      return {
        indisponivel:
          'Faltam dados compatíveis de local e data para esta leitura.',
      };
    try {
      return gerarDiaLocal({
        contexto: contexto.contexto,
        agora: instanteDaLeitura,
      }).entradaDaLeitura;
    } catch (erro) {
      if (erro instanceof LocalSemNascerDoSolError)
        return {
          indisponivel:
            'O método da leitura não se aplica ao local e à data informados.',
        };
      throw erro;
    }
  };
  const interpretacao = await lerInterpretacao();
  const politica = `${Boolean(preferencias?.allow_cloud)}:${assinaturaDaCadeia(cadeia, configuracao.atualizadoEm)}`;
  const hash = assinaturaDasDescricoes({
    data,
    entradas,
    interpretacao,
    politica,
  });
  const tentativa = randomUUID();
  const diaDaChamada = new Date().toISOString().slice(0, 10);
  const segundos = TEMPO_MAXIMO_DAS_DESCRICOES_MS / 1000 + 30;
  const reserva = await withTransaction(async (conexao) => {
    await conexao.execute(
      'INSERT IGNORE INTO dashboard_descriptions(user_id,record_date) VALUES(?,?)',
      [session.user.id, data]
    );
    const [linhas] = await conexao.query<Linha[]>(
      'SELECT *,lease_until>UTC_TIMESTAMP() AS ocupado,next_attempt>UTC_TIMESTAMP() AS aguardar FROM dashboard_descriptions WHERE user_id=? AND record_date=? FOR UPDATE',
      [session.user.id, data]
    );
    const atual = linhas[0];
    const guardado = conteudo(atual.content);
    if (
      atual.inputs_hash === hash &&
      atual.status === 'pronto' &&
      guardado?.success
    )
      return {
        estado: 'pronto',
        descricoes: guardado.data.descricoes,
        atualizadoEm: atual.generated_at ?? undefined,
      } satisfies ResultadoDasDescricoes;
    if (atual.ocupado) return vazio('atualizando');
    if (atual.aguardar) return vazio('falha');
    await conexao.execute(
      'INSERT IGNORE INTO dashboard_description_usage(user_id,usage_date) VALUES(?,?)',
      [session.user.id, diaDaChamada]
    );
    const [cotas] = await conexao.query<
      (RowDataPacket & { attempts: number })[]
    >(
      'SELECT attempts FROM dashboard_description_usage WHERE user_id=? AND usage_date=? FOR UPDATE',
      [session.user.id, diaDaChamada]
    );
    if (cotas[0].attempts >= LIMITE_DIARIO_DE_DESCRICOES)
      return vazio('limite');
    await conexao.execute(
      'UPDATE dashboard_description_usage SET attempts=attempts+1 WHERE user_id=? AND usage_date=?',
      [session.user.id, diaDaChamada]
    );
    await conexao.execute(
      "UPDATE dashboard_descriptions SET inputs_hash=?,status='gerando',attempts=attempts+1,attempt_id=?,lease_until=TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP()),next_attempt=NULL WHERE user_id=? AND record_date=?",
      [hash, tentativa, segundos, session.user.id, data]
    );
    return null;
  });
  if (reserva) return reserva;
  try {
    const resultado = await gerarNaCadeia(
      cadeia,
      {
        sistema: SISTEMA_DAS_DESCRICOES,
        usuario: JSON.stringify({
          data,
          campos: entradas,
          fatosInterpretativos: interpretacao,
        }),
        json: true,
        esquemaJson: ESQUEMA_DAS_DESCRICOES,
        maximoDeTokens: 8000,
      },
      {
        rotulo: 'descricoes-do-painel',
        cancelamento: AbortSignal.timeout(TEMPO_MAXIMO_DAS_DESCRICOES_MS),
        validar: (texto) => {
          try {
            lerDescricoes(texto);
            return null;
          } catch {
            return 'Descrições incompletas ou incompatíveis com o painel.';
          }
        },
      }
    );
    if (resultado.origem !== 'modelo')
      throw new Error('Nenhum modelo entregou uma resposta válida.');
    const gerado = lerDescricoes(resultado.texto);
    // Verificações repetidas após a espera impedem publicar uma versão já obsoleta.
    await requireFeatureEnabled(session, 'health_intelligence');
    const atuais = await lerEntradas();
    const interpretacaoAtual = await lerInterpretacao();
    const consentimento = await preferenciasDaMemoria(session.user.id);
    const configuracaoAtual = await lerConfiguracaoDeIa();
    const ordemAtual = montarCadeia(configuracaoAtual);
    const permitida = consentimento?.allow_cloud
      ? ordemAtual
      : somenteLocais(ordemAtual);
    const politicaAtual = `${Boolean(consentimento?.allow_cloud)}:${assinaturaDaCadeia(permitida, configuracaoAtual.atualizadoEm)}`;
    if (
      assinaturaDasDescricoes({
        data,
        entradas: atuais,
        interpretacao: interpretacaoAtual,
        politica: politicaAtual,
      }) !== hash
    )
      throw new Error('Entradas alteradas durante a geração.');
    const atualizadoEm = new Date().toISOString();
    const salvo = await executeStatement(
      "UPDATE dashboard_descriptions SET status='pronto',content=?,model_name=?,provider_name=?,generated_at=UTC_TIMESTAMP(),attempt_id=NULL,lease_until=NULL,next_attempt=NULL WHERE user_id=? AND record_date=? AND attempt_id=?",
      [
        JSON.stringify(gerado),
        resultado.autor.modelo,
        resultado.autor.provedor,
        session.user.id,
        data,
        tentativa,
      ]
    );
    return salvo.affectedRows
      ? { estado: 'pronto', descricoes: gerado.descricoes, atualizadoEm }
      : vazio('falha');
  } catch {
    await executeStatement(
      "UPDATE dashboard_descriptions SET status='falha',attempt_id=NULL,lease_until=NULL,next_attempt=TIMESTAMPADD(MINUTE,2,UTC_TIMESTAMP()) WHERE user_id=? AND record_date=? AND attempt_id=?",
      [session.user.id, data, tentativa]
    );
    return vazio('falha');
  }
}
