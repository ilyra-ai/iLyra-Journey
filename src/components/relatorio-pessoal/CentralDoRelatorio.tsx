'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { PageIntro } from '@/components/layout/PageIntro';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { useAuth } from '@/context/AuthContext';
import { requisitar, erroNaPagina } from '@/components/experiencias/transporte';
import { somarDias } from '@/lib/acontecimentos/analise';
import {
  selecaoSchema,
  CAMPOS_DO_REGISTRO,
  NOMES_DOS_CAMPOS,
  unidadeDoCampo,
  type OpcoesDoRelatorio,
  type Selecao,
  type RelatorioPessoal,
} from '@/lib/relatorio-pessoal/esquema';
import { PreviaDoRelatorio } from './PreviaDoRelatorio';
const carregar = () => requisitar<OpcoesDoRelatorio>('/api/relatorio-pessoal');
function Editor({ opcoes: o }: { opcoes: OpcoesDoRelatorio }) {
  const [p, setP] = useState<Selecao>(() => ({
      inicio:
        o.corte && o.corte > somarDias(o.hoje, -6)
          ? o.corte
          : somarDias(o.hoje, -6),
      fim: o.hoje,
      metricas: [],
      reflexoes: false,
      acontecimentos: false,
      notas: false,
    })),
    [r, setR] = useState<RelatorioPessoal | null>(null),
    [ocupada, setOcupada] = useState(false),
    [erro, setErro] = useState(''),
    [aviso, setAviso] = useState('');
  const foco = useRef(false);
  useEffect(() => {
    if (r && foco.current) {
      document.querySelector<HTMLElement>('[data-previa-relatorio]')?.focus();
      foco.current = false;
    }
  }, [r]);
  function alterar(n: Selecao) {
    setP(n);
    setR(null);
    setErro('');
    setAviso('');
  }
  async function preparar() {
    if (ocupada) return;
    const v = selecaoSchema.safeParse(p);
    if (!v.success) {
      setErro(v.error.issues[0].message);
      return;
    }
    setOcupada(true);
    setErro('');
    setAviso('');
    setR(null);
    try {
      const novo = await requisitar<RelatorioPessoal>(
        '/api/relatorio-pessoal',
        'POST',
        v.data
      );
      foco.current = true;
      setR(novo);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível preparar.');
    } finally {
      setOcupada(false);
    }
  }
  async function baixar() {
    if (!r || ocupada) return;
    setOcupada(true);
    setErro('');
    setAviso('');
    try {
      const resposta = await fetch('/api/relatorio-pessoal/pdf', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selecao: r.selecao, revisao: r.revisao }),
      });
      if (!resposta.ok) {
        const falha = await resposta.json();
        if (resposta.status === 409) setR(null);
        throw new Error(falha.error ?? 'Não foi possível baixar o PDF.');
      }
      const blob = await resposta.blob();
      if (blob.type !== 'application/pdf')
        throw new Error('A resposta não contém um PDF.');
      const url = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = url;
      a.download = `lyra-pessoal-${r.selecao.inicio}-${r.selecao.fim}.pdf`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setAviso(
        'PDF preparado para download. Revise o arquivo antes de compartilhar.'
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível baixar.');
    } finally {
      setOcupada(false);
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageIntro
        title="Meu relatório pessoal"
        description="Escolha o que incluir, confira a prévia e baixe seu PDF para compartilhar por sua própria decisão."
      />
      <Card>
        <CardHeader>
          <CardTitle>Seu recorte</CardTitle>
          <CardDescription>
            Até 90 dias por arquivo, dentro do histórico do plano. Fuso:{' '}
            {o.fuso}. Nenhum conteúdo é selecionado automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              void preparar();
            }}
          >
            <fieldset disabled={ocupada} className="min-w-0">
              <legend className="sr-only">
                Período e conteúdo do relatório
              </legend>
              <FieldGroup>
                <div className="grid gap-4 @md/relatorio:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="relatorio-inicio">
                      Data inicial
                    </FieldLabel>
                    <Input
                      id="relatorio-inicio"
                      type="date"
                      min={o.corte ?? undefined}
                      max={o.hoje}
                      required
                      value={p.inicio}
                      onChange={(e) =>
                        alterar({ ...p, inicio: e.target.value })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="relatorio-fim">Data final</FieldLabel>
                    <Input
                      id="relatorio-fim"
                      type="date"
                      min={p.inicio}
                      max={o.hoje}
                      required
                      value={p.fim}
                      onChange={(e) => alterar({ ...p, fim: e.target.value })}
                    />
                  </Field>
                </div>
                <fieldset className="min-w-0">
                  <legend className="mb-3 font-medium">
                    Registros numéricos consolidados
                  </legend>
                  {o.metricas ? (
                    <div className="grid min-w-0 gap-3 @lg/relatorio:grid-cols-2">
                      {NOMES_DOS_CAMPOS.map((m) => (
                        <Field key={m} orientation="horizontal">
                          <Checkbox
                            className="size-6 after:-inset-1"
                            id={'relatorio-' + m}
                            checked={p.metricas.includes(m)}
                            onCheckedChange={(v) =>
                              alterar({
                                ...p,
                                metricas:
                                  v === true
                                    ? [...p.metricas, m]
                                    : p.metricas.filter((c) => c !== m),
                              })
                            }
                          />
                          <FieldLabel htmlFor={'relatorio-' + m}>
                            {CAMPOS_DO_REGISTRO[m].rotulo} ({unidadeDoCampo(m)})
                          </FieldLabel>
                        </Field>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Registros numéricos não disponíveis no plano atual.
                    </p>
                  )}
                </fieldset>
                <fieldset className="flex min-w-0 flex-col gap-3">
                  <legend className="mb-3 font-medium">Relatos pessoais</legend>
                  {o.reflexoes && (
                    <Field orientation="horizontal">
                      <Checkbox
                        className="size-6 after:-inset-1"
                        id="relatorio-reflexoes"
                        checked={p.reflexoes}
                        onCheckedChange={(v) =>
                          alterar({ ...p, reflexoes: v === true })
                        }
                      />
                      <FieldLabel htmlFor="relatorio-reflexoes">
                        Reflexões da noite e escalas pessoais
                      </FieldLabel>
                    </Field>
                  )}
                  {o.acontecimentos && (
                    <Field orientation="horizontal">
                      <Checkbox
                        className="size-6 after:-inset-1"
                        id="relatorio-acontecimentos"
                        checked={p.acontecimentos}
                        onCheckedChange={(v) =>
                          alterar({ ...p, acontecimentos: v === true })
                        }
                      />
                      <FieldLabel htmlFor="relatorio-acontecimentos">
                        Acontecimentos e marcadores pessoais
                      </FieldLabel>
                    </Field>
                  )}
                  <Field orientation="horizontal">
                    <Checkbox
                      className="size-6 after:-inset-1"
                      id="relatorio-notas"
                      checked={p.notas}
                      onCheckedChange={(v) =>
                        alterar({ ...p, notas: v === true })
                      }
                    />
                    <FieldLabel htmlFor="relatorio-notas">
                      Incluir também as notas das categorias selecionadas
                    </FieldLabel>
                  </Field>
                </fieldset>
              </FieldGroup>
            </fieldset>
            <p className="text-sm text-muted-foreground">
              Conversas não entram neste relatório. Sem envio automático,
              destinatário cadastrado ou link público. Nenhuma seleção altera
              seus registros.
            </p>
            <Button type="submit" disabled={ocupada}>
              <FileText />
              {ocupada ? 'Preparando…' : 'Preparar prévia'}
            </Button>
          </form>
        </CardContent>
      </Card>
      {erro && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível concluir</AlertTitle>
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}
      {aviso && (
        <p role="status" className="text-sm">
          {aviso}
        </p>
      )}
      {r && (
        <>
          <PreviaDoRelatorio relatorio={r} />
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Confira acima o período, as categorias e as notas. O PDF conterá
              estes dados; se forem alterados, será necessário preparar uma nova
              prévia. Glifos sem cobertura na fonte são representados por código
              Unicode no PDF, com texto acessível preservado.
            </p>
            <Button disabled={ocupada} onClick={() => void baixar()}>
              <Download />
              {ocupada ? 'Gerando PDF…' : 'Baixar PDF revisado'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
export function CentralDoRelatorio() {
  const { session } = useAuth(),
    { data, error, loading, refresh } =
      useKeyedResource<OpcoesDoRelatorio | null>(
        session?.user.id ?? null,
        carregar,
        erroNaPagina,
        null
      );
  if (error)
    return (
      <Alert variant="destructive">
        <AlertTitle>Não foi possível carregar o relatório</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Tente novamente.'}
          <Button variant="outline" onClick={() => void refresh()}>
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  if (loading || !data) return <Skeleton className="h-48 rounded-xl" />;
  return <Editor key={JSON.stringify(data)} opcoes={data} />;
}
