'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageIntro } from '@/components/layout/PageIntro';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { buscarJson } from '@/lib/http/transporte';
import { somarDias } from '@/lib/acontecimentos/analise';
import {
  PERCEPCOES,
  PORCOES,
  TIPOS,
  edicaoSchema,
  refeicaoSchema,
  type DiaDoDiario,
  type Porcao,
  type Refeicao,
  type TipoDeRefeicao,
} from '@/lib/alimentacao/esquema';
import { requisitar, erroNaPagina } from '@/components/experiencias/transporte';

const dataCurta = (s: string) => s.split('-').reverse().join('/');
function diaPorExtenso(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${data}T12:00:00Z`));
}
function horaAgora(fuso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: fuso,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());
}
async function enviarFormulario<T>(url: string, method: string, f: FormData) {
  const r = await buscarJson(url, { method, cache: 'no-store', body: f });
  if (!r.ok) throw new Error(r.falha.message);
  return r.corpo as T;
}
const TIPOS_ACEITOS = 'image/png,image/jpeg,image/webp';

type Rascunho = {
  data: string;
  hora: string;
  tipo: TipoDeRefeicao;
  descricao: string;
  porcao: Porcao | null;
  percepcao: number | null;
  nota: string;
};

function Formulario({
  inicial,
  atual,
  hoje,
  corte,
  ocupada,
  ocupar,
  concluido,
}: {
  inicial: Rascunho;
  atual: Refeicao | null;
  hoje: string;
  corte: string | null;
  ocupada: boolean;
  ocupar: (v: boolean) => void;
  concluido: (mensagem: string, data: string) => void;
}) {
  const ids = useId(),
    [r, setR] = useState(inicial),
    [pedidoId] = useState(() => crypto.randomUUID()),
    [arquivo, setArquivo] = useState<File | null>(null),
    [previa, setPrevia] = useState<string | null>(null),
    [removerFoto, setRemoverFoto] = useState(false),
    [erro, setErro] = useState(''),
    entrada = useRef<HTMLInputElement>(null);
  // Cada prévia local é liberada ao ser trocada e ao fechar o formulário.
  useEffect(
    () => () => {
      if (previa) URL.revokeObjectURL(previa);
    },
    [previa]
  );
  const temFoto = Boolean(arquivo) || (Boolean(atual?.foto) && !removerFoto);
  const salvar = async () => {
    setErro('');
    if (!r.descricao.trim() && !temFoto) {
      setErro('Descreva o que comeu ou bebeu ou adicione uma foto.');
      return;
    }
    ocupar(true);
    try {
      if (!atual) {
        const v = refeicaoSchema.safeParse({ ...r, id: pedidoId });
        if (!v.success) throw new Error(v.error.issues[0].message);
        const f = new FormData();
        f.set('dados', JSON.stringify(v.data));
        if (arquivo) f.set('foto', arquivo);
        await enviarFormulario('/api/alimentacao', 'POST', f);
        concluido('Registro salvo.', r.data);
        return;
      }
      const v = edicaoSchema.safeParse({ ...r, versao: atual.versao });
      if (!v.success) throw new Error(v.error.issues[0].message);
      let versao = atual.versao;
      // A foto nova é gravada antes de uma descrição vazia ser aceita.
      if (arquivo) {
        const f = new FormData();
        f.set('dados', JSON.stringify({ versao }));
        f.set('foto', arquivo);
        versao = (
          await enviarFormulario<Refeicao>(
            `/api/alimentacao/${atual.id}/foto`,
            'PUT',
            f
          )
        ).versao;
      }
      versao = (
        await requisitar<Refeicao>(`/api/alimentacao/${atual.id}`, 'PATCH', {
          ...v.data,
          versao,
        })
      ).versao;
      if (removerFoto && atual.foto && !arquivo)
        await requisitar(`/api/alimentacao/${atual.id}/foto`, 'DELETE', {
          versao,
        });
      concluido('Registro atualizado.', r.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      ocupar(false);
    }
  };
  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!ocupada) void salvar();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${ids}-data`}>Data</FieldLabel>
          <Input
            id={`${ids}-data`}
            type="date"
            value={r.data}
            min={corte ?? undefined}
            max={hoje}
            disabled={ocupada}
            onChange={(e) =>
              e.target.value && setR({ ...r, data: e.target.value })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${ids}-hora`}>Horário</FieldLabel>
          <Input
            id={`${ids}-hora`}
            type="time"
            value={r.hora}
            disabled={ocupada}
            onChange={(e) =>
              e.target.value && setR({ ...r, hora: e.target.value })
            }
          />
        </Field>
      </div>
      <FieldSet>
        <FieldLegend id={`${ids}-tipo`} variant="label">
          O que foi
        </FieldLegend>
        <ToggleGroup
          type="single"
          aria-labelledby={`${ids}-tipo`}
          value={r.tipo}
          disabled={ocupada}
          onValueChange={(v) => v && setR({ ...r, tipo: v as TipoDeRefeicao })}
          className="flex flex-wrap justify-start gap-2"
        >
          {(Object.keys(TIPOS) as TipoDeRefeicao[]).map((t) => (
            <ToggleGroupItem
              key={t}
              value={t}
              variant="outline"
              className="data-[state=on]:border-primary data-[state=on]:bg-primary/8"
            >
              {TIPOS[t]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </FieldSet>
      <Field>
        <FieldLabel htmlFor={`${ids}-descricao`}>
          O que você comeu ou bebeu
        </FieldLabel>
        <Textarea
          id={`${ids}-descricao`}
          value={r.descricao}
          maxLength={500}
          rows={3}
          disabled={ocupada}
          onChange={(e) => setR({ ...r, descricao: e.target.value })}
        />
        <FieldDescription>
          Opcional quando houver foto. {r.descricao.length}/500 caracteres.
        </FieldDescription>
      </Field>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Foto (opcional)</span>
        <div className="flex flex-wrap items-center gap-3">
          {(previa && arquivo) || (atual?.foto && !removerFoto) ? (
            // Foto privada servida pela API autenticada: sem o otimizador
            // público, que não carrega a sessão da pessoa.
            <Image
              unoptimized
              width={96}
              height={96}
              src={
                previa && arquivo
                  ? previa
                  : `/api/alimentacao/${atual!.id}/foto?v=${atual!.foto!.assinatura}`
              }
              alt="Prévia da foto do registro"
              className="size-24 rounded-lg border border-border object-cover"
            />
          ) : (
            <div className="flex size-24 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
              <ImageOff className="size-6" aria-hidden="true" />
              <span className="sr-only">Sem foto</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <input
              ref={entrada}
              id={`${ids}-foto`}
              type="file"
              accept={TIPOS_ACEITOS}
              aria-label="Escolher foto do registro"
              // O botão visível abre o seletor; o campo não é parada do Tab.
              tabIndex={-1}
              className="sr-only"
              disabled={ocupada}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = '';
                if (f && f.size > 3 * 1024 * 1024) {
                  setErro('Escolha uma foto de até 3 MiB.');
                  return;
                }
                setArquivo(f);
                setPrevia(f ? URL.createObjectURL(f) : null);
                setRemoverFoto(false);
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={ocupada}
              onClick={() => entrada.current?.click()}
            >
              <Camera />
              {temFoto ? 'Trocar foto' : 'Adicionar foto'}
            </Button>
            {temFoto && (
              <Button
                type="button"
                variant="ghost"
                disabled={ocupada}
                onClick={() => {
                  setArquivo(null);
                  setPrevia(null);
                  if (atual?.foto) setRemoverFoto(true);
                }}
              >
                Remover foto
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          PNG, JPEG ou WebP de até 3 MiB. A foto é guardada como PNG sem
          metadados (como local e aparelho), visível só para você. O app não
          identifica alimentos pela foto nem a trata como pesagem.
        </p>
      </div>
      <FieldSet>
        <FieldLegend id={`${ids}-porcao`} variant="label">
          Quantidade (sua estimativa, opcional)
        </FieldLegend>
        <ToggleGroup
          type="single"
          aria-labelledby={`${ids}-porcao`}
          value={r.porcao ?? ''}
          disabled={ocupada}
          onValueChange={(v) =>
            setR({ ...r, porcao: v ? (v as Porcao) : null })
          }
          className="flex flex-wrap justify-start gap-2"
        >
          {(Object.keys(PORCOES) as Porcao[]).map((p) => (
            <ToggleGroupItem
              key={p}
              value={p}
              variant="outline"
              className="data-[state=on]:border-primary data-[state=on]:bg-primary/8"
            >
              {PORCOES[p]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </FieldSet>
      <FieldSet>
        <FieldLegend id={`${ids}-percepcao`} variant="label">
          Como você se sentiu depois (opcional)
        </FieldLegend>
        <ToggleGroup
          type="single"
          aria-labelledby={`${ids}-percepcao`}
          value={r.percepcao === null ? '' : String(r.percepcao)}
          disabled={ocupada}
          onValueChange={(v) => setR({ ...r, percepcao: v ? Number(v) : null })}
          className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <ToggleGroupItem
              key={n}
              value={String(n)}
              variant="outline"
              className="h-auto flex-col gap-0.5 py-2 data-[state=on]:border-primary data-[state=on]:bg-primary/8"
            >
              <span className="font-semibold">{n}</span>
              <span className="text-xs">{PERCEPCOES[n]}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </FieldSet>
      <Field>
        <FieldLabel htmlFor={`${ids}-nota`}>Nota (opcional)</FieldLabel>
        <Textarea
          id={`${ids}-nota`}
          value={r.nota}
          maxLength={500}
          rows={2}
          disabled={ocupada}
          onChange={(e) => setR({ ...r, nota: e.target.value })}
        />
      </Field>
      <p className="text-sm text-muted-foreground">
        É um diário pessoal, não um plano alimentar nem um cálculo de
        nutrientes.
      </p>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      <Button type="submit" disabled={ocupada}>
        {ocupada
          ? 'Salvando…'
          : atual
            ? 'Salvar alterações'
            : 'Salvar registro'}
      </Button>
    </form>
  );
}

export function DiarioAlimentar() {
  const router = useRouter(),
    q = useSearchParams(),
    { session } = useAuth(),
    dataNaUrl = q.get('data'),
    carregar = useCallback(
      () =>
        requisitar<DiaDoDiario>(
          `/api/alimentacao${dataNaUrl && /^\d{4}-\d{2}-\d{2}$/.test(dataNaUrl) ? `?data=${dataNaUrl}` : ''}`
        ),
      [dataNaUrl]
    ),
    { data, loading, error, refresh } = useKeyedResource<DiaDoDiario | null>(
      session ? `${session.user.id}:${dataNaUrl ?? ''}` : null,
      carregar,
      erroNaPagina,
      null
    ),
    [editor, setEditor] = useState<{ atual: Refeicao | null } | null>(null),
    [ocupada, setOcupada] = useState(false),
    [falha, setFalha] = useState('');
  const irPara = (d: string | null) =>
    router.replace(d ? `/alimentacao?data=${d}` : '/alimentacao', {
      scroll: false,
    });
  if (error && !data)
    return (
      <Alert variant="destructive">
        <AlertTitle>Não foi possível carregar seu diário</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Tente novamente.'}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void refresh()}>
              Tentar novamente
            </Button>
            <Button variant="outline" onClick={() => irPara(null)}>
              Voltar para hoje
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  if (!data) return <Skeleton className="h-64 rounded-xl" />;
  const excluir = async (r: Refeicao) => {
    setOcupada(true);
    setFalha('');
    try {
      await requisitar(`/api/alimentacao/${r.id}`, 'DELETE', {
        versao: r.versao,
      });
      await refresh();
      toast.success('Registro excluído.');
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível excluir.');
    } finally {
      setOcupada(false);
    }
  };
  const anterior = somarDias(data.data, -1),
    podeVoltar = !data.corte || anterior >= data.corte;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageIntro
        title="Diário alimentar"
        description="Registre refeições, lanches e bebidas por texto ou foto, com horário e como se sentiu. Estimativas são suas e ficam identificadas."
        actions={
          <>
            <Button
              variant="outline"
              disabled={loading || ocupada}
              onClick={() => {
                setFalha('');
                void refresh();
              }}
            >
              <RefreshCw />
              Atualizar
            </Button>
            <Button
              disabled={ocupada}
              onClick={() => setEditor({ atual: null })}
            >
              <Plus />
              Novo registro
            </Button>
          </>
        }
      />
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <Field className="w-full sm:w-56">
              <FieldLabel htmlFor="diario-dia">Dia</FieldLabel>
              <Input
                id="diario-dia"
                type="date"
                value={data.data}
                min={data.corte ?? undefined}
                max={data.hoje}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v && v <= data.hoje && (!data.corte || v >= data.corte))
                    irPara(v === data.hoje ? null : v);
                }}
              />
            </Field>
            <div className="flex min-w-0 flex-1 flex-wrap gap-2 sm:flex-none">
              <Button
                variant="outline"
                className="min-w-0 flex-1 sm:flex-none"
                disabled={!podeVoltar}
                onClick={() => irPara(anterior)}
              >
                <ChevronLeft />
                Dia anterior
              </Button>
              <Button
                variant="outline"
                className="min-w-0 flex-1 sm:flex-none"
                disabled={data.data >= data.hoje}
                onClick={() => {
                  const d = somarDias(data.data, 1);
                  irPara(d >= data.hoje ? null : d);
                }}
              >
                Próximo dia
                <ChevronRight />
              </Button>
            </div>
          </div>
          {data.dias.length > 0 && (
            <nav
              aria-label="Dias com registros"
              className="flex flex-col gap-2"
            >
              <span className="text-sm font-medium">Dias com registros</span>
              <ul className="flex flex-wrap gap-2">
                {data.dias.map((d) => (
                  <li key={d.data}>
                    <Button
                      variant={d.data === data.data ? 'default' : 'outline'}
                      size="sm"
                      aria-current={d.data === data.data ? 'date' : undefined}
                      onClick={() =>
                        irPara(d.data === data.hoje ? null : d.data)
                      }
                    >
                      {dataCurta(d.data).slice(0, 5)}
                      <span className="rounded-full bg-muted px-1.5 text-xs text-foreground tabular-nums">
                        {d.total}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <p className="text-xs text-muted-foreground">
            Fuso do perfil {data.fuso}
            {data.corte
              ? ` · histórico do plano desde ${dataCurta(data.corte)}`
              : ''}
            .
          </p>
        </CardContent>
      </Card>
      {falha && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível concluir</AlertTitle>
          <AlertDescription>{falha}</AlertDescription>
        </Alert>
      )}
      <section
        aria-labelledby="titulo-dia-diario"
        aria-busy={loading}
        className="flex min-w-0 flex-col gap-3"
      >
        <h3
          id="titulo-dia-diario"
          className="text-base font-semibold first-letter:uppercase"
        >
          {diaPorExtenso(data.data)}
        </h3>
        <p role="status" className="text-sm text-muted-foreground">
          {data.refeicoes.length === 0
            ? 'Nenhum registro neste dia. Um dia sem registro não significa que não houve refeição.'
            : `${data.refeicoes.length} ${data.refeicoes.length === 1 ? 'registro' : 'registros'}.`}
        </p>
        <ol className="flex min-w-0 flex-col gap-3">
          {data.refeicoes.map((r) => (
            <li key={r.id}>
              <Card className="min-w-0">
                <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row">
                  {r.foto && (
                    <Image
                      unoptimized
                      width={224}
                      height={224}
                      src={`/api/alimentacao/${r.id}/foto?v=${r.foto.assinatura}`}
                      alt={`Foto do registro de ${TIPOS[r.tipo].toLowerCase()} às ${r.hora}`}
                      loading="lazy"
                      className="h-32 w-full rounded-lg border border-border object-cover sm:size-28"
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold tabular-nums">
                        {r.hora}
                      </span>
                      <Badge variant="secondary">{TIPOS[r.tipo]}</Badge>
                      {r.porcao && (
                        <Badge variant="outline">
                          Porção {PORCOES[r.porcao].toLowerCase()} (sua
                          estimativa)
                        </Badge>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {r.descricao || 'Registro com foto, sem descrição.'}
                    </p>
                    {r.percepcao !== null && (
                      <p className="text-sm text-muted-foreground">
                        Como se sentiu: {r.percepcao}/5 ·{' '}
                        {PERCEPCOES[r.percepcao]}
                      </p>
                    )}
                    {r.nota && (
                      <p className="text-sm whitespace-pre-wrap break-words text-muted-foreground [overflow-wrap:anywhere]">
                        Nota: {r.nota}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={ocupada}
                        onClick={() => setEditor({ atual: r })}
                      >
                        <Pencil />
                        Editar
                        <span className="sr-only">
                          {' '}
                          {TIPOS[r.tipo]} das {r.hora}
                        </span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={ocupada}>
                            <Trash2 />
                            Excluir
                            <span className="sr-only">
                              {' '}
                              {TIPOS[r.tipo]} das {r.hora}
                            </span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto">
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Excluir este registro?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {TIPOS[r.tipo]} das {r.hora}: a descrição, a foto
                              e a nota serão removidas definitivamente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Manter</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void excluir(r)}>
                              Excluir registro
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>
      <Dialog
        open={editor !== null}
        onOpenChange={(v) => {
          if (!v && !ocupada) setEditor(null);
        }}
      >
        <DialogContent className="flex max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {editor?.atual ? 'Editar registro' : 'Novo registro'}
            </DialogTitle>
            <DialogDescription>
              Informe o que comeu ou bebeu, ou adicione uma foto. Os demais
              campos são opcionais.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto">
            {editor && (
              <Formulario
                key={editor.atual?.id ?? 'novo'}
                atual={editor.atual}
                hoje={data.hoje}
                corte={data.corte}
                ocupada={ocupada}
                ocupar={setOcupada}
                inicial={
                  editor.atual
                    ? {
                        data: editor.atual.data,
                        hora: editor.atual.hora,
                        tipo: editor.atual.tipo,
                        descricao: editor.atual.descricao,
                        porcao: editor.atual.porcao,
                        percepcao: editor.atual.percepcao,
                        nota: editor.atual.nota,
                      }
                    : {
                        data: data.data,
                        hora:
                          data.data === data.hoje
                            ? horaAgora(data.fuso)
                            : '12:00',
                        tipo: 'almoco',
                        descricao: '',
                        porcao: null,
                        percepcao: null,
                        nota: '',
                      }
                }
                concluido={(m, d) => {
                  setEditor(null);
                  toast.success(m);
                  if (d !== data.data) irPara(d === data.hoje ? null : d);
                  else void refresh();
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
