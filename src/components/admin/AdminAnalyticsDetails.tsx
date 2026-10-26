'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import {
  DOMINIOS,
  type FiltrosAnaliticos,
  type PaginaDetalhes,
} from '@/lib/admin/analytics/definicoes';
const DATA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  dateStyle: 'short',
});
const HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  dateStyle: 'short',
  timeStyle: 'short',
});
const INTEIRO = new Intl.NumberFormat('pt-BR');
function avisar() {
  /* A falha tem estado acionável, sem conteúdo pessoal no log. */
}
async function ler<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('Não foi possível consultar os dados.');
  return r.json() as Promise<T>;
}
export function PaginacaoAnalitica({
  pagina,
  total,
  mudar,
}: {
  pagina: number;
  total: number;
  mudar: (p: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-sm text-muted-foreground">
        {INTEIRO.format(total)} registros · Página {pagina} de{' '}
        {Math.max(1, Math.ceil(total / 20))}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagina <= 1}
          onClick={() => mudar(pagina - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagina * 20 >= total}
          onClick={() => mudar(pagina + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
const ESTADOS: Record<string, string> = {
  concluido: 'Concluído',
  processando: 'Processando',
  erro: 'Erro',
  fila: 'Na fila',
  pronto: 'Pronto',
  pendente: 'Pendente',
  gerando: 'Gerando',
  pronta: 'Pronta',
  scheduled: 'Agendada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  canceled: 'Cancelada',
  in_progress: 'Em andamento',
  paused: 'Pausada',
};
export function RegistrosAnaliticos({ dados }: { dados: PaginaDetalhes }) {
  return dados.total === 0 ? (
    <p className="py-6 text-sm text-muted-foreground">
      Nenhum registro neste período e plano.
    </p>
  ) : (
    <>
      <ul
        className="space-y-3 md:hidden"
        aria-label="Registros administrativos em cartões"
      >
        {dados.itens.map((r) => (
          <li
            key={r.id}
            className="space-y-2 rounded-lg border border-border p-4"
          >
            <p className="font-medium">{ESTADOS[r.estado] ?? r.estado}</p>
            <p className="text-sm text-muted-foreground">
              <time dateTime={r.data}>{HORA.format(new Date(r.data))} UTC</time>
            </p>
            <p className="break-all text-sm">{r.email}</p>
            <p className="text-sm text-muted-foreground">
              {DOMINIOS[r.dominio as keyof typeof DOMINIOS]?.nome ?? r.dominio}{' '}
              · {r.id.slice(-8)}
            </p>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table
          scrollLabel="Registros administrativos"
          caption="Metadados dos registros consultados"
        >
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Quando (UTC)</TableHead>
              <TableHead scope="col">Conta</TableHead>
              <TableHead scope="col">Registro</TableHead>
              <TableHead scope="col">Estado atual / evento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.itens.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <time dateTime={r.data}>{HORA.format(new Date(r.data))}</time>
                </TableCell>
                <TableCell className="max-w-64 break-all">{r.email}</TableCell>
                <TableCell className="max-w-64 break-all">
                  <span title={r.id}>
                    {DOMINIOS[r.dominio as keyof typeof DOMINIOS]?.nome ??
                      r.dominio}{' '}
                    · {r.id.slice(-8)}
                  </span>
                </TableCell>
                <TableCell>{ESTADOS[r.estado] ?? r.estado}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
export function DetalhesAnaliticos({
  tipo,
  filtros,
  fechar,
}: {
  tipo: string;
  filtros: FiltrosAnaliticos;
  fechar: () => void;
}) {
  const [pagina, setPagina] = React.useState(1);
  const url =
    '/api/admin/dashboard?' +
    new URLSearchParams({ ...filtros, detalhe: tipo, pagina: String(pagina) });
  const request = React.useCallback(() => ler<PaginaDetalhes>(url), [url]);
  const { data, loading, refresh } = useKeyedResource(
    url,
    request,
    avisar,
    null
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) fechar();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {tipo === 'cadastros'
              ? 'Cadastros'
              : tipo === 'atividade'
                ? 'Contas com atividade registrada'
                : DOMINIOS[tipo as keyof typeof DOMINIOS].nome}
          </DialogTitle>
          <DialogDescription>
            Mesmos filtros do painel:{' '}
            {DATA.format(new Date(filtros.inicio + 'T00:00:00Z'))} a{' '}
            {DATA.format(new Date(filtros.fim + 'T00:00:00Z'))}. Somente
            identificação e estado dos registros, sem conteúdo clínico ou
            conversas.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p role="status">Carregando registros…</p>
        ) : !data ? (
          <div role="alert">
            <p>Não foi possível carregar os detalhes.</p>
            <Button variant="outline" onClick={() => void refresh()}>
              Tentar de novo
            </Button>
          </div>
        ) : (
          <>
            <RegistrosAnaliticos dados={data} />
            <PaginacaoAnalitica
              pagina={pagina}
              total={data.total}
              mudar={setPagina}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
