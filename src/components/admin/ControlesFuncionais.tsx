'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { requisitar, erroNaPagina } from '@/components/experiencias/transporte';
import { notificarPlanosAtualizados } from '@/lib/plans/atualizacao-publica';
import type { GrupoFuncional } from '@/lib/plataforma/grupos';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Controle {
  chave: GrupoFuncional;
  nome: string;
  ativo: boolean;
  versao: number;
  atualizadoEm: string;
  historico: {
    id: string;
    previous_enabled: number;
    next_enabled: number;
    actor_id: string | null;
    created_at: string;
  }[];
}
const carregar = () => requisitar<Controle[]>('/api/admin/funcionalidades');

/** Aplicação imediata com confirmação pelo servidor; nenhuma alteração otimista. */
export function ControlesFuncionais() {
  const { session } = useAuth();
  const { data, error, loading, refresh } = useKeyedResource<Controle[] | null>(
    session?.user.id ?? null,
    carregar,
    erroNaPagina,
    null
  );
  const [ocupada, setOcupada] = useState(false);
  const [falha, setFalha] = useState('');
  async function alterar(controle: Controle, ativo: boolean) {
    setOcupada(true);
    setFalha('');
    try {
      await requisitar('/api/admin/funcionalidades', 'PUT', {
        chave: controle.chave,
        ativo,
        versao: controle.versao,
      });
      await refresh();
      notificarPlanosAtualizados();
    } catch (erro) {
      setFalha(
        erro instanceof Error ? erro.message : 'Não foi possível alterar.'
      );
      await refresh();
    } finally {
      setOcupada(false);
    }
  }
  return (
    <Card id="funcionalidades">
      <CardHeader>
        <CardTitle>Funcionalidades do aplicativo</CardTitle>
        <CardDescription>
          Ative ou desative cada grupo para toda a plataforma, inclusive para o
          uso pessoal do administrador. Código e registros ficam preservados. A
          ativação respeita os direitos de cada plano.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading && !data ? (
          <p role="status">Carregando funcionalidades…</p>
        ) : null}
        {error || falha ? (
          <div role="alert">
            <p>
              {falha ||
                (error instanceof Error ? error.message : 'Falha ao carregar.')}
            </p>
            <Button variant="outline" onClick={() => void refresh()}>
              Atualizar
            </Button>
          </div>
        ) : null}
        {/* Mini cards (tarefa 215): ✓ ligado, ✕ desligado; um clique alterna. */}
        {data ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.map((controle) => (
              <li key={controle.chave}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={controle.ativo}
                  disabled={ocupada}
                  onClick={() => void alterar(controle, !controle.ativo)}
                  title={
                    controle.ativo
                      ? 'Ativado: clique para desativar'
                      : 'Desativado: clique para ativar'
                  }
                  className={cn(
                    'flex h-full w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60',
                    controle.ativo
                      ? 'border-success/40 bg-success/10 hover:bg-success/15'
                      : 'border-border bg-muted/40 hover:bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full',
                      controle.ativo
                        ? 'bg-success text-success-foreground'
                        : 'bg-destructive/15 text-destructive'
                    )}
                    aria-hidden="true"
                  >
                    {controle.ativo ? (
                      <Check className="size-3.5" />
                    ) : (
                      <X className="size-3.5" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-tight text-foreground">
                      {controle.nome}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {controle.ativo ? 'Ativado' : 'Desativado'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {data?.some((controle) => controle.historico.length) ? (
          <details className="text-sm">
            <summary className="cursor-pointer">
              Histórico de alterações
            </summary>
            <ul className="space-y-1 pt-2">
              {data.flatMap((controle) =>
                controle.historico.map((evento) => (
                  <li key={evento.id}>
                    {new Date(
                      evento.created_at.replace(' ', 'T') + 'Z'
                    ).toLocaleString('pt-BR')}{' '}
                    · {controle.nome} ·{' '}
                    {Number(evento.next_enabled) === 1
                      ? 'Ativado'
                      : 'Desativado'}{' '}
                    · Responsável: {evento.actor_id ?? 'Conta excluída'}
                  </li>
                ))
              )}
            </ul>
          </details>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Painel, chat, memória, histórico, revisão semanal, relatórios e
          cobrança continuam disponíveis. A consulta aos dados guardados não
          reativa os formulários. Agendamentos também respeitam o controle de
          liberação para usuários. Clientes abertos atualizam a disponibilidade;
          o servidor aplica a restrição a cada requisição.
        </p>
      </CardContent>
    </Card>
  );
}
