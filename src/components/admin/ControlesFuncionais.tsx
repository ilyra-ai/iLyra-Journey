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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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
        {data?.map((controle) => (
          <div
            key={controle.chave}
            className="space-y-2 border-b border-border pb-4 last:border-0"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor={'grupo-' + controle.chave}>
                  {controle.nome}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {controle.ativo ? 'Ativado' : 'Desativado'}
                </p>
              </div>
              <Switch
                id={'grupo-' + controle.chave}
                checked={controle.ativo}
                disabled={ocupada}
                onCheckedChange={(ativo) => void alterar(controle, ativo)}
              />
            </div>
            {controle.historico.length ? (
              <details className="text-sm">
                <summary className="cursor-pointer">
                  Histórico de alterações
                </summary>
                <ul className="space-y-1 pt-2">
                  {controle.historico.map((evento) => (
                    <li key={evento.id}>
                      {new Date(
                        evento.created_at.replace(' ', 'T') + 'Z'
                      ).toLocaleString('pt-BR')}{' '}
                      ·{' '}
                      {Number(evento.next_enabled) === 1
                        ? 'Ativado'
                        : 'Desativado'}{' '}
                      · Responsável: {evento.actor_id ?? 'Conta excluída'}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ))}
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
