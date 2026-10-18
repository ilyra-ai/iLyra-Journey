'use client';

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FlaskConical,
  KeyRound,
  Loader2,
  PlugZap,
  Rocket,
  Save,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  AmbienteDePagamento,
  ConjuntoPublico,
  CredencialPublica,
  ProvedorDePagamento,
} from '@/lib/pagamentos/credenciais';
import {
  concordancia,
  errosDeFormato,
  errosDosPrecosDaStripe,
  type PrecosInformados,
} from '@/lib/pagamentos/formatos';
import { cn } from '@/lib/utils';

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

const AMBIENTES: AmbienteDePagamento[] = ['test', 'live'];

function rotuloDoAmbiente(
  provedor: ProvedorDePagamento,
  ambiente: AmbienteDePagamento
) {
  if (ambiente === 'live') return 'Produção';
  return provedor === 'paypal' ? 'Sandbox (teste)' : 'Teste';
}

function deAmbiente(ambiente: AmbienteDePagamento) {
  return ambiente === 'live' ? 'de produção' : 'de teste';
}

interface PrecoNoRascunho {
  produto: string;
  mensal: string;
  anual: string;
}

const PRECO_VAZIO: PrecoNoRascunho = { produto: '', mensal: '', anual: '' };

interface Rascunho {
  chavePublica: string;
  segredo: string;
  removerSegredo: boolean;
  segredoDoWebhook: string;
  removerSegredoDoWebhook: boolean;
  precos: Record<string, PrecoNoRascunho>;
}

function precosSalvos(conjunto: ConjuntoPublico) {
  return Object.fromEntries(
    conjunto.precos.map((preco) => [
      preco.plano,
      {
        produto: preco.produto ?? '',
        mensal: preco.mensal ?? '',
        anual: preco.anual ?? '',
      },
    ])
  );
}

function rascunhoDe(conjunto: ConjuntoPublico): Rascunho {
  return {
    chavePublica: conjunto.chavePublica ?? '',
    segredo: '',
    removerSegredo: false,
    segredoDoWebhook: '',
    removerSegredoDoWebhook: false,
    precos: precosSalvos(conjunto),
  };
}

/** Só os planos cujos ids mudaram em relação ao salvo. */
function precosAlterados(
  conjunto: ConjuntoPublico,
  rascunho: Rascunho
): PrecosInformados[] {
  const salvos = precosSalvos(conjunto);
  return Object.entries(rascunho.precos)
    .filter(([plano, preco]) => {
      const antes = salvos[plano];
      return (
        !antes ||
        antes.produto !== preco.produto.trim() ||
        antes.mensal !== preco.mensal.trim() ||
        antes.anual !== preco.anual.trim()
      );
    })
    .map(([plano, preco]) => ({
      plano,
      produto: preco.produto.trim() || null,
      mensal: preco.mensal.trim() || null,
      anual: preco.anual.trim() || null,
    }));
}

const formatoData = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function moeda(valor: number, codigo: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: codigo,
  }).format(valor);
}

async function lerErro(resposta: Response, padrao: string) {
  const corpo = (await resposta.json().catch(() => null)) as {
    error?: string;
  } | null;
  return corpo?.error ?? padrao;
}

async function testarNoServidor(
  provedor: ProvedorDePagamento,
  ambiente: AmbienteDePagamento
) {
  const resposta = await fetch(
    `/api/admin/pagamentos/${provedor}/${ambiente}/testar`,
    { method: 'POST', credentials: 'include' }
  );
  if (!resposta.ok) {
    throw new Error(
      await lerErro(resposta, 'Não foi possível testar a conexão.')
    );
  }
  return (await resposta.json()) as {
    resultado: { ok: boolean; mensagem: string };
    credencial: CredencialPublica;
  };
}

function avisarResultado(
  provedor: ProvedorDePagamento,
  nome: string,
  ambiente: AmbienteDePagamento,
  resultado: { ok: boolean; mensagem: string }
) {
  const conectado = provedor === 'stripe' ? 'conectada' : 'conectado';
  if (resultado.ok) {
    toast.success(`${nome} ${conectado} (${deAmbiente(ambiente)}).`, {
      description: resultado.mensagem,
    });
  } else {
    toast.error(`${nome}: o teste ${deAmbiente(ambiente)} falhou.`, {
      description: resultado.mensagem,
    });
  }
}

function SituacaoDoProvedor({ credencial }: { credencial: CredencialPublica }) {
  const temChaves = AMBIENTES.some((a) => credencial.ambientes[a].temSegredo);
  if (!credencial.ativo) {
    if (!temChaves) {
      return (
        <Badge variant="outline">
          {credencial.temAlternativaNoAmbiente
            ? 'Usando o .env.local'
            : 'Não configurado'}
        </Badge>
      );
    }
    return <Badge variant="secondary">Desativado</Badge>;
  }
  if (!credencial.emUso) {
    return (
      <Badge variant="destructive">
        Faltam as chaves {deAmbiente(credencial.ambienteEmUso)}
      </Badge>
    );
  }
  return credencial.ambienteEmUso === 'live' ? (
    <Badge variant="success">Em uso · Produção</Badge>
  ) : (
    <Badge variant="warning">
      Em uso · {rotuloDoAmbiente(credencial.provedor, 'test')}
    </Badge>
  );
}

function SituacaoDoConjunto({ conjunto }: { conjunto: ConjuntoPublico }) {
  if (!conjunto.temSegredo) {
    return <Badge variant="outline">Sem chaves</Badge>;
  }
  if (conjunto.segredoIlegivel) {
    return <Badge variant="destructive">Chave ilegível</Badge>;
  }
  if (!conjunto.ultimoTeste) {
    return <Badge variant="warning">Salvo, não testado</Badge>;
  }
  return conjunto.ultimoTeste.ok ? (
    <Badge variant="success">Conectado</Badge>
  ) : (
    <Badge variant="destructive">Teste falhou</Badge>
  );
}

/**
 * Escolha do ambiente em uso: dois cartões de rádio (setas do teclado
 * alternam). Produção pede confirmação antes de valer.
 */
function SeletorDeAmbiente({
  credencial,
  ocupado,
  aoEscolher,
}: {
  credencial: CredencialPublica;
  ocupado: boolean;
  aoEscolher: (ambiente: AmbienteDePagamento) => void;
}) {
  const id = `pagamento-${credencial.provedor}-ambiente`;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p id={`${id}-rotulo`} className="text-sm font-semibold">
          Ambiente em uso
        </p>
        <p className="text-xs text-muted-foreground">
          Define quais chaves o app usa nas cobranças.
        </p>
      </div>
      <RadioGroupPrimitive.Root
        id={id}
        aria-labelledby={`${id}-rotulo`}
        value={credencial.ambienteEmUso}
        onValueChange={(valor) => aoEscolher(valor as AmbienteDePagamento)}
        disabled={ocupado}
        className="grid gap-3 sm:grid-cols-2"
      >
        {AMBIENTES.map((ambiente) => {
          const conjunto = credencial.ambientes[ambiente];
          const selecionado = credencial.ambienteEmUso === ambiente;
          const bloqueado = !selecionado && conjunto.pendencias.length > 0;
          const Icone = ambiente === 'live' ? Rocket : FlaskConical;
          return (
            <RadioGroupPrimitive.Item
              key={ambiente}
              id={`${id}-${ambiente}`}
              value={ambiente}
              disabled={ocupado || bloqueado}
              aria-describedby={`${id}-${ambiente}-situacao`}
              className={cn(
                'group relative flex min-h-24 w-full items-start gap-3 rounded-lg border bg-card p-4 text-left transition-[border-color,box-shadow,background-color] duration-150',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:cursor-not-allowed',
                selecionado
                  ? ambiente === 'live'
                    ? 'border-success bg-success-light/60 shadow-[0_0_0_1px_hsl(var(--success))]'
                    : 'border-warning bg-warning-light/60 shadow-[0_0_0_1px_hsl(var(--warning))]'
                  : 'border-border hover:border-primary/50',
                bloqueado && 'opacity-80'
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md',
                  ambiente === 'live'
                    ? 'bg-success-light text-success'
                    : 'bg-warning-light text-warning'
                )}
              >
                <Icone className="size-4.5" />
              </span>
              <span className="grid min-w-0 flex-1 gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold">
                    {rotuloDoAmbiente(credencial.provedor, ambiente)}
                  </span>
                  {selecionado ? (
                    <Badge
                      variant={ambiente === 'live' ? 'success' : 'warning'}
                    >
                      Em uso
                    </Badge>
                  ) : null}
                </span>
                <span
                  id={`${id}-${ambiente}-situacao`}
                  className="text-xs leading-relaxed text-muted-foreground"
                >
                  {conjunto.pendencias.length === 0
                    ? ambiente === 'live'
                      ? 'Chaves prontas: as cobranças são reais.'
                      : 'Chaves prontas: só cartões e contas de teste.'
                    : conjunto.pendencias.join(' ')}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border',
                  selecionado
                    ? 'border-primary'
                    : 'border-control group-hover:border-primary/60'
                )}
              >
                {selecionado ? (
                  <span className="size-2.5 rounded-full bg-primary" />
                ) : null}
              </span>
            </RadioGroupPrimitive.Item>
          );
        })}
      </RadioGroupPrimitive.Root>
    </div>
  );
}

function CampoDoPreco({
  id,
  rotulo,
  valor,
  placeholder,
  aoMudar,
}: {
  id: string;
  rotulo: string;
  valor: string;
  placeholder: string;
  aoMudar: (valor: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {rotulo}
      </Label>
      <Input
        id={id}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        className="font-mono text-xs"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
      />
    </div>
  );
}

function FormularioDoConjunto({
  credencial,
  ambiente,
  webhookStripe,
  aoAtualizar,
}: {
  credencial: CredencialPublica;
  ambiente: AmbienteDePagamento;
  webhookStripe: string | null;
  aoAtualizar: (nova: CredencialPublica) => void;
}) {
  const conjunto = credencial.ambientes[ambiente];
  const c = concordancia(credencial.provedor);
  const [rascunho, setRascunho] = React.useState(() => rascunhoDe(conjunto));
  const [salvando, setSalvando] = React.useState(false);
  const [testando, setTestando] = React.useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = React.useState(false);
  const [errosDoFormulario, setErrosDoFormulario] = React.useState<string[]>(
    []
  );
  const id = `pagamento-${credencial.provedor}-${ambiente}`;
  const emUso = credencial.ativo && credencial.ambienteEmUso === ambiente;
  const nomeDoPlano = (plano: string) =>
    conjunto.precos.find((p) => p.plano === plano)?.nome ?? plano;
  const alterar = (parcial: Partial<Rascunho>) => {
    setErrosDoFormulario([]);
    setRascunho((atual) => ({ ...atual, ...parcial }));
  };
  const alterarPreco = (plano: string, parcial: Partial<PrecoNoRascunho>) => {
    setErrosDoFormulario([]);
    setRascunho((atual) => ({
      ...atual,
      precos: {
        ...atual.precos,
        [plano]: { ...(atual.precos[plano] ?? PRECO_VAZIO), ...parcial },
      },
    }));
  };

  const testar = async () => {
    setTestando(true);
    try {
      const { resultado, credencial: nova } = await testarNoServidor(
        credencial.provedor,
        ambiente
      );
      aoAtualizar(nova);
      avisarResultado(
        credencial.provedor,
        credencial.nome,
        ambiente,
        resultado
      );
    } catch (erro) {
      toast.error('Não foi possível testar.', {
        description: erro instanceof Error ? erro.message : undefined,
      });
    } finally {
      setTestando(false);
    }
  };

  const salvar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const precos =
      credencial.provedor === 'stripe'
        ? precosAlterados(conjunto, rascunho)
        : [];
    // Mesmas regras da rota: o formato errado é apontado sem ida ao servidor.
    const erros = [
      ...errosDeFormato(credencial.provedor, rascunho, ambiente),
      ...errosDosPrecosDaStripe(
        Object.entries(rascunho.precos).map(([plano, preco]) => ({
          plano,
          ...preco,
        })),
        nomeDoPlano
      ),
    ];
    if (erros.length > 0) {
      setErrosDoFormulario(erros);
      return;
    }
    const chavePublica = rascunho.chavePublica.trim() || null;
    // Chave nova, chave pública ou preços diferentes: o teste anterior deixa
    // de valer e um novo é feito logo depois de salvar.
    const testarDepois =
      Boolean(rascunho.segredo) ||
      chavePublica !== conjunto.chavePublica ||
      precos.length > 0;
    setSalvando(true);
    try {
      const resposta = await fetch(
        `/api/admin/pagamentos/${credencial.provedor}/${ambiente}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chavePublica,
            segredo: rascunho.segredo,
            removerSegredo: rascunho.removerSegredo,
            segredoDoWebhook: rascunho.segredoDoWebhook,
            removerSegredoDoWebhook: rascunho.removerSegredoDoWebhook,
            ...(precos.length > 0 ? { precos } : {}),
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
      toast.success(
        `Chaves ${deAmbiente(ambiente)} ${c.do} ${credencial.nome} salvas.`
      );
      if (testarDepois && nova.ambientes[ambiente].temSegredo) {
        setSalvando(false);
        await testar();
      }
    } catch (erro) {
      toast.error('Não foi possível salvar.', {
        description: erro instanceof Error ? erro.message : undefined,
      });
    } finally {
      setSalvando(false);
    }
  };

  const remover = async () => {
    setSalvando(true);
    try {
      const resposta = await fetch(
        `/api/admin/pagamentos/${credencial.provedor}/${ambiente}`,
        { method: 'DELETE', credentials: 'include' }
      );
      if (!resposta.ok) {
        throw new Error(
          await lerErro(resposta, 'Não foi possível remover as credenciais.')
        );
      }
      const { credencial: nova } = (await resposta.json()) as {
        credencial: CredencialPublica;
      };
      aoAtualizar(nova);
      toast.success(
        `Chaves ${deAmbiente(ambiente)} ${c.do} ${credencial.nome} removidas.`
      );
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
  const nomeDoModo = ambiente === 'live' ? 'produção' : 'teste';

  return (
    <form
      onSubmit={salvar}
      aria-labelledby={`${id}-titulo`}
      className="grid gap-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${id}-titulo`} className="text-base font-semibold">
          Chaves {deAmbiente(ambiente)}
          {credencial.provedor === 'paypal' && ambiente === 'test'
            ? ' (sandbox)'
            : ''}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {emUso ? (
            <Badge variant={ambiente === 'live' ? 'success' : 'warning'}>
              Em uso agora
            </Badge>
          ) : null}
          <SituacaoDoConjunto conjunto={conjunto} />
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
          placeholder={
            credencial.provedor === 'stripe'
              ? ambiente === 'live'
                ? 'pk_live_...'
                : 'pk_test_...'
              : undefined
          }
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
              conjunto.temSegredo
                ? `Salvo, termina em ${conjunto.finalDoSegredo ?? '••••'} (em branco mantém)`
                : credencial.provedor === 'stripe'
                  ? `Cole a chave sk_${ambiente}_ ou rk_${ambiente}_`
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
        {conjunto.segredoIlegivel ? (
          <p className="text-xs font-medium text-destructive" role="alert">
            O segredo salvo não pode mais ser lido (o AUTH_SECRET mudou).
            Informe de novo.
          </p>
        ) : null}
        {conjunto.temSegredo ? (
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
            conjunto.temSegredoDoWebhook
              ? `Salvo, termina em ${conjunto.finalDoSegredoDoWebhook ?? '••••'} (em branco mantém)`
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
        {conjunto.temSegredoDoWebhook ? (
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
        <>
          <fieldset className="grid gap-4 rounded-lg border border-border p-4">
            <legend className="px-1 text-sm font-semibold">
              Preços dos planos na Stripe ({nomeDoModo})
            </legend>
            <p className="-mt-1 text-xs leading-relaxed text-muted-foreground">
              No modo de {nomeDoModo} da Stripe, em Catálogo de produtos, crie
              um produto por plano com um preço mensal e um anual recorrentes,
              nos valores abaixo, e cole os ids aqui. O &quot;Testar
              conexão&quot; confere valor, moeda e ciclo de cada preço.
            </p>
            {conjunto.precos.map((preco) => {
              const valor = rascunho.precos[preco.plano] ?? PRECO_VAZIO;
              return (
                <div
                  key={preco.plano}
                  role="group"
                  aria-labelledby={`${id}-preco-${preco.plano}`}
                  className="grid gap-3 border-t border-border pt-4 first-of-type:border-t-0 first-of-type:pt-0"
                >
                  <p
                    id={`${id}-preco-${preco.plano}`}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm"
                  >
                    <span className="font-semibold">{preco.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {moeda(preco.valorMensal, preco.moeda)} por mês ·{' '}
                      {moeda(preco.valorAnual, preco.moeda)} por ano
                    </span>
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <CampoDoPreco
                      id={`${id}-preco-${preco.plano}-produto`}
                      rotulo="Produto (opcional)"
                      placeholder="prod_..."
                      valor={valor.produto}
                      aoMudar={(v) => alterarPreco(preco.plano, { produto: v })}
                    />
                    <CampoDoPreco
                      id={`${id}-preco-${preco.plano}-mensal`}
                      rotulo="Preço mensal"
                      placeholder="price_..."
                      valor={valor.mensal}
                      aoMudar={(v) => alterarPreco(preco.plano, { mensal: v })}
                    />
                    <CampoDoPreco
                      id={`${id}-preco-${preco.plano}-anual`}
                      rotulo="Preço anual"
                      placeholder="price_..."
                      valor={valor.anual}
                      aoMudar={(v) => alterarPreco(preco.plano, { anual: v })}
                    />
                  </div>
                </div>
              );
            })}
          </fieldset>

          <div className="grid gap-2 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <p className="font-medium">Webhook na Stripe ({nomeDoModo})</p>
            <p className="text-muted-foreground">
              No modo de {nomeDoModo} da Stripe, em Desenvolvedores → Webhooks,
              crie um destino com este endereço e os eventos abaixo; o segredo
              de assinatura (whsec_) desse destino vai no campo acima. Teste e
              produção têm segredos diferentes.
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
          </div>
        </>
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

      {conjunto.ultimoTeste ? (
        <p
          className="flex items-start gap-2 text-sm"
          role="status"
          aria-live="polite"
        >
          {conjunto.ultimoTeste.ok ? (
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
            {formatoData.format(new Date(conjunto.ultimoTeste.em))}:{' '}
            {conjunto.ultimoTeste.mensagem}
          </span>
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-border pt-5">
        <Button type="submit" disabled={ocupado}>
          {salvando ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}
          Salvar chaves {deAmbiente(ambiente)}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={ocupado || !conjunto.temSegredo}
          onClick={testar}
        >
          {testando ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <PlugZap aria-hidden="true" />
          )}
          Testar conexão
        </Button>
        {conjunto.atualizadoEm ? (
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
              disabled={ocupado || emUso}
              onClick={() => setConfirmarRemocao(true)}
            >
              <Trash2 aria-hidden="true" /> Remover chaves{' '}
              {deAmbiente(ambiente)}
            </Button>
          )
        ) : null}
      </div>
      {emUso && conjunto.atualizadoEm ? (
        <p className="-mt-3 text-xs text-muted-foreground">
          Estas chaves estão em uso: para removê-las, troque o ambiente em uso
          ou desative {c.o} {credencial.nome}.
        </p>
      ) : null}
    </form>
  );
}

function CartaoDoProvedor({
  credencial,
  webhookStripe,
  aoAtualizar,
}: {
  credencial: CredencialPublica;
  webhookStripe: string | null;
  aoAtualizar: (nova: CredencialPublica) => void;
}) {
  const [aba, setAba] = React.useState<AmbienteDePagamento>(
    credencial.ambienteEmUso
  );
  const [salvandoConfiguracao, setSalvandoConfiguracao] = React.useState(false);
  const [confirmarProducao, setConfirmarProducao] = React.useState(false);
  const id = `pagamento-${credencial.provedor}`;
  const c = concordancia(credencial.provedor);

  const configurar = async (
    ambienteEmUso: AmbienteDePagamento,
    ativo: boolean
  ) => {
    setSalvandoConfiguracao(true);
    try {
      const resposta = await fetch(
        `/api/admin/pagamentos/${credencial.provedor}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ambienteEmUso, ativo }),
        }
      );
      if (!resposta.ok) {
        throw new Error(
          await lerErro(resposta, 'Não foi possível trocar o ambiente.')
        );
      }
      const { credencial: nova } = (await resposta.json()) as {
        credencial: CredencialPublica;
      };
      aoAtualizar(nova);
      setAba(nova.ambienteEmUso);
      toast.success(
        nova.ativo
          ? `${credencial.nome} usando as chaves ${deAmbiente(nova.ambienteEmUso)}.`
          : `${credencial.nome} ${c.desativado}.`
      );
    } catch (erro) {
      toast.error('Não foi possível trocar o ambiente.', {
        description: erro instanceof Error ? erro.message : undefined,
      });
    } finally {
      setSalvandoConfiguracao(false);
    }
  };

  const escolherAmbiente = (ambiente: AmbienteDePagamento) => {
    if (ambiente === credencial.ambienteEmUso) return;
    // Produção com o provedor ativo: só depois de confirmar.
    if (ambiente === 'live' && credencial.ativo) {
      setConfirmarProducao(true);
      return;
    }
    void configurar(ambiente, credencial.ativo);
  };

  const emProducao = credencial.ambienteEmUso === 'live';

  return (
    <Card
      className="min-w-0"
      role="region"
      aria-labelledby={`${id}-titulo`}
      data-provedor={credencial.provedor}
    >
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle as="h2" id={`${id}-titulo`} className="text-xl">
              {credencial.nome}
            </CardTitle>
            <CardDescription>
              {credencial.checkoutIntegrado
                ? 'Cobra as assinaturas dos planos Meta e Care (checkout, portal e webhooks).'
                : 'As chaves ficam guardadas e verificadas com o provedor; o checkout por este meio ainda não existe no app.'}
            </CardDescription>
          </div>
          <SituacaoDoProvedor credencial={credencial} />
        </div>
      </CardHeader>

      <CardContent className="grid gap-6">
        <SeletorDeAmbiente
          credencial={credencial}
          ocupado={salvandoConfiguracao}
          aoEscolher={escolherAmbiente}
        />

        <div
          className={cn(
            'flex items-start gap-3 rounded-lg border p-3 text-sm',
            !credencial.ativo
              ? 'border-border bg-muted/40 text-muted-foreground'
              : emProducao
                ? 'border-success/30 bg-success-light text-success'
                : 'border-warning/30 bg-warning-light text-warning'
          )}
          role="status"
        >
          {emProducao && credencial.ativo ? (
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
          ) : (
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
          )}
          <p className="leading-relaxed">
            {!credencial.ativo
              ? `${credencial.nome} ${c.desativado}: ${
                  credencial.provedor === 'stripe' &&
                  credencial.temAlternativaNoAmbiente
                    ? `valem as chaves STRIPE_* do .env.local (${deAmbiente(credencial.ambienteDaAlternativa ?? 'test')}).`
                    : 'nenhuma chave deste painel é usada.'
                }`
              : !credencial.checkoutIntegrado
                ? `Chaves ${deAmbiente(credencial.ambienteEmUso)} selecionadas. O checkout ${c.pelo} ${credencial.nome} ainda não existe no app.`
                : emProducao
                  ? 'Produção em uso: os checkouts cobram de verdade e os webhooks de produção liberam os planos.'
                  : 'Teste em uso: só cartões de teste da Stripe funcionam e nenhuma cobrança é real.'}
          </p>
        </div>

        <label
          htmlFor={`${id}-ativo`}
          className="flex min-h-11 w-fit items-center gap-3 text-sm font-medium"
        >
          <Switch
            id={`${id}-ativo`}
            checked={credencial.ativo}
            disabled={salvandoConfiguracao}
            onCheckedChange={(valor) =>
              void configurar(credencial.ambienteEmUso, valor)
            }
          />
          Usar {c.o} {credencial.nome} com as chaves{' '}
          {deAmbiente(credencial.ambienteEmUso)}
        </label>

        <Tabs
          value={aba}
          onValueChange={(valor) => setAba(valor as AmbienteDePagamento)}
        >
          <TabsList
            aria-label={`Chaves ${c.do} ${credencial.nome} por ambiente`}
            className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto"
          >
            {AMBIENTES.map((ambiente) => (
              <TabsTrigger
                key={ambiente}
                value={ambiente}
                id={`${id}-aba-${ambiente}`}
                className="gap-2"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-2 rounded-full',
                    ambiente === 'live' ? 'bg-success' : 'bg-warning'
                  )}
                />
                Chaves {deAmbiente(ambiente)}
                {credencial.ambientes[ambiente].temSegredo ? (
                  <CheckCircle2
                    className="size-3.5 text-success"
                    aria-label="salvas"
                  />
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          {AMBIENTES.map((ambiente) => (
            <TabsContent key={ambiente} value={ambiente}>
              <FormularioDoConjunto
                // Chave por atualização: salvo ou removido, o formulário
                // recomeça do estado do servidor.
                key={`${ambiente}:${credencial.ambientes[ambiente].atualizadoEm ?? 'novo'}`}
                credencial={credencial}
                ambiente={ambiente}
                webhookStripe={webhookStripe}
                aoAtualizar={aoAtualizar}
              />
            </TabsContent>
          ))}
        </Tabs>

        <a
          href={credencial.ondeEncontrar}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Onde encontrar as chaves {c.do} {credencial.nome}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">(abre em nova aba)</span>
        </a>
      </CardContent>

      <AlertDialog open={confirmarProducao} onOpenChange={setConfirmarProducao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Usar as chaves de produção {c.do} {credencial.nome}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {credencial.checkoutIntegrado
                ? 'A partir de agora os checkouts cobram cartões reais, o portal mostra as assinaturas de produção e só os webhooks de produção liberam os planos. Assinaturas feitas em teste continuam só no ambiente de teste da Stripe.'
                : `As chaves de produção ${c.do} ${credencial.nome} passam a ser as selecionadas.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar em teste</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmarProducao(false);
                void configurar('live', true);
              }}
            >
              <Rocket aria-hidden="true" /> Usar produção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/**
 * Admin → Pagamentos: chaves de API da Stripe, do Mercado Pago e do PayPal,
 * cada um com as chaves de teste e de produção e o ambiente em uso.
 */
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
        <CardContent>
          <Button type="button" onClick={() => setVersao((v) => v + 1)}>
            Tentar de novo
          </Button>
        </CardContent>
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

  const atualizar = (nova: CredencialPublica) => {
    setDados((atual) =>
      atual
        ? {
            ...atual,
            provedores: atual.provedores.map((p) =>
              p.provedor === nova.provedor ? nova : p
            ),
          }
        : atual
    );
  };

  return (
    <div className="grid gap-6">
      {dados.provedores.map((credencial) => (
        <CartaoDoProvedor
          key={credencial.provedor}
          credencial={credencial}
          webhookStripe={dados.webhookStripe}
          aoAtualizar={atualizar}
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
