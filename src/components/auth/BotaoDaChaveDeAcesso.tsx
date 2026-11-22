'use client';

import * as React from 'react';
import {
  browserSupportsWebAuthn,
  startAuthentication,
  WebAuthnError,
} from '@simplewebauthn/browser';
import { Fingerprint, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';
import { marcarEtapa } from '@/lib/funil/cliente';

interface Props {
  previewMode?: boolean;
}

/**
 * "Entrar com uma chave de acesso" (tarefa 167). Só aparece quando o
 * navegador oferece WebAuthn. O aparelho escolhe a chave (sem digitar
 * e-mail) e pede a biometria ou o PIN dele; o servidor confere a
 * assinatura, a revogação e o bloqueio da conta antes de abrir a sessão.
 */
export function BotaoDaChaveDeAcesso({ previewMode = false }: Props) {
  const { db } = useAuth();
  const [suportado, setSuportado] = React.useState(false);
  const [entrando, setEntrando] = React.useState(false);

  React.useEffect(() => {
    let vivo = true;
    Promise.resolve(browserSupportsWebAuthn()).then((s) => {
      if (vivo) setSuportado(s);
    });
    return () => {
      vivo = false;
    };
  }, []);

  if (!suportado) return null;

  async function entrar() {
    if (previewMode || entrando) return;
    marcarEtapa('login_iniciado', 'chave');
    setEntrando(true);
    try {
      const resposta = await fetch('/api/auth/chave/login/opcoes', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      });
      const corpo = (await resposta.json().catch(() => null)) as {
        opcoes?: Parameters<typeof startAuthentication>[0]['optionsJSON'];
        error?: string;
      } | null;
      if (!resposta.ok || !corpo?.opcoes)
        throw new Error(corpo?.error ?? 'Não foi possível preparar o login.');
      const assinatura = await startAuthentication({
        optionsJSON: corpo.opcoes,
      });
      const { error } = await db.auth.signInWithPasskey(assinatura);
      if (error) throw new Error(error.message);
      toast.success('Que bom te receber de novo.');
    } catch (e) {
      if (e instanceof WebAuthnError && e.code === 'ERROR_CEREMONY_ABORTED')
        return;
      if (e instanceof Error && e.name === 'NotAllowedError') {
        toast.error('Login com chave cancelado.', {
          description:
            'Se este aparelho não tem uma chave da Lyra, entre com e-mail e senha.',
        });
        return;
      }
      toast.error('Não foi possível entrar com a chave de acesso.', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setEntrando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void entrar()}
      disabled={previewMode || entrando}
      className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 font-medium transition-colors hover:bg-muted disabled:opacity-60"
    >
      {entrando ? (
        <Loader2 aria-hidden="true" className="size-5 animate-spin" />
      ) : (
        <Fingerprint aria-hidden="true" className="size-5" />
      )}
      Entrar com uma chave de acesso
    </button>
  );
}
