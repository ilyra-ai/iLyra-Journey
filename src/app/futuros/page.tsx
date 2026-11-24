'use client';

import { type FormEvent, useId, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { SplashScreen } from '@/components/SplashScreen';
import { AppShell } from '@/components/layout/AppShell';
import { PageIntro } from '@/components/layout/PageIntro';
import { PlanFeatureGate } from '@/components/subscription/PlanFeatureGate';
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
import { useAuth } from '@/context/AuthContext';
import {
  HORIZONTES,
  type Horizonte,
  type PremissasDoTeatro,
  type TeatroDosFuturos,
} from '@/lib/futuros/teatro';

interface Versao {
  numero: number;
  premissas: PremissasDoTeatro;
  teatro: TeatroDosFuturos;
}

const VAZIO: PremissasDoTeatro = {
  duvida: '',
  horizonte: '1a',
  caminhos: [
    { titulo: '', passo: '' },
    { titulo: '', passo: '' },
    { titulo: '', passo: '' },
  ],
};

/** O que mudou entre duas versões das premissas, para a trilha de hipóteses. */
function mudancas(antes: PremissasDoTeatro, depois: PremissasDoTeatro) {
  const lista: string[] = [];
  if (antes.duvida !== depois.duvida) lista.push('a dúvida');
  if (antes.horizonte !== depois.horizonte)
    lista.push(`o horizonte (agora ${HORIZONTES[depois.horizonte].rotulo})`);
  depois.caminhos.forEach((c, i) => {
    if (
      c.titulo !== antes.caminhos[i].titulo ||
      c.passo !== antes.caminhos[i].passo
    )
      lista.push(`o caminho ${i + 1}`);
  });
  return lista.length ? `Mudou ${lista.join(', ')}.` : 'Nada mudou.';
}

/**
 * Teatro dos Futuros Revisáveis (tarefa 189): três histórias hipotéticas a
 * partir de caminhos que a própria pessoa escreve. Sessão efêmera: as
 * versões ficam só nesta tela e somem ao sair dela.
 */
function Teatro() {
  const id = useId();
  const [premissas, setPremissas] = useState<PremissasDoTeatro>(VAZIO);
  const [versoes, setVersoes] = useState<Versao[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const atual = versoes.at(-1) ?? null;

  function mudarCaminho(i: number, campo: 'titulo' | 'passo', valor: string) {
    setPremissas((p) => ({
      ...p,
      caminhos: p.caminhos.map((c, j) =>
        j === i ? { ...c, [campo]: valor } : c
      ),
    }));
  }

  async function montar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await fetch('/api/futuros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify(premissas),
      });
      const corpo = (await resposta.json().catch(() => null)) as
        (TeatroDosFuturos & { error?: string }) | null;
      if (!resposta.ok || !corpo || !('ramos' in corpo)) {
        setErro(corpo?.error ?? 'Não foi possível montar o Teatro agora.');
        return;
      }
      setVersoes((v) => [
        ...v,
        { numero: v.length + 1, premissas, teatro: corpo },
      ]);
    } catch {
      setErro('Sem conexão com a Lyra. Confira a internet e tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Suas premissas</CardTitle>
          <CardDescription>
            Você escreve a dúvida e três caminhos. A Lyra conta uma história
            possível para cada um, sem prever nada. Nada é gravado: as versões
            ficam só nesta tela.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            // minmax(0, 1fr) e min-w-0: sem eles, o texto ampliado a 200%
            // alarga a coluna e o fieldset (largura mínima = conteúdo).
            className="grid grid-cols-[minmax(0,1fr)] gap-4"
            onSubmit={montar}
          >
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-duvida`}>Sua dúvida</Label>
              <Input
                id={`${id}-duvida`}
                maxLength={200}
                required
                value={premissas.duvida}
                onChange={(e) =>
                  setPremissas((p) => ({ ...p, duvida: e.target.value }))
                }
              />
            </div>
            <fieldset className="grid min-w-0 gap-2">
              <legend className="text-sm font-medium">Horizonte</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(HORIZONTES) as Horizonte[]).map((h) => (
                  <label
                    key={h}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm has-[:checked]:border-primary"
                  >
                    <input
                      type="radio"
                      name={`${id}-horizonte`}
                      checked={premissas.horizonte === h}
                      onChange={() =>
                        setPremissas((p) => ({ ...p, horizonte: h }))
                      }
                      className="accent-primary"
                    />
                    {HORIZONTES[h].rotulo}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-3">
              {premissas.caminhos.map((c, i) => (
                <fieldset
                  key={i}
                  className="grid min-w-0 gap-2 rounded-lg border border-border p-3"
                >
                  <legend className="px-1 text-sm font-medium">
                    Caminho {i + 1}
                  </legend>
                  <Label htmlFor={`${id}-t${i}`}>Nome do caminho</Label>
                  <Input
                    id={`${id}-t${i}`}
                    maxLength={60}
                    required
                    value={c.titulo}
                    onChange={(e) => mudarCaminho(i, 'titulo', e.target.value)}
                  />
                  <Label htmlFor={`${id}-p${i}`}>Primeiro passo</Label>
                  <Input
                    id={`${id}-p${i}`}
                    maxLength={200}
                    required
                    value={c.passo}
                    onChange={(e) => mudarCaminho(i, 'passo', e.target.value)}
                  />
                </fieldset>
              ))}
            </div>
            {erro ? (
              <p role="alert" className="text-sm text-destructive">
                {erro}
              </p>
            ) : null}
            <div>
              <Button
                type="submit"
                disabled={enviando}
                className="h-auto min-h-10 max-w-full whitespace-normal"
              >
                {enviando ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : null}
                {atual ? 'Montar nova versão' : 'Montar as três histórias'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {atual ? (
        <section aria-live="polite" className="grid gap-4">
          <p className="w-fit rounded-md border border-warning/40 bg-warning-light px-3 py-1 text-sm font-semibold text-warning">
            {atual.teatro.aviso} · versão {atual.numero}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Fatos do seu mapa (calculados)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                {atual.teatro.fatos.map((f) => (
                  <p key={f.rotulo}>
                    <span className="font-medium">{f.rotulo}:</span> {f.texto}
                  </p>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Símbolos da tradição
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                {atual.teatro.simbolos.length ? (
                  atual.teatro.simbolos.map((s) => (
                    <p key={s.rotulo}>
                      <span className="font-medium">{s.rotulo}:</span> {s.texto}
                    </p>
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    Sem período calculado, sem símbolo do período.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {atual.teatro.ramos.map((r) => (
              <Card key={r.id}>
                <CardHeader>
                  <CardTitle className="text-base">{r.titulo}</CardTitle>
                  <CardDescription>
                    História hipotética (ficção), não previsão
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  {r.historia.map((cena) => (
                    <p key={cena} className="leading-relaxed">
                      {cena}
                    </p>
                  ))}
                  <div>
                    <p className="font-medium">Para comparar</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {r.perguntas.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {versoes.length > 1 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trilha de hipóteses</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="grid gap-1 text-sm">
                  {versoes.map((v, i) => (
                    <li key={v.numero}>
                      Versão {v.numero}:{' '}
                      {i === 0
                        ? 'primeiras premissas.'
                        : mudancas(versoes[i - 1].premissas, v.premissas)}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export default function FuturosPage() {
  const { session } = useAuth();
  if (session === undefined) return <SplashScreen />;
  if (!session) return null;
  return (
    <AppShell>
      <PageIntro
        title="Teatro dos Futuros"
        description="Três histórias hipotéticas a partir de caminhos que você escreve. Para refletir e comparar, nunca para prever."
      />
      <PlanFeatureGate features={['vedic_insights']}>
        <Teatro />
      </PlanFeatureGate>
    </AppShell>
  );
}
