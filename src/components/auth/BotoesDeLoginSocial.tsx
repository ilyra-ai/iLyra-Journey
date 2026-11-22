'use client';

import { useEffect, useState } from 'react';

import type { ProvedorSocial } from '@/lib/auth/social/configuracao';

interface Props {
  /** Na aba de cadastro, a conta nova exige o aceite dos termos antes. */
  cadastro: boolean;
  aceiteDosTermos: boolean;
  retorno: string | null;
  previewMode?: boolean;
}

const NOMES: Record<ProvedorSocial, string> = {
  google: 'Google',
  apple: 'Apple',
};

function IconeDoGoogle() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"
      />
    </svg>
  );
}

function IconeDaApple() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="currentColor"
    >
      <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 4.9c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3-1.5z" />
    </svg>
  );
}

/**
 * Botões "Continuar com Google/Apple" (tarefas 164, 165 e 235): aparecem só
 * os provedores ligados pelo administrador e com credenciais completas. Login
 * com e-mail e senha continua sempre disponível; a pessoa escolhe.
 */
export function BotoesDeLoginSocial({
  cadastro,
  aceiteDosTermos,
  retorno,
  previewMode = false,
}: Props) {
  const [provedores, setProvedores] = useState<ProvedorSocial[]>([]);

  useEffect(() => {
    let ativo = true;
    fetch('/api/public/login-social', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { provedores: [] }))
      .then((j: { provedores?: ProvedorSocial[] }) => {
        if (ativo) setProvedores(j.provedores ?? []);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);

  if (provedores.length === 0) return null;
  const bloqueado = previewMode || (cadastro && !aceiteDosTermos);

  // A rota de início redireciona para fora do app: link comum, não navegação
  // do Next.
  const consulta = new URLSearchParams();
  if (cadastro && aceiteDosTermos) consulta.set('aceite', '1');
  if (retorno) consulta.set('destino', retorno);
  const sufixo = consulta.size ? `?${consulta}` : '';
  const classe =
    'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 font-medium transition-colors hover:bg-muted';

  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>
      {provedores.map((provedor) =>
        bloqueado ? (
          <button
            key={provedor}
            type="button"
            disabled
            className={`${classe} cursor-not-allowed opacity-60`}
          >
            {provedor === 'google' ? <IconeDoGoogle /> : <IconeDaApple />}
            {cadastro ? 'Criar conta com' : 'Continuar com'} {NOMES[provedor]}
          </button>
        ) : (
          <a
            key={provedor}
            href={`/api/auth/social/${provedor}/inicio${sufixo}`}
            className={classe}
          >
            {provedor === 'google' ? <IconeDoGoogle /> : <IconeDaApple />}
            {cadastro ? 'Criar conta com' : 'Continuar com'} {NOMES[provedor]}
          </a>
        )
      )}
      {cadastro && !aceiteDosTermos ? (
        <p className="text-xs text-muted-foreground">
          Aceite os termos acima para criar a conta com{' '}
          {provedores.map((p) => NOMES[p]).join(' ou ')}.
        </p>
      ) : null}
    </div>
  );
}
