'use client';

import * as React from 'react';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  PlugZap,
  Save,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import type {
  AmbienteDePagamento,
  CredencialPublica,
  ProvedorDePagamento,
} from '@/lib/pagamentos/credenciais';
import { errosDeFormato } from '@/lib/pagamentos/formatos';

interface Resposta {
  provedores: CredencialPublica[];
  webhookStripe: string | null;
}

// Eventos que o webhook da Stripe precisa enviar (ver processStripeWebhook).
const EVENTOS_DO_WEBHOOK_STRIPE = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
];

interface Rascunho {
  ambiente: AmbienteDePagamento;
  ativo: boolean;
  chavePublica: string;
  segredo: string;
  removerSegredo: boolean;
  segredoDoWebhook: string;
  removerSegredoDoWebhook: boolean;
}

function rascunhoDe(c: CredencialPublica): Rascunho {
  return {
    ambiente: c.ambiente,
    // Provedor ainda não salvo nasce ativo: salvar já o coloca em uso.
    ativo: c.atualizadoEm ? c.ativo : true,
    chavePublica: c.chavePublica ?? '',
    segredo: '',
    removerSegredo: false,
    segredoDoWebhook: '',
    removerSegredoDoWebhook: false,
  };
}

function rotuloDoAmbiente(
  provedor: ProvedorDePagamento,
  ambiente: AmbienteDePagamento
) {
  if (ambiente === 'live') return 'Produção';
  return provedor === 'paypal' ? 'Sandbox (teste)' : 'Teste';
}

const formatoData = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

async function lerErro(resposta: Response, padrao: string) {
  const corpo = (await resposta.json().catch(() => null)) as {
    error?: string;
  } | null;
  return corpo?.error ?? padrao;
}

function Situacao({ credencial }: { credencial: CredencialPublica }) {
  if (!credencial.temSegredo) {
    return (
      <Badge variant="outline">
        {credencial.temAlternativaNoAmbiente
          ? 'Usando o .env.local'
          : 'Não configurado'}
      </Badge>
    );
  }
  if (credencial.segredoIlegivel) {
    return <Badge variant="destructive">Chave ilegível</Badge>;
  }
  if (!credencial.ativo) {
    return <Badge variant="secondary">Desativado</Badge>;
  }
  if (!credencial.ultimoTeste) {
    return <Badge variant="warning">Salvo, não testado</Badge>;
  }
  return credencial.ultimoTeste.ok ? (
    <Badge variant="success">Conectado</Badge>
  ) : (
    <Badge variant="destructive">Teste falhou</Badge>
  );
}

function CartaoDoProvedor({
  credencial,
  webhookStripe,
  aoAtualizar,
}: {
  credencial: CredencialPublica;
  webhookStripe: string | null;
  aoAtualizar: (nova: CredencialPublica | null) => void;
}) {
  const [rascunho, setRascunho] = React.useState(() => rascunhoDe(credencial));
  const [salvando, setSalvando] = React.useState(false);
  const [testando, setTestando] = React.useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = React.useState(false);
  const [errosDoFormulario, setErrosDoFormulario] = React.useState<string[]>(
    []
  );
  const id = `pagamento-${credencial.provedor}`;
  const alterar = (parcial: Partial<Rascunho>) => {
    setErrosDoFormulario([]);
    setRascunho((atual) => ({ ...atual, ...parcial }));
  };

  const salvar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    // Mesmas regras da rota: o formato errado é apontado sem ida ao servidor.
    const erros = errosDeFormato(credencial.provedor, rascunho);
    if (erros.length > 0) {
      setErrosDoFormulario(erros);
      return;
    }
    setSalvando(true);
    try {
      const resposta = await fetch(
        `/api/admin/pagamentos/${credencial.provedor}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ambiente: rascunho.ambiente,
            ativo: rascunho.ativo,
            chavePublica: rascunho.chavePublica.trim() || null,
            segredo: rascunho.segredo,
            removerSegredo: rascunho.removerSegredo,
            segredoDoWebhook: rascunho.segredoDoWebhook,
            removerSegredoDoWebhook: rascunho.removerSegredoDoWebhook,
          }),
        }
      );
      if (!resposta.ok) {
        throw new Error(
          await lerErro(resposta, 'Não foi possível salvar as credenciais.')
        );
      }
      const { credencial: nova } = (await resposta.json()) as {
        credencial: CredencialPublica;
      };
      aoAtualizar(nova);
      setRascunho(rascunhoDe(nova));
      toast.success(`Credenciais do ${credencial.nome} salvas.`, {
        description: nova.temSegredo
          ? 'Use "Testar conexão" para conferir com o provedor.'
          : undefined,
      });
    } catch (erro) {
      toast.error('Não foi possível salvar.', {
        description: erro instanceof Error ? erro.message : undefined,
      });
    } finally {
      setSalvando(false);
    }
  };

  const testar = async () => {
    setTestando(true);
    try {
      const resposta = await fetch(
        `/api/admin/pagamentos/${credencial.provedor}/testar`,
        { method: 'POST', credentials: 'include' }
      );
      if (!resposta.ok) {
        throw new Error(
          await lerErro(resposta, 'Não foi possível testar a conexão.')
        );
      }
      const { resultado, credencial: nova } = (await resposta.json()) as {
        resultado: { ok: boolean; mensagem: string };
        credencial: CredencialPublica;
      };
      aoAtualizar(nova);
      if (resultado.ok) {
        toast.success(`${credencial.nome} conectado.`, {
          description: resultado.mensagem,
        });
      } else {
        toast.error(`${credencial.nome} recusou a conexão.`, {
          description: resultado.mensagem,
        });
      }
    } catch (erro) {
      toast.error('Não foi possível testar.', {
        description: erro instanceof Error ? erro.message : undefined,
      });
    } finally {
      setTestando(false);
    }
  };

  const remover = async () => {
    setSalvando(true);
    try {
      const resposta = await fetch(
        `/api/admin/pagamentos/${credencial.provedor}`,
        { method: 'DELETE', credentials: 'include' }
      );
      if (!resposta.ok) {
        throw new Error(
          await lerErro(resposta, 'Não foi possível remover as credenciais.')
        );
      }
      aoAtualizar(null);
      toast.success(`Credenciais do ${credencial.nome} removidas.`);
    } catch (erro) {
      toast.error('Não foi possível remover.', {
        description: erro instanceof Error ? erro.message : undefined,
      });
    } finally {
      setSalvando(false);
      setConfirmarRemocao(false);
    }
  };

  const copiarWebhook = async () => {
    if (!webhookStripe) return;
    try {
      await navigator.clipboard.writeText(webhookStripe);
      toast.success('Endereço do webhook copiado.');
    } catch {
      toast.info('Copie o endereço selecionando o texto.');
    }
  };

  const ocupado = salvando || testando;

  return (
    <Card className="min-w-0">
      <form onSubmit={salvar} aria-labelledby={`${id}-titulo`}>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <CardTitle id={`${id}-titulo`} className="text-xl">
                {credencial.nome}
              </CardTitle>
              <CardDescription>
                {credencial.checkoutIntegrado
                  ? 'Cobra as assinaturas dos planos Meta e Care (checkout, portal e webhooks).'
                  : 'As chaves ficam guardadas e verificadas com o provedor; o checkout por este meio ainda não existe no app.'}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Situacao credencial={credencial} />
              {credencial.temSegredo ? (
                <Badge variant="outline">
                  {rotuloDoAmbiente(credencial.provedor, credencial.ambiente)}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`${id}-ambiente`}>Ambiente</Label>
              <Select
                value={rascunho.ambiente}
                onValueChange={(valor) =>
                  alterar({ ambiente: valor as AmbienteDePagamento })
                }
              >
                <SelectTrigger id={`${id}-ambiente`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">
                    {rotuloDoAmbiente(credencial.provedor, 'test')}
                  </SelectItem>
                  <SelectItem value="live">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <label
                htmlFor={`${id}-ativo`}
                className="flex min-h-11 items-center gap-3 text-sm font-medium"
              >
                <Switch
                  id={`${id}-ativo`}
                  checked={rascunho.ativo}
                  onCheckedChange={(valor) => alterar({ ativo: valor })}
                />
                Usar estas credenciais
              </label>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${id}-publica`}>
              {credencial.rotuloPublico}
              {credencial.provedor === 'paypal' ? '' : ' (opcional)'}
            </Label>
            <Input
              id={`${id}-publica`}
              autoComplete="off"
              spellCheck={false}
              value={rascunho.chavePublica}
              onChange={(e) => alterar({ chavePublica: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${id}-segredo`}>{credencial.rotuloSegredo}</Label>
            <div className="relative">
              <KeyRound
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id={`${id}-segredo`}
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                className="pl-9"
                placeholder={
                  credencial.temSegredo
                    ? `Salvo, termina em ${credencial.finalDoSegredo ?? '••••'} (em branco mantém)`
                    : 'Cole aqui'
                }
                value={rascunho.segredo}
                onChange={(e) =>
                  alterar({
                    segredo: e.target.value,
                    ...(e.target.value ? { removerSegredo: false } : {}),
                  })
                }
              />
            </div>
            {credencial.segredoIlegivel ? (
              <p className="text-xs font-medium text-destructive" role="alert">
                O segredo salvo não pode mais ser lido (o AUTH_SECRET mudou).
                Informe de novo.
              </p>
            ) : null}
            {credencial.temSegredo ? (
              <label className="flex min-h-8 items-center gap-2 text-xs">
                <Checkbox
                  checked={rascunho.removerSegredo}
                  onCheckedChange={(v) =>
                    alterar({ removerSegredo: v === true, segredo: '' })
                  }
                />
                Apagar o segredo salvo ao salvar
              </label>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${id}-webhook`}>
              {credencial.rotuloWebhook}
              {credencial.checkoutIntegrado ? '' : ' (opcional)'}
            </Label>
            <Input
              id={`${id}-webhook`}
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              placeholder={
                credencial.temSegredoDoWebhook
                  ? `Salvo, termina em ${credencial.finalDoSegredoDoWebhook ?? '••••'} (em branco mantém)`
                  : 'Cole aqui'
              }
              value={rascunho.segredoDoWebhook}
              onChange={(e) =>
                alterar({
                  segredoDoWebhook: e.target.value,
                  ...(e.target.value ? { removerSegredoDoWebhook: false } : {}),
                })
              }
            />
            {credencial.temSegredoDoWebhook ? (
              <label className="flex min-h-8 items-center gap-2 text-xs">
                <Checkbox
                  checked={rascunho.removerSegredoDoWebhook}
                  onCheckedChange={(v) =>
                    alterar({
                      removerSegredoDoWebhook: v === true,
                      segredoDoWebhook: '',
                    })
                  }
                />
                Apagar o dado do webhook salvo ao salvar
              </label>
            ) : null}
          </div>

          {credencial.provedor === 'stripe' ? (
            <div className="grid gap-2 rounded-md border border-border bg-muted/40 p-4 text-sm">
              <p className="font-medium">Webhook na Stripe</p>
              <p className="text-muted-foreground">
                Em Desenvolvedores → Webhooks, crie um destino com este endereço
                e os eventos abaixo; o segredo de assinatura (whsec_) vai no
                campo acima.
              </p>
              {webhookStripe ? (
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <code className="min-w-0 break-all rounded bg-background px-2 py-1 text-xs">
                    {webhookStripe}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={copiarWebhook}
                  >
                    <Copy aria-hidden="true" /> Copiar
                  </Button>
                </div>
              ) : (
                <p className="text-destructive">
                  Defina APP_BASE_URL no .env.local para montar o endereço.
                </p>
              )}
              <ul className="flex flex-wrap gap-1.5">
                {EVENTOS_DO_WEBHOOK_STRIPE.map((evento) => (
                  <li key={evento}>
                    <code className="rounded bg-background px-1.5 py-0.5 text-xs">
                      {evento}
                    </code>
                  </li>
                ))}
              </ul>
              {credencial.temAlternativaNoAmbiente ? (
                <p className="text-xs text-muted-foreground">
                  Há chaves STRIPE_* no .env.local: elas valem só enquanto não
                  houver chaves ativas salvas aqui.
                </p>
              ) : null}
            </div>
          ) : null}

          {errosDoFormulario.length > 0 ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive-light p-3 text-sm text-destructive"
            >
              <p className="font-medium">Confira antes de salvar:</p>
              <ul className="mt-1 list-disc pl-5">
                {errosDoFormulario.map((mensagem) => (
                  <li key={mensagem}>{mensagem}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {credencial.ultimoTeste ? (
            <p
              className="flex items-start gap-2 text-sm"
              role="status"
              aria-live="polite"
            >
              {credencial.ultimoTeste.ok ? (
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-success"
                  aria-hidden="true"
                />
              ) : (
                <XCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                  aria-hidden="true"
                />
              )}
              <span>
                Último teste em{' '}
                {formatoData.format(new Date(credencial.ultimoTeste.em))}:{' '}
                {credencial.ultimoTeste.mensagem}
              </span>
            </p>
          ) : null}

          <a
            href={credencial.ondeEncontrar}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Onde encontrar as chaves do {credencial.nome}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 border-t border-border pt-5">
          <Button type="submit" disabled={ocupado}>
            {salvando ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            Salvar
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={ocupado || !credencial.temSegredo}
            onClick={testar}
          >
            {testando ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <PlugZap aria-hidden="true" />
            )}
            Testar conexão
          </Button>
          {credencial.atualizadoEm ? (
            confirmarRemocao ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={ocupado}
                  onClick={remover}
                >
                  <Trash2 aria-hidden="true" /> Confirmar remoção
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConfirmarRemocao(false)}
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                disabled={ocupado}
                onClick={() => setConfirmarRemocao(true)}
              >
                <Trash2 aria-hidden="true" /> Remover credenciais
              </Button>
            )
          ) : null}
        </CardFooter>
      </form>
    </Card>
  );
}

/** Admin → Pagamentos: chaves de API da Stripe, do Mercado Pago e do PayPal. */
export function MeiosDePagamento() {
  const [dados, setDados] = React.useState<Resposta | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [versao, setVersao] = React.useState(0);

  React.useEffect(() => {
    let ativo = true;
    fetch('/api/admin/pagamentos', { credentials: 'include' })
      .then(async (resposta) => {
        if (!resposta.ok) {
          throw new Error(
            await lerErro(resposta, 'Falha ao ler os meios de pagamento.')
          );
        }
        return (await resposta.json()) as Resposta;
      })
      .then((resposta) => {
        if (ativo) {
          setDados(resposta);
          setErro(null);
        }
      })
      .catch((e: unknown) => {
        if (ativo) {
          setErro(e instanceof Error ? e.message : 'Falha ao carregar.');
        }
      });
    return () => {
      ativo = false;
    };
  }, [versao]);

  if (erro) {
    return (
      <Card role="alert">
        <CardHeader>
          <CardTitle>Não foi possível carregar os meios de pagamento</CardTitle>
          <CardDescription>{erro}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button type="button" onClick={() => setVersao((v) => v + 1)}>
            Tentar de novo
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!dados) {
    return (
      <div className="grid gap-6" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-96 w-full" />
        ))}
      </div>
    );
  }

  const atualizar = (
    provedor: ProvedorDePagamento,
    nova: CredencialPublica | null
  ) => {
    if (nova === null) {
      // Removido: relê do servidor o estado vazio (e a alternativa do .env).
      setVersao((v) => v + 1);
      return;
    }
    setDados((atual) =>
      atual
        ? {
            ...atual,
            provedores: atual.provedores.map((p) =>
              p.provedor === provedor ? nova : p
            ),
          }
        : atual
    );
  };

  return (
    <div className="grid gap-6">
      {dados.provedores.map((credencial) => (
        <CartaoDoProvedor
          // Chave por atualização: removido ou salvo, o formulário recomeça
          // do estado do servidor.
          key={`${credencial.provedor}:${credencial.atualizadoEm ?? 'novo'}`}
          credencial={credencial}
          webhookStripe={dados.webhookStripe}
          aoAtualizar={(nova) => atualizar(credencial.provedor, nova)}
        />
      ))}
      <p className="text-sm text-muted-foreground">
        Os segredos ficam cifrados no banco (AES-256-GCM) e esta tela só mostra
        os 4 últimos caracteres. Troque as chaves por novas se elas tiverem sido
        compartilhadas fora deste painel.
      </p>
    </div>
  );
}
