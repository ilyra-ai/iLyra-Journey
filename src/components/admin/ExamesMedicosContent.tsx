'use client';

import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Stethoscope,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { buscarJson } from '@/lib/http/transporte';
import type {
  Atualizacao,
  Proposta,
} from '@/lib/prevencao/atualizacao-servico';
import {
  CONDICOES,
  type Condicao,
  NOME_DA_CONDICAO,
  NOME_DO_PUBLICO,
  type Publico,
  PUBLICOS,
  type Recomendacao,
} from '@/lib/prevencao/plano';

const ROTA_CATALOGO = '/api/admin/prevencao';
const ROTA_ATUALIZACAO = '/api/admin/prevencao/atualizacao';
const POR_PAGINA = 10;
const INTERVALO_DE_ACOMPANHAMENTO_MS = 5_000;

type Exame = Recomendacao & { ativo: boolean };

interface SituacaoDoCatalogo {
  catalogo: Exame[];
  venceEm: string;
  vencida: boolean;
  naoConferidas: string[];
}

interface SituacaoDaAtualizacao {
  mensalPendente: boolean;
  ultima: Atualizacao | null;
  pendentes: Proposta[];
}

type CampoEditavel =
  | 'nome'
  | 'procura'
  | 'publico'
  | 'idadeMinima'
  | 'idadeMaxima'
  | 'intervaloMeses'
  | 'tipo'
  | 'orientacao'
  | 'historicoRelevante'
  | 'fonteNome'
  | 'fonteUrl';

const NOME_DO_CAMPO: Record<CampoEditavel, string> = {
  nome: 'Nome',
  procura: 'O que procura',
  publico: 'Público',
  idadeMinima: 'Idade mínima',
  idadeMaxima: 'Idade máxima',
  intervaloMeses: 'Intervalo',
  tipo: 'Tipo',
  orientacao: 'Orientação',
  historicoRelevante: 'Histórico na família',
  fonteNome: 'Fonte',
  fonteUrl: 'Endereço da fonte',
};

const NOME_DA_PROPOSTA: Record<Proposta['tipo'], string> = {
  atualizar: 'Atualizar',
  novo: 'Novo exame',
  retirar: 'Retirar',
};

function dataBr(iso: string, comHora = false) {
  return format(
    parseISO(iso),
    comHora ? "dd/MM/yyyy 'às' HH:mm" : 'dd/MM/yyyy',
    {
      locale: ptBR,
    }
  );
}

function faixa(minima: number, maxima: number | null) {
  return maxima === null ? `a partir de ${minima}` : `${minima} a ${maxima}`;
}

function intervalo(meses: number | null) {
  if (meses === null) return 'a critério do médico';
  if (meses % 12 === 0) {
    const anos = meses / 12;
    return anos === 1 ? 'todo ano' : `a cada ${anos} anos`;
  }
  return `a cada ${meses} meses`;
}

function valorLegivel(campo: CampoEditavel, valor: unknown): string {
  switch (campo) {
    case 'publico':
      return NOME_DO_PUBLICO[valor as Publico];
    case 'tipo':
      return valor === 'rotina' ? 'Rotina' : 'Conversa com o médico';
    case 'intervaloMeses':
      return intervalo(valor as number | null);
    case 'idadeMaxima':
      return valor === null ? 'sem limite' : String(valor);
    case 'historicoRelevante':
      return (valor as Condicao[]).length
        ? (valor as Condicao[]).map((c) => NOME_DA_CONDICAO[c]).join(', ')
        : 'nenhum';
    default:
      return String(valor);
  }
}

/** Campos que a proposta muda em relação ao exame atual. */
function mudancas(atual: Exame, proposta: NonNullable<Proposta['dados']>) {
  return (Object.keys(NOME_DO_CAMPO) as CampoEditavel[]).flatMap((campo) => {
    const antes =
      campo === 'historicoRelevante'
        ? [...atual.historicoRelevante].sort()
        : atual[campo];
    const depois =
      campo === 'historicoRelevante'
        ? [...proposta.historicoRelevante].sort()
        : proposta[campo];
    return JSON.stringify(antes) === JSON.stringify(depois)
      ? []
      : [{ campo, antes, depois }];
  });
}

function BotaoDeIcone({
  rotulo,
  onClick,
  disabled,
  variante = 'aprovar',
  children,
}: {
  rotulo: string;
  onClick: () => void;
  disabled?: boolean;
  variante?: 'aprovar' | 'reprovar';
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      aria-label={rotulo}
      title={rotulo}
      disabled={disabled}
      onClick={onClick}
      className={
        variante === 'aprovar'
          ? 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950'
          : 'text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-950'
      }
    >
      {children}
    </Button>
  );
}

/** Uma proposta do modelo, com o que muda e a página oficial lida. */
function LinhaDaProposta({
  proposta,
  atual,
  ocupado,
  aoDecidir,
}: {
  proposta: Proposta;
  atual: Exame | undefined;
  ocupado: boolean;
  aoDecidir: (decisao: 'aprovar' | 'reprovar') => void;
}) {
  const nome = proposta.dados?.nome ?? atual?.nome ?? proposta.recomendacaoId;
  const alteracoes =
    proposta.tipo === 'atualizar' && atual && proposta.dados
      ? mudancas(atual, proposta.dados)
      : [];
  return (
    <TableRow className="align-top">
      <TableCell>
        <Badge
          variant={proposta.tipo === 'retirar' ? 'destructive' : 'secondary'}
        >
          {NOME_DA_PROPOSTA[proposta.tipo]}
        </Badge>
      </TableCell>
      <TableCell className="min-w-56 whitespace-normal">
        <p className="font-medium text-foreground">{nome}</p>
        {proposta.tipo === 'novo' && proposta.dados ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {NOME_DO_PUBLICO[proposta.dados.publico]},{' '}
            {faixa(proposta.dados.idadeMinima, proposta.dados.idadeMaxima)}{' '}
            anos, {intervalo(proposta.dados.intervaloMeses)}.
          </p>
        ) : null}
        {alteracoes.length ? (
          <ul className="mt-2 space-y-1 text-xs">
            {alteracoes.map(({ campo, antes, depois }) => (
              <li key={campo}>
                <span className="font-medium">{NOME_DO_CAMPO[campo]}:</span>{' '}
                <span className="text-muted-foreground line-through">
                  {valorLegivel(campo, antes)}
                </span>{' '}
                → <span>{valorLegivel(campo, depois)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </TableCell>
      <TableCell className="min-w-64 whitespace-normal text-sm">
        {proposta.motivo}
      </TableCell>
      <TableCell className="min-w-44 whitespace-normal text-xs">
        <a
          href={proposta.fonteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-start gap-1 text-primary underline-offset-4 hover:underline"
        >
          {proposta.fonteNome}
          <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          <span className="sr-only">(abre em nova aba)</span>
        </a>
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-2">
          <BotaoDeIcone
            rotulo={`Aprovar: ${nome}`}
            disabled={ocupado}
            onClick={() => aoDecidir('aprovar')}
          >
            <Check aria-hidden="true" />
          </BotaoDeIcone>
          <BotaoDeIcone
            rotulo={`Reprovar: ${nome}`}
            variante="reprovar"
            disabled={ocupado}
            onClick={() => aoDecidir('reprovar')}
          >
            <X aria-hidden="true" />
          </BotaoDeIcone>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface Formulario {
  nome: string;
  procura: string;
  publico: Publico;
  idadeMinima: string;
  idadeMaxima: string;
  intervaloMeses: string;
  tipo: 'rotina' | 'conversa';
  orientacao: string;
  historicoRelevante: Condicao[];
  fonteNome: string;
  fonteUrl: string;
  ativo: boolean;
}

function formularioDe(exame: Exame): Formulario {
  return {
    nome: exame.nome,
    procura: exame.procura,
    publico: exame.publico,
    idadeMinima: String(exame.idadeMinima),
    idadeMaxima: exame.idadeMaxima === null ? '' : String(exame.idadeMaxima),
    intervaloMeses:
      exame.intervaloMeses === null ? '' : String(exame.intervaloMeses),
    tipo: exame.tipo,
    orientacao: exame.orientacao,
    historicoRelevante: [...exame.historicoRelevante],
    fonteNome: exame.fonteNome,
    fonteUrl: exame.fonteUrl,
    ativo: exame.ativo,
  };
}

/** Pop-up com todas as informações do exame, salvas no motor da Lyra. */
function EditorDoExame({
  exame,
  aoFechar,
  aoSalvar,
}: {
  exame: Exame;
  aoFechar: () => void;
  aoSalvar: (situacao: SituacaoDoCatalogo) => void;
}) {
  const [form, setForm] = React.useState(() => formularioDe(exame));
  const [salvando, setSalvando] = React.useState(false);
  const campo = <K extends keyof Formulario>(chave: K, valor: Formulario[K]) =>
    setForm((atual) => ({ ...atual, [chave]: valor }));

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    const numero = (texto: string) =>
      texto.trim() === '' ? null : Number(texto);
    const idadeMinima = numero(form.idadeMinima);
    if (idadeMinima === null) {
      toast.error('Informe a idade mínima.');
      return;
    }
    setSalvando(true);
    const resposta = await buscarJson(ROTA_CATALOGO, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'alterar',
        id: exame.id,
        nome: form.nome,
        procura: form.procura,
        publico: form.publico,
        idadeMinima,
        idadeMaxima: numero(form.idadeMaxima),
        intervaloMeses: numero(form.intervaloMeses),
        tipo: form.tipo,
        orientacao: form.orientacao,
        historicoRelevante: form.historicoRelevante,
        fonteNome: form.fonteNome,
        fonteUrl: form.fonteUrl,
        ativo: form.ativo,
      }),
    });
    setSalvando(false);
    if (!resposta.ok) {
      toast.error('Não foi possível salvar o exame.', {
        description: resposta.falha.message,
      });
      return;
    }
    toast.success(`${form.nome} salvo no motor da Lyra.`);
    aoSalvar(resposta.corpo as SituacaoDoCatalogo);
  }

  return (
    <Dialog open onOpenChange={(aberto) => (!aberto ? aoFechar() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={(evento) => void salvar(evento)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{exame.nome}</DialogTitle>
            <DialogDescription>
              Ao salvar, o exame fica conferido e revisado agora por você no
              motor da Lyra.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="exame-nome">Nome</Label>
              <Input
                id="exame-nome"
                value={form.nome}
                maxLength={120}
                required
                onChange={(e) => campo('nome', e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="exame-procura">O que o exame procura</Label>
              <Textarea
                id="exame-procura"
                value={form.procura}
                maxLength={300}
                rows={2}
                required
                onChange={(e) => campo('procura', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exame-publico">Público</Label>
              <Select
                value={form.publico}
                onValueChange={(valor) => campo('publico', valor as Publico)}
              >
                <SelectTrigger id="exame-publico" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUBLICOS.map((publico) => (
                    <SelectItem key={publico} value={publico}>
                      {NOME_DO_PUBLICO[publico]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exame-tipo">Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(valor) =>
                  campo('tipo', valor as Formulario['tipo'])
                }
              >
                <SelectTrigger id="exame-tipo" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rotina">Rotina</SelectItem>
                  <SelectItem value="conversa">
                    Conversa com o médico
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exame-idade-minima">Idade mínima</Label>
              <Input
                id="exame-idade-minima"
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                required
                value={form.idadeMinima}
                onChange={(e) => campo('idadeMinima', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exame-idade-maxima">
                Idade máxima (vazio = sem limite)
              </Label>
              <Input
                id="exame-idade-maxima"
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                value={form.idadeMaxima}
                onChange={(e) => campo('idadeMaxima', e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="exame-intervalo">
                Intervalo em meses (vazio = a critério do médico)
              </Label>
              <Input
                id="exame-intervalo"
                type="number"
                inputMode="numeric"
                min={1}
                max={240}
                value={form.intervaloMeses}
                onChange={(e) => campo('intervaloMeses', e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="exame-orientacao">Orientação para a pessoa</Label>
              <Textarea
                id="exame-orientacao"
                value={form.orientacao}
                maxLength={600}
                rows={4}
                required
                onChange={(e) => campo('orientacao', e.target.value)}
              />
            </div>
            <fieldset className="space-y-2 sm:col-span-2">
              <legend className="text-sm font-medium">
                Histórico na família que pede conversar com o médico antes
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {CONDICOES.map((condicao) => (
                  <label
                    key={condicao}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={form.historicoRelevante.includes(condicao)}
                      onCheckedChange={(marcado) =>
                        campo(
                          'historicoRelevante',
                          marcado === true
                            ? [...form.historicoRelevante, condicao]
                            : form.historicoRelevante.filter(
                                (c) => c !== condicao
                              )
                        )
                      }
                    />
                    {NOME_DA_CONDICAO[condicao]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="exame-fonte-nome">Fonte oficial</Label>
              <Input
                id="exame-fonte-nome"
                value={form.fonteNome}
                maxLength={200}
                required
                onChange={(e) => campo('fonteNome', e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="exame-fonte-url">Endereço da fonte (https)</Label>
              <Input
                id="exame-fonte-url"
                type="url"
                value={form.fonteUrl}
                maxLength={400}
                required
                onChange={(e) => campo('fonteUrl', e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 sm:col-span-2">
              <Label htmlFor="exame-ativo" className="flex-1">
                Exame ativo (aparece no plano das pessoas)
              </Label>
              <Switch
                id="exame-ativo"
                checked={form.ativo}
                onCheckedChange={(valor) => campo('ativo', valor)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar no motor da Lyra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Exames médicos do motor da Lyra (tarefas 209 e 211): o modelo de IA
 * pesquisa as fontes oficiais e marca exames para revisão; o administrador
 * aprova ou reprova, e edita qualquer exame do catálogo.
 */
export function ExamesMedicosContent() {
  const { session } = useAuth();
  const chave = session ? `exames:${session.user.id}` : null;
  const [ocupado, setOcupado] = React.useState(false);
  const [emLote, setEmLote] = React.useState<'aprovar' | 'reprovar' | null>(
    null
  );
  const [pagina, setPagina] = React.useState(0);
  const [editando, setEditando] = React.useState<Exame | null>(null);
  const [catalogoSalvo, setCatalogoSalvo] =
    React.useState<SituacaoDoCatalogo | null>(null);
  const [atualizacaoSalva, setAtualizacaoSalva] =
    React.useState<SituacaoDaAtualizacao | null>(null);

  const avisar = React.useCallback((erro: unknown) => {
    toast.error('Não foi possível carregar os exames.', {
      description: erro instanceof Error ? erro.message : undefined,
    });
  }, []);
  const pedirCatalogo = React.useCallback(async () => {
    const resposta = await buscarJson(ROTA_CATALOGO, { cache: 'no-store' });
    if (!resposta.ok) throw new Error(resposta.falha.message);
    return resposta.corpo as SituacaoDoCatalogo;
  }, []);
  const pedirAtualizacao = React.useCallback(async () => {
    const resposta = await buscarJson(ROTA_ATUALIZACAO, { cache: 'no-store' });
    if (!resposta.ok) throw new Error(resposta.falha.message);
    return resposta.corpo as SituacaoDaAtualizacao;
  }, []);
  const catalogoCarregado = useKeyedResource<SituacaoDoCatalogo | null>(
    chave,
    pedirCatalogo,
    avisar,
    null,
    pedirCatalogo,
    true
  );
  const atualizacaoCarregada = useKeyedResource<SituacaoDaAtualizacao | null>(
    chave,
    pedirAtualizacao,
    avisar,
    null,
    pedirAtualizacao,
    true
  );
  const catalogo = catalogoSalvo ?? catalogoCarregado.data;
  const atualizacao = atualizacaoSalva ?? atualizacaoCarregada.data;
  const emAndamento = atualizacao?.ultima?.situacao === 'em-andamento';

  const recarregarCatalogo = catalogoCarregado.refresh;
  const recarregarAtualizacao = atualizacaoCarregada.refresh;
  // Enquanto o modelo pesquisa, a tela acompanha a situação.
  React.useEffect(() => {
    if (!emAndamento) return;
    const relogio = window.setInterval(() => {
      setAtualizacaoSalva(null);
      void recarregarAtualizacao();
    }, INTERVALO_DE_ACOMPANHAMENTO_MS);
    return () => window.clearInterval(relogio);
  }, [emAndamento, recarregarAtualizacao]);

  async function atualizarExames() {
    setOcupado(true);
    const resposta = await buscarJson(ROTA_ATUALIZACAO, { method: 'POST' });
    setOcupado(false);
    if (!resposta.ok) {
      toast.error('Não foi possível iniciar a atualização.', {
        description: resposta.falha.message,
      });
      return;
    }
    setAtualizacaoSalva(resposta.corpo as SituacaoDaAtualizacao);
    toast.success('O modelo de IA começou a pesquisar as fontes oficiais.', {
      description: 'A pesquisa leva alguns minutos. Esta tela acompanha.',
    });
  }

  async function decidir(
    propostas: string[] | 'todas',
    decisao: 'aprovar' | 'reprovar'
  ) {
    setOcupado(true);
    const resposta = await buscarJson(ROTA_ATUALIZACAO, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisao, propostas }),
    });
    setOcupado(false);
    setEmLote(null);
    if (!resposta.ok) {
      toast.error('Não foi possível registrar a decisão.', {
        description: resposta.falha.message,
      });
      return;
    }
    const corpo = resposta.corpo as SituacaoDaAtualizacao & {
      decididas: number;
    };
    setAtualizacaoSalva({
      mensalPendente: corpo.mensalPendente,
      ultima: corpo.ultima,
      pendentes: corpo.pendentes,
    });
    toast.success(
      `${corpo.decididas} ${corpo.decididas === 1 ? 'exame' : 'exames'} ${decisao === 'aprovar' ? 'aprovado(s) e aplicado(s) no motor' : 'reprovado(s)'}.`
    );
    if (decisao === 'aprovar') {
      setCatalogoSalvo(null);
      await recarregarCatalogo();
    }
  }

  if (!catalogo || !atualizacao) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const porId = new Map(catalogo.catalogo.map((exame) => [exame.id, exame]));
  const totalDePaginas = Math.max(
    1,
    Math.ceil(catalogo.catalogo.length / POR_PAGINA)
  );
  const paginaAtual = Math.min(pagina, totalDePaginas - 1);
  const exibidos = catalogo.catalogo.slice(
    paginaAtual * POR_PAGINA,
    (paginaAtual + 1) * POR_PAGINA
  );
  const ultima = atualizacao.ultima;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="size-5 text-primary" aria-hidden="true" />
              Exames médicos do motor da Lyra
            </CardTitle>
            <CardDescription className="max-w-2xl">
              O modelo de IA lê os exames do motor, pesquisa as fontes oficiais
              de saúde e marca para revisão o que deve ser atualizado,
              acrescentado ou retirado. Nada muda no motor sem a sua aprovação.
              Faça a atualização uma vez por mês.
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={() => void atualizarExames()}
            disabled={ocupado || emAndamento}
            className="shrink-0"
          >
            {emAndamento ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            {emAndamento ? 'Pesquisando…' : 'Atualizar Exames Médicos'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3" aria-live="polite">
          {ultima ? (
            <Alert
              variant={ultima.situacao === 'falhou' ? 'destructive' : 'default'}
            >
              <AlertTitle>
                {ultima.situacao === 'em-andamento'
                  ? `Pesquisa em andamento desde ${dataBr(ultima.iniciadaEm, true)}`
                  : ultima.situacao === 'concluida'
                    ? `Última atualização em ${dataBr(ultima.concluidaEm!, true)}`
                    : `A última atualização não terminou (${dataBr(ultima.iniciadaEm, true)})`}
              </AlertTitle>
              <AlertDescription className="space-y-1">
                {ultima.situacao === 'em-andamento' ? (
                  <p>
                    O modelo está lendo as páginas oficiais. Pode sair desta
                    tela; o resultado fica registrado.
                  </p>
                ) : (
                  <p>{ultima.mensagem}</p>
                )}
                {ultima.autor ? (
                  <p className="text-xs">Modelo: {ultima.autor}</p>
                ) : null}
                {ultima.fontes.length ? (
                  <details className="text-xs">
                    <summary className="cursor-pointer">
                      Páginas lidas ({ultima.fontes.length})
                    </summary>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {ultima.fontes.map((fonte) => (
                        <li key={fonte.url}>
                          <a
                            href={fonte.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all underline-offset-4 hover:underline"
                          >
                            {fonte.titulo || fonte.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-sm text-muted-foreground">
              O modelo de IA ainda não atualizou os exames.
            </p>
          )}
          {!emAndamento && atualizacao.mensalPendente ? (
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              A atualização mensal está pendente.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Exames marcados para revisão</CardTitle>
            <CardDescription>
              Somente o que o modelo de IA marcou. O que você aprovar ou
              reprovar não volta a ser trazido.
            </CardDescription>
          </div>
          {atualizacao.pendentes.length ? (
            <div className="flex gap-2">
              <BotaoDeIcone
                rotulo="Aprovar todos"
                disabled={ocupado}
                onClick={() => setEmLote('aprovar')}
              >
                <CheckCheck aria-hidden="true" />
              </BotaoDeIcone>
              <BotaoDeIcone
                rotulo="Reprovar todos"
                variante="reprovar"
                disabled={ocupado}
                onClick={() => setEmLote('reprovar')}
              >
                <XCircle aria-hidden="true" />
              </BotaoDeIcone>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {atualizacao.pendentes.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proposta</TableHead>
                  <TableHead>Exame</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Fonte lida</TableHead>
                  <TableHead className="text-right">Decisão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atualizacao.pendentes.map((proposta) => (
                  <LinhaDaProposta
                    key={proposta.id}
                    proposta={proposta}
                    atual={porId.get(proposta.recomendacaoId)}
                    ocupado={ocupado}
                    aoDecidir={(decisao) =>
                      void decidir([proposta.id], decisao)
                    }
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum exame aguardando revisão.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Todos os exames do motor da Lyra</CardTitle>
          <CardDescription>
            {catalogo.catalogo.length} exames. Clique em um exame para ver e
            editar todas as informações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exame</TableHead>
                <TableHead>Público</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Revisado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exibidos.map((exame) => (
                <TableRow
                  key={exame.id}
                  className="cursor-pointer"
                  onClick={() => setEditando(exame)}
                >
                  <TableCell className="font-medium">
                    <button
                      type="button"
                      className="text-left underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={(evento) => {
                        evento.stopPropagation();
                        setEditando(exame);
                      }}
                    >
                      {exame.nome}
                    </button>
                  </TableCell>
                  <TableCell>{NOME_DO_PUBLICO[exame.publico]}</TableCell>
                  <TableCell>
                    {faixa(exame.idadeMinima, exame.idadeMaxima)}
                  </TableCell>
                  <TableCell>
                    {exame.tipo === 'conversa'
                      ? 'Conversa com o médico'
                      : intervalo(exame.intervaloMeses)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {exame.ativo ? (
                        <Badge variant="secondary">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Retirado</Badge>
                      )}
                      {exame.conferido ? null : (
                        <Badge variant="destructive">Não conferido</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{dataBr(exame.revisadoEm)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalDePaginas > 1 ? (
            <nav
              aria-label="Páginas dos exames"
              className="flex items-center justify-end gap-2"
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Página anterior"
                disabled={paginaAtual === 0}
                onClick={() => setPagina(paginaAtual - 1)}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {paginaAtual + 1} de {totalDePaginas}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Próxima página"
                disabled={paginaAtual >= totalDePaginas - 1}
                onClick={() => setPagina(paginaAtual + 1)}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </nav>
          ) : null}
        </CardContent>
      </Card>

      {editando ? (
        <EditorDoExame
          key={editando.id}
          exame={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={(situacao) => {
            setCatalogoSalvo(situacao);
            setEditando(null);
          }}
        />
      ) : null}

      <AlertDialog
        open={emLote !== null}
        onOpenChange={(aberto) => (!aberto ? setEmLote(null) : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {emLote === 'aprovar'
                ? `Aprovar os ${atualizacao.pendentes.length} exames marcados?`
                : `Reprovar os ${atualizacao.pendentes.length} exames marcados?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {emLote === 'aprovar'
                ? 'As mudanças entram no motor da Lyra agora. Exames retirados ficam desativados, sem serem apagados.'
                : 'Nada muda no motor, e o modelo não volta a trazer estas propostas.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                emLote ? void decidir('todas', emLote) : undefined
              }
            >
              {emLote === 'aprovar' ? 'Aprovar todos' : 'Reprovar todos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
