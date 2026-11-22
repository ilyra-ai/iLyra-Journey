'use client';

import * as React from 'react';
import {
  browserSupportsWebAuthn,
  startRegistration,
  WebAuthnError,
} from '@simplewebauthn/browser';
import { Fingerprint, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChaveDaConta } from '@/lib/auth/chaves/servico';

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const corpo = (await resposta.json().catch(() => null)) as
    (T & { error?: string }) | null;
  if (!resposta.ok || !corpo)
    throw new Error(corpo?.error ?? 'Não foi possível concluir agora.');
  return corpo;
}

/** Nome sugerido a partir do aparelho, sem enviar nada a ninguém. */
function nomeSugerido() {
  const agente = navigator.userAgent;
  if (/iPhone/.test(agente)) return 'iPhone';
  if (/iPad/.test(agente)) return 'iPad';
  if (/Android/.test(agente)) return 'Android';
  if (/Mac OS X/.test(agente)) return 'Mac';
  if (/Windows/.test(agente)) return 'Windows';
  return 'Meu aparelho';
}

const data = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

/**
 * Chaves de acesso (tarefa 167): entrar com a biometria ou o PIN do próprio
 * aparelho, sem senha. Opcional: e-mail e senha, Google e Apple continuam.
 * Revogar tira o acesso daquela chave na hora.
 */
export function ChavesDeAcessoCard() {
  const [suportado, setSuportado] = React.useState<boolean | null>(null);
  const [chaves, setChaves] = React.useState<ChaveDaConta[] | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [ocupado, setOcupado] = React.useState<string | null>(null);
  const [editando, setEditando] = React.useState<{
    id: string;
    nome: string;
  } | null>(null);

  React.useEffect(() => {
    let vivo = true;
    // Leitura de capacidade do navegador e da lista: sistemas externos.
    Promise.resolve(browserSupportsWebAuthn()).then((s) => {
      if (vivo) setSuportado(s);
    });
    pedir<{ chaves: ChaveDaConta[] }>('/api/account/chaves')
      .then((r) => {
        if (vivo) setChaves(r.chaves);
      })
      .catch((e: unknown) => {
        if (vivo)
          setErro(
            e instanceof Error ? e.message : 'Falha ao listar as chaves.'
          );
      });
    return () => {
      vivo = false;
    };
  }, []);

  async function criar() {
    setErro(null);
    setOcupado('criar');
    try {
      const { opcoes } = await pedir<{
        opcoes: Parameters<typeof startRegistration>[0]['optionsJSON'];
      }>('/api/auth/chave/registro/opcoes', { method: 'POST' });
      const resposta = await startRegistration({ optionsJSON: opcoes });
      const r = await pedir<{ chaves: ChaveDaConta[] }>(
        '/api/auth/chave/registro',
        {
          method: 'POST',
          body: JSON.stringify({ resposta, nome: nomeSugerido() }),
        }
      );
      setChaves(r.chaves);
      toast.success('Chave de acesso criada.', {
        description:
          'Na próxima vez, entre com a biometria ou o PIN deste aparelho.',
      });
    } catch (e) {
      // Cancelar a janela do aparelho não é erro da pessoa.
      if (e instanceof WebAuthnError && e.code === 'ERROR_CEREMONY_ABORTED')
        return;
      if (e instanceof Error && e.name === 'NotAllowedError') {
        setErro('A criação foi cancelada ou o tempo acabou. Tente de novo.');
        return;
      }
      if (
        e instanceof WebAuthnError &&
        e.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED'
      ) {
        setErro('Este aparelho já tem uma chave de acesso desta conta.');
        return;
      }
      setErro(
        e instanceof Error ? e.message : 'Não foi possível criar a chave.'
      );
    } finally {
      setOcupado(null);
    }
  }

  async function renomear(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!editando) return;
    setOcupado(editando.id);
    try {
      const r = await pedir<{ chaves: ChaveDaConta[] }>(
        `/api/account/chaves/${editando.id}`,
        { method: 'PATCH', body: JSON.stringify({ nome: editando.nome }) }
      );
      setChaves(r.chaves);
      setEditando(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível renomear.');
    } finally {
      setOcupado(null);
    }
  }

  async function revogar(chave: ChaveDaConta) {
    if (
      !window.confirm(
        `Revogar a chave "${chave.nome}"? Ela deixa de entrar na hora. Para usar este aparelho de novo, crie outra chave.`
      )
    )
      return;
    setOcupado(chave.id);
    try {
      const r = await pedir<{ chaves: ChaveDaConta[] }>(
        `/api/account/chaves/${chave.id}`,
        { method: 'DELETE' }
      );
      setChaves(r.chaves);
      toast.success('Chave de acesso revogada.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível revogar.');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint aria-hidden="true" className="size-5" />
          Chaves de acesso
        </CardTitle>
        <CardDescription>
          Entre com a biometria ou o PIN do seu aparelho, sem digitar senha. A
          biometria não sai do aparelho e a Lyra guarda só uma chave pública. É
          opcional: e-mail e senha continuam valendo.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {suportado === false ? (
          <p className="text-sm text-muted-foreground">
            Este navegador não oferece chaves de acesso. Use outro navegador
            atualizado ou continue entrando com e-mail e senha.
          </p>
        ) : null}

        {chaves === null && !erro ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : null}
        {chaves?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma chave de acesso nesta conta.
          </p>
        ) : null}
        {chaves?.length ? (
          <ul className="grid gap-2">
            {chaves.map((chave) => (
              <li
                key={chave.id}
                className="grid gap-2 rounded-lg border border-border p-3"
              >
                {editando?.id === chave.id ? (
                  <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={renomear}
                  >
                    <div className="grid min-w-0 flex-1 gap-1">
                      <Label htmlFor={`chave-${chave.id}`}>Nome da chave</Label>
                      <Input
                        id={`chave-${chave.id}`}
                        maxLength={60}
                        value={editando.nome}
                        onChange={(e) =>
                          setEditando({ id: chave.id, nome: e.target.value })
                        }
                      />
                    </div>
                    <Button type="submit" disabled={ocupado === chave.id}>
                      Salvar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditando(null)}
                    >
                      Cancelar
                    </Button>
                  </form>
                ) : (
                  <>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{chave.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {chave.comBackup
                          ? 'sincronizada entre aparelhos'
                          : 'só neste aparelho'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Criada em {data(chave.criadaEm)}
                      {chave.ultimoUsoEm
                        ? ` · último uso em ${data(chave.ultimoUsoEm)}`
                        : ' · ainda não usada'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditando({ id: chave.id, nome: chave.nome })
                        }
                      >
                        Renomear
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={ocupado === chave.id}
                        onClick={() => void revogar(chave)}
                      >
                        Revogar
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : null}

        {erro ? (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        ) : null}

        <div>
          <Button
            type="button"
            disabled={suportado !== true || ocupado === 'criar'}
            onClick={() => void criar()}
          >
            {ocupado === 'criar' ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Fingerprint aria-hidden="true" className="size-4" />
            )}
            Criar uma chave de acesso
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Perdeu o aparelho? Entre com e-mail e senha (ou Google/Apple) e
          revogue a chave dele aqui. Uma chave revogada não entra mais.
        </p>
      </CardContent>
    </Card>
  );
}
