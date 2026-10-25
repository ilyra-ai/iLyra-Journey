'use client';

import { useEffect, useState } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { buscarJson } from '@/lib/http/transporte';
import type { AdminUserListItem } from '@/types/subscription';
import type { HistoricoDeUsuario } from '@/types/gestao-usuarios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const motivos: Record<string, string> = {
  suspeita_de_acesso: 'Suspeita de acesso indevido',
  suporte: 'Atendimento de suporte',
  solicitacao_do_titular: 'Solicitação da pessoa titular',
  admin: 'Administrador',
  patient: 'Usuário',
  other_role: 'Outro papel',
  completed: 'Onboarding concluído',
  pending: 'Onboarding pendente',
  free: 'Free',
  meta: 'Meta',
  care: 'Care',
};
const dataHora = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function HistoricoUsuario({
  user,
  aoFechar,
}: {
  user: AdminUserListItem;
  aoFechar: () => void;
}) {
  const [cursores, setCursores] = useState<Array<string | null>>([null]);
  const [atualizacao, setAtualizacao] = useState(0);
  const [dados, setDados] = useState<HistoricoDeUsuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const cursor = cursores.at(-1);
  useEffect(() => {
    const controller = new AbortController();
    async function carregar() {
      setCarregando(true);
      setErro(null);
      const params = new URLSearchParams();
      if (cursor) params.set('cursor', cursor);
      try {
        const resposta = await buscarJson(
          `/api/admin/users/${user.id}/historico?${params}`,
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;
        if (!resposta.ok) throw new Error(resposta.falha.message);
        setDados(resposta.corpo as HistoricoDeUsuario);
      } catch (error) {
        if (!controller.signal.aborted)
          setErro(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar o histórico.'
          );
      } finally {
        if (!controller.signal.aborted) setCarregando(false);
      }
    }
    void carregar();
    return () => controller.abort();
  }, [cursor, user.id, atualizacao]);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) aoFechar();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History aria-hidden="true" className="h-5 w-5 shrink-0" />
            Histórico administrativo
          </DialogTitle>
          <DialogDescription className="break-words">
            {user.email}. Acompanhe alterações de acesso, perfil e assinatura.
            Algumas ações antigas podem não ter registro.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Página {cursores.length}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={carregando}
            onClick={() => {
              setCursores([null]);
              setAtualizacao((v) => v + 1);
            }}
          >
            <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
        <div aria-busy={carregando} className="min-h-20">
          {carregando ? (
            <p role="status" className="py-6 text-sm text-muted-foreground">
              Carregando registros…
            </p>
          ) : erro ? (
            <div
              role="alert"
              className="space-y-3 rounded-md border border-destructive/30 p-4"
            >
              <p className="text-sm text-destructive">{erro}</p>
              <Button
                variant="outline"
                onClick={() => setAtualizacao((v) => v + 1)}
              >
                Tentar novamente
              </Button>
            </div>
          ) : !dados?.events.length ? (
            <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
              Nenhuma ação administrativa registrada para esta conta. Novas
              ações aparecerão aqui.
            </p>
          ) : (
            <ol className="space-y-3" aria-label="Eventos administrativos">
              {dados.events.map((event) => (
                <li
                  key={event.key}
                  className="space-y-2 rounded-md border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{event.label}</p>
                    <Badge variant="outline">
                      {event.source === 'assinaturas' ? 'Assinatura' : 'Gestão'}
                    </Badge>
                  </div>
                  {event.reason && motivos[event.reason] && (
                    <p className="text-sm">{motivos[event.reason]}</p>
                  )}
                  <p className="break-words text-sm text-muted-foreground">
                    Por {event.actorEmail ?? 'autor não disponível'} ·{' '}
                    <time dateTime={event.createdAt}>
                      {dataHora.format(new Date(event.createdAt))}
                    </time>
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={carregando || cursores.length === 1}
            onClick={() => setCursores((v) => v.slice(0, -1))}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            disabled={carregando || Boolean(erro) || !dados?.nextCursor}
            onClick={() => {
              if (dados?.nextCursor)
                setCursores((v) => [...v, dados.nextCursor]);
            }}
          >
            Próxima
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
