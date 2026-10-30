'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import type { EstadoDoInterruptor } from '@/lib/plataforma/interruptores';
import { requisitar, erroNaPagina } from '@/components/experiencias/transporte';

const carregar = () =>
  requisitar<EstadoDoInterruptor>('/api/admin/agendamentos');
const quando = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));

/**
 * Controle global do recurso Agendamentos (tarefa 134). Desligado, apenas o
 * administrador vê e usa a agenda; ligado, os usuários passam a usá-la
 * conforme os direitos do próprio plano.
 */
export function AgendamentosParaUsuarios() {
  const { session } = useAuth(),
    { data, loading, error, refresh } =
      useKeyedResource<EstadoDoInterruptor | null>(
        session?.user.id ?? null,
        carregar,
        erroNaPagina,
        null
      ),
    // A ação pretendida fica guardada separada de "aberto" para o texto do
    // diálogo não trocar de sentido durante a animação de fechamento.
    [acao, setAcao] = useState(true),
    [aberto, setAberto] = useState(false),
    [ocupada, setOcupada] = useState(false),
    [falha, setFalha] = useState('');
  const alterar = async (ativo: boolean) => {
    if (!data) return;
    setOcupada(true);
    setFalha('');
    try {
      await requisitar('/api/admin/agendamentos', 'PUT', {
        ativo,
        versao: data.versao,
      });
      await refresh();
      toast.success(
        ativo
          ? 'Agendamentos ativados para os usuários.'
          : 'Agendamentos desativados para os usuários.'
      );
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível alterar.');
      await refresh();
    } finally {
      setOcupada(false);
      setAberto(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id="titulo-agendamentos-usuarios">
            Agendamentos para usuários
          </CardTitle>
          {data && (
            <Badge variant={data.ativo ? 'default' : 'secondary'}>
              {data.ativo ? 'Ativado para usuários' : 'Somente administrador'}
            </Badge>
          )}
        </div>
        <CardDescription>
          Desativado, o menu, a busca, as notificações de consultas e as APIs de
          consultas e profissionais ficam disponíveis apenas para o
          administrador. Ativado, cada usuário usa conforme o próprio plano.
          Nenhuma consulta ou profissional é apagado ao desativar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && !data ? (
          <Alert variant="destructive">
            <AlertTitle>Não foi possível carregar a configuração</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Tente novamente.'}
              <Button variant="outline" onClick={() => void refresh()}>
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        ) : !data || loading ? (
          <Skeleton className="h-16 rounded-lg" />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Switch
                id="agendamentos-usuarios"
                checked={data.ativo}
                disabled={ocupada}
                aria-describedby="estado-agendamentos-usuarios"
                onCheckedChange={(v) => {
                  setAcao(v);
                  setAberto(true);
                }}
              />
              <Label htmlFor="agendamentos-usuarios">
                Permitir Agendamentos para os usuários
              </Label>
            </div>
            <p
              id="estado-agendamentos-usuarios"
              className="text-sm text-muted-foreground"
            >
              {data.atualizadoPor
                ? `Última alteração por ${data.atualizadoPor.nome} em ${quando(data.atualizadoEm)}.`
                : 'Configuração inicial: desativado para usuários.'}
            </p>
            {falha && (
              <p role="alert" className="text-sm text-destructive">
                {falha}
              </p>
            )}
            {data.historico.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-ring">
                  Últimas alterações ({data.historico.length})
                </summary>
                <ul className="mt-2 flex flex-col gap-1 text-muted-foreground">
                  {data.historico.map((h) => (
                    <li key={h.id}>
                      {quando(h.em)} · {h.responsavel?.nome ?? 'Conta removida'}{' '}
                      · {h.anterior ? 'ativado' : 'desativado'} →{' '}
                      {h.novo ? 'ativado' : 'desativado'}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </CardContent>
      <AlertDialog
        open={aberto}
        onOpenChange={(v) => {
          if (!v && !ocupada) setAberto(false);
        }}
      >
        <AlertDialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {acao
                ? 'Ativar Agendamentos para os usuários?'
                : 'Desativar Agendamentos para os usuários?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {acao
                ? 'Os usuários voltam a ver a agenda e a usar consultas e profissionais conforme os direitos do próprio plano.'
                : 'Os usuários deixam de ver a agenda e as APIs passam a recusar consultas e profissionais. Os dados ficam guardados e voltam a ficar disponíveis ao reativar.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupada}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={ocupada}
              onClick={(e) => {
                e.preventDefault();
                void alterar(acao);
              }}
            >
              {acao ? 'Ativar' : 'Desativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
