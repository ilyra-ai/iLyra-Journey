'use client';

import { useCallback, useState } from 'react';
import { Copy, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import type {
  ConfiguracaoPublica,
  ProvedorSocial,
} from '@/lib/auth/social/configuracao';
import { buscarJson } from '@/lib/http/transporte';

const ROTA = '/api/admin/login-social';

interface Situacao {
  provedores: ConfiguracaoPublica[];
  enderecosDeRetorno: Record<ProvedorSocial, string>;
  origem: string;
}

interface Formulario {
  ativo: boolean;
  clientId: string;
  /** Vazio mantém o segredo salvo. */
  segredo: string;
  appleTeamId: string;
  appleKeyId: string;
}

const TEXTOS: Record<
  ProvedorSocial,
  {
    titulo: string;
    onde: string;
    clientId: string;
    segredo: string;
  }
> = {
  google: {
    titulo: 'Google',
    onde: 'Google Cloud Console → APIs e serviços → Credenciais → ID do cliente OAuth (aplicativo da Web).',
    clientId: 'Client ID',
    segredo: 'Client secret',
  },
  apple: {
    titulo: 'Apple',
    onde: 'Apple Developer → Certificates, Identifiers & Profiles: um Services ID com Sign in with Apple e uma chave (.p8) com Sign in with Apple.',
    clientId: 'Services ID (identificador do serviço)',
    segredo: 'Chave privada .p8 (cole o arquivo inteiro)',
  },
};

function formularioDe(c: ConfiguracaoPublica): Formulario {
  return {
    ativo: c.ativo,
    clientId: c.clientId ?? '',
    segredo: '',
    appleTeamId: c.appleTeamId ?? '',
    appleKeyId: c.appleKeyId ?? '',
  };
}

/**
 * Login com Google e Apple (tarefas 164, 165 e 235): credenciais e um
 * interruptor por provedor. Desligado, o botão some da tela de login; ligado
 * e com as credenciais completas, ele aparece. O segredo nunca volta para a
 * tela depois de salvo.
 */
export function LoginSocialAdmin() {
  const { session } = useAuth();
  const [atual, setAtual] = useState<Situacao | null>(null);
  const [edicao, setEdicao] = useState<
    Partial<Record<ProvedorSocial, Formulario>>
  >({});
  const [salvando, setSalvando] = useState<ProvedorSocial | null>(null);

  const pedir = useCallback(async () => {
    const resposta = await buscarJson(ROTA, { cache: 'no-store' });
    if (!resposta.ok) throw new Error(resposta.falha.message);
    return resposta.corpo as Situacao;
  }, []);
  const avisar = useCallback((erro: unknown) => {
    toast.error('Não foi possível ler o login social.', {
      description: erro instanceof Error ? erro.message : undefined,
    });
  }, []);
  const { data, loading } = useKeyedResource<Situacao | null>(
    session ? `login-social:${session.user.id}` : null,
    pedir,
    avisar,
    null
  );
  const situacao = atual ?? data;

  async function salvar(
    provedor: ProvedorSocial,
    valor: Formulario,
    apagarSegredo = false
  ) {
    setSalvando(provedor);
    const resposta = await buscarJson(ROTA, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provedor,
        ativo: valor.ativo,
        clientId: valor.clientId.trim() || null,
        ...(apagarSegredo
          ? { segredo: null }
          : valor.segredo.trim()
            ? { segredo: valor.segredo.trim() }
            : {}),
        ...(provedor === 'apple'
          ? {
              appleTeamId: valor.appleTeamId.trim() || null,
              appleKeyId: valor.appleKeyId.trim() || null,
            }
          : {}),
      }),
    });
    setSalvando(null);
    if (!resposta.ok) {
      toast.error('Não foi possível salvar.', {
        description: resposta.falha.message,
      });
      return false;
    }
    const nova = resposta.corpo as Situacao;
    setAtual(nova);
    setEdicao((e) => ({ ...e, [provedor]: undefined }));
    const salvo = nova.provedores.find((p) => p.provedor === provedor);
    toast.success(
      salvo?.ativo && !salvo.pronto
        ? 'Salvo. Ligado, mas o botão só aparece com as credenciais completas.'
        : salvo?.ativo
          ? 'Salvo. O botão aparece na tela de login.'
          : 'Salvo. O botão não aparece na tela de login.'
    );
    return true;
  }

  function copiar(texto: string) {
    void navigator.clipboard
      .writeText(texto)
      .then(() => toast.success('Endereço copiado.'))
      .catch(() => toast.error('Não foi possível copiar; selecione o texto.'));
  }

  if (loading && !situacao) return <Skeleton className="h-64 w-full" />;
  if (!situacao) return null;

  return (
    <div className="space-y-6">
      {situacao.provedores.map((config) => {
        const p = config.provedor;
        const t = TEXTOS[p];
        const valor = edicao[p] ?? formularioDe(config);
        const mudar = (parcial: Partial<Formulario>) =>
          setEdicao((e) => ({ ...e, [p]: { ...valor, ...parcial } }));
        return (
          <Card key={p}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <KeyRound aria-hidden="true" className="size-5" />
                  Entrar com {t.titulo}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={config.pronto ? 'secondary' : 'outline'}>
                    {config.pronto
                      ? 'credenciais completas'
                      : 'credenciais incompletas'}
                  </Badge>
                  <Label htmlFor={`login-${p}-ativo`} className="text-sm">
                    {config.ativo ? 'Ligado' : 'Desligado'}
                  </Label>
                  <Switch
                    id={`login-${p}-ativo`}
                    checked={config.ativo}
                    disabled={salvando === p}
                    aria-label={`Mostrar o botão Entrar com ${t.titulo} na tela de login`}
                    onCheckedChange={(ativo) =>
                      void salvar(p, { ...formularioDe(config), ativo })
                    }
                  />
                </div>
              </div>
              <CardDescription>{t.onde}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor={`login-${p}-retorno`}>
                  Endereço de retorno (cadastre exatamente este no {t.titulo})
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`login-${p}-retorno`}
                    readOnly
                    value={situacao.enderecosDeRetorno[p]}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copiar(situacao.enderecosDeRetorno[p])}
                    aria-label="Copiar o endereço de retorno"
                  >
                    <Copy aria-hidden="true" className="size-4" />
                  </Button>
                </div>
                {p === 'apple' && situacao.origem.startsWith('http://') ? (
                  <p className="text-xs text-muted-foreground">
                    A Apple só aceita endereços https; em produção, use o
                    domínio público do app.
                  </p>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor={`login-${p}-client`}>{t.clientId}</Label>
                  <Input
                    id={`login-${p}-client`}
                    autoComplete="off"
                    value={valor.clientId}
                    onChange={(e) => mudar({ clientId: e.target.value })}
                  />
                </div>
                {p === 'apple' ? (
                  <>
                    <div className="grid gap-1.5">
                      <Label htmlFor="login-apple-team">Team ID</Label>
                      <Input
                        id="login-apple-team"
                        autoComplete="off"
                        maxLength={10}
                        value={valor.appleTeamId}
                        onChange={(e) =>
                          mudar({ appleTeamId: e.target.value.toUpperCase() })
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="login-apple-key">Key ID</Label>
                      <Input
                        id="login-apple-key"
                        autoComplete="off"
                        maxLength={10}
                        value={valor.appleKeyId}
                        onChange={(e) =>
                          mudar({ appleKeyId: e.target.value.toUpperCase() })
                        }
                      />
                    </div>
                  </>
                ) : null}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`login-${p}-segredo`}>{t.segredo}</Label>
                {p === 'apple' ? (
                  <Textarea
                    id={`login-${p}-segredo`}
                    autoComplete="off"
                    rows={4}
                    className="font-mono text-xs"
                    placeholder={
                      config.segredoConfigurado
                        ? 'Chave salva. Cole outra só para trocar.'
                        : '-----BEGIN PRIVATE KEY-----'
                    }
                    value={valor.segredo}
                    onChange={(e) => mudar({ segredo: e.target.value })}
                  />
                ) : (
                  <Input
                    id={`login-${p}-segredo`}
                    type="password"
                    autoComplete="new-password"
                    placeholder={
                      config.segredoConfigurado
                        ? 'Segredo salvo. Digite outro só para trocar.'
                        : ''
                    }
                    value={valor.segredo}
                    onChange={(e) => mudar({ segredo: e.target.value })}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  O segredo fica cifrado no banco e não volta para esta tela.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={salvando === p}
                  onClick={() => void salvar(p, valor)}
                >
                  Salvar credenciais
                </Button>
                {config.segredoConfigurado ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={salvando === p}
                    onClick={() =>
                      void salvar(p, { ...valor, ativo: false }, true)
                    }
                  >
                    Apagar o segredo e desligar
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
