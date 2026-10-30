'use client';
import { useId } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import {
  type RelatorioPessoal,
  CAMPOS_DO_REGISTRO,
  unidadeDoCampo,
} from '@/lib/relatorio-pessoal/esquema';
import { dataBreve } from '@/components/acontecimentos/GraficoDosAcontecimentos';
const numero = (v: number | null | undefined) =>
  v === null || v === undefined
    ? 'Sem registro'
    : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v);
export function PreviaDoRelatorio({
  relatorio: r,
}: {
  relatorio: RelatorioPessoal;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-6">
      <h2
        id={id}
        tabIndex={-1}
        data-previa-relatorio
        className="text-2xl font-semibold focus-visible:outline-2 focus-visible:outline-ring"
      >
        Prévia do seu relatório
      </h2>
      <Card>
        <CardHeader>
          <CardTitle>
            {dataBreve(r.selecao.inicio)} a {dataBreve(r.selecao.fim)}
          </CardTitle>
          <CardDescription>
            {r.dias.length} dias · Fuso: {r.fuso}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p>
            Somente as categorias selecionadas. Conversas e identificação de
            terceiros não são consultadas.{' '}
            {r.selecao.notas
              ? 'Notas pessoais incluídas por sua escolha.'
              : 'Notas pessoais excluídas.'}
          </p>
          <p>
            Os registros numéricos consolidados podem ser manuais ou importados;
            não inferimos dispositivo de origem. Relatos e síntese descritiva
            aparecem separados. Não há diagnóstico ou avaliação por modelo de
            IA.
          </p>
          <p>
            Sem registro não significa zero. Medianas usam somente valores
            válidos disponíveis. Os dias ausentes continuam na tabela.
          </p>
        </CardContent>
      </Card>
      <div className="grid min-w-0 gap-4 @xl/relatorio:grid-cols-2">
        {r.resumos.map((s) => (
          <Card key={s.campo}>
            <CardHeader>
              <CardTitle>{s.nome}</CardTitle>
              <CardDescription>
                Síntese descritiva local · {s.unidade}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-2xl font-semibold">
                {numero(s.mediana)}
                {s.mediana === null ? '' : ' ' + s.unidade}
              </p>
              <p className="text-sm text-muted-foreground">
                Mediana de {s.n} dias com valor válido. {s.ausentes} dias sem
                registro válido. Mínimo {numero(s.minimo)}; máximo{' '}
                {numero(s.maximo)}.
              </p>
              {s.n > 0 && (
                <svg
                  viewBox="0 0 480 110"
                  role="img"
                  aria-label={`${s.nome}: pontos dos valores disponíveis entre ${dataBreve(r.selecao.inicio)} e ${dataBreve(r.selecao.fim)}; lacunas sem ponto. Valores completos na tabela.`}
                  className="h-28 w-full"
                >
                  <line
                    x1="20"
                    x2="460"
                    y1="90"
                    y2="90"
                    stroke="hsl(var(--border))"
                  />
                  {r.dias.map((d, i) => {
                    const v = d.valores[s.campo];
                    if (v === null || v === undefined) return null;
                    return (
                      <circle
                        key={d.data}
                        cx={20 + (i * 440) / Math.max(1, r.dias.length - 1)}
                        cy={
                          s.maximo === s.minimo
                            ? 50
                            : 90 -
                              ((v - s.minimo!) * 80) / (s.maximo! - s.minimo!)
                        }
                        r="3"
                        fill="hsl(var(--primary))"
                      >
                        <title>
                          {dataBreve(d.data)}: {numero(v)} {s.unidade}
                        </title>
                      </circle>
                    );
                  })}
                </svg>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {r.selecao.metricas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Registros numéricos consolidados</CardTitle>
            <CardDescription>
              Fonte: registros diários do aplicativo, nas datas originais.
              Valores fora das faixas aceitas não são usados.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <Table scrollLabel="Valores diários selecionados para o relatório">
              <TableCaption>
                Sem preenchimento de lacunas ou deslocamento de datas para
                relacionar acontecimentos e sono.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  {r.selecao.metricas.map((m) => (
                    <TableHead key={m}>
                      {CAMPOS_DO_REGISTRO[m].rotulo} ({unidadeDoCampo(m)})
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.dias.map((d) => (
                  <TableRow key={d.data}>
                    <TableCell className="whitespace-nowrap">
                      {dataBreve(d.data)}
                    </TableCell>
                    {r.selecao.metricas.map((m) => (
                      <TableCell key={m}>{numero(d.valores[m])}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {(r.selecao.reflexoes || r.selecao.acontecimentos) && (
        <Card>
          <CardHeader>
            <CardTitle>Relatos pessoais</CardTitle>
            <CardDescription>
              Reflexão da noite e diário de acontecimentos, conforme sua
              seleção. Escalas pessoais não são medições clínicas.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {r.dias.map((d) => (
              <article
                key={d.data}
                className="min-w-0 rounded-xl border border-border p-4 text-sm [overflow-wrap:anywhere]"
              >
                <h3 className="mb-2 font-semibold">{dataBreve(d.data)}</h3>
                {r.selecao.reflexoes && (
                  <div className="mb-3 flex flex-col gap-2">
                    <p>
                      {d.reflexao
                        ? `Reflexão: emocional ${d.reflexao.emocional}/5; corpo ${d.reflexao.corpo}/5; espiritual ${d.reflexao.espiritual}/5.`
                        : 'Sem reflexão registrada.'}
                    </p>
                    {d.reflexao && r.selecao.notas && (
                      <p className="whitespace-pre-wrap">
                        {d.reflexao.nota || 'Sem nota da reflexão.'}
                      </p>
                    )}
                  </div>
                )}
                {r.selecao.acontecimentos && (
                  <div className="flex flex-col gap-2">
                    <p>
                      {d.acontecimentos
                        ? `${d.acontecimentos.revisado ? 'Dia revisado.' : 'Revisão pendente de confirmação.'} Marcadores: ${d.acontecimentos.marcadores.length ? d.acontecimentos.marcadores.join('; ') : d.acontecimentos.revisado ? 'nenhum informado' : 'desconhecidos'}.`
                        : 'Dia sem revisão de acontecimentos.'}
                    </p>
                    {d.acontecimentos && r.selecao.notas && (
                      <p className="whitespace-pre-wrap">
                        {d.acontecimentos.nota ||
                          'Sem nota dos acontecimentos.'}
                      </p>
                    )}
                  </div>
                )}
              </article>
            ))}
          </CardContent>
        </Card>
      )}
      {r.acompanhamentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Acompanhamentos pessoais</CardTitle>
            <CardDescription>
              Respostas dadas por você, cada uma com o rótulo e a escala em que
              foi respondida. Relatos pessoais, não medições clínicas. Períodos
              sem resposta não aparecem e não significam zero.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {r.acompanhamentos.map((a) => (
              <section
                key={a.id}
                aria-labelledby={`${id}-${a.id}`}
                className="flex min-w-0 flex-col gap-2"
              >
                <h3
                  id={`${id}-${a.id}`}
                  className="font-semibold break-words [overflow-wrap:anywhere]"
                >
                  {a.nome}
                  {a.arquivado ? ' (arquivado)' : ''} · {a.respostas.length}{' '}
                  {a.respostas.length === 1 ? 'resposta' : 'respostas'}
                </h3>
                {a.respostas.length ? (
                  <Table scrollLabel={`Respostas de ${a.nome}`}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead>Resposta</TableHead>
                        <TableHead>Escala</TableHead>
                        {r.selecao.notas && <TableHead>Nota</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {a.respostas.map((x) => (
                        <TableRow key={x.data}>
                          <TableCell className="whitespace-nowrap">
                            {x.frequencia === 'semanal'
                              ? `Semana de ${dataBreve(x.data)}`
                              : dataBreve(x.data)}
                          </TableCell>
                          <TableCell>{x.rotulo}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {x.escala}
                          </TableCell>
                          {r.selecao.notas && (
                            <TableCell className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                              {x.nota || 'Sem nota.'}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma resposta neste período.
                  </p>
                )}
              </section>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
