'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { buscarJson } from '@/lib/http/transporte';
import type { AdminUserListItem } from '@/types/subscription';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

export function EncerrarSessoesUsuario({
  user,
  requestId,
  aoFechar,
}: {
  user: AdminUserListItem;
  requestId: string;
  aoFechar: () => void;
}) {
  const { db, session } = useAuth();
  const [reason, setReason] = useState('suspeita_de_acesso');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Após uma falha de rede o motivo permanece fixo: repetir a mesma
  // solicitação nunca encerra uma sessão que nasceu depois da primeira.
  const [iniciado, setIniciado] = useState(false);
  async function encerrar() {
    if (salvando) return;
    setIniciado(true);
    setSalvando(true);
    setErro(null);
    try {
      const resposta = await buscarJson(`/api/admin/users/${user.id}/sessoes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason, requestId }),
      });
      if (!resposta.ok) throw new Error(resposta.falha.message);
      toast.success(
        'Sessões anteriores encerradas. A conta pode entrar novamente.'
      );
      if (user.id === session?.user.id) {
        await db.auth.signOut({ jaEncerrada: true });
      }
      aoFechar();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível encerrar as sessões.'
      );
    } finally {
      setSalvando(false);
    }
  }
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !salvando) aoFechar();
      }}
    >
      <AlertDialogContent aria-busy={salvando}>
        <AlertDialogHeader>
          <AlertDialogTitle>Encerrar sessões anteriores?</AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            {user.email}. Os acessos abertos serão encerrados na próxima
            verificação no servidor. A pessoa poderá entrar novamente com a
            senha. Dados, plano e estado de bloqueio serão preservados. Se esta
            for sua conta, você também precisará entrar novamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="motivo-encerramento">Motivo administrativo</Label>
          <Select
            value={reason}
            onValueChange={setReason}
            disabled={salvando || iniciado}
          >
            <SelectTrigger id="motivo-encerramento">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="suspeita_de_acesso">
                Suspeita de acesso indevido
              </SelectItem>
              <SelectItem value="suporte">Atendimento de suporte</SelectItem>
              <SelectItem value="solicitacao_do_titular">
                Solicitação da pessoa titular
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro} Você pode tentar novamente com a mesma solicitação.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={salvando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={salvando}
            onClick={(event) => {
              event.preventDefault();
              void encerrar();
            }}
          >
            {salvando ? 'Encerrando…' : 'Encerrar sessões'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
