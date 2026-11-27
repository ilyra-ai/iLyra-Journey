'use client';

import { type FormEvent, useId, useState } from 'react';
import { HeartHandshake, Loader2, Trash2 } from 'lucide-react';

import { SplashScreen } from '@/components/SplashScreen';
import {
  type CidadeEscolhida,
  SeletorDeCidade,
} from '@/components/geo/SeletorDeCidade';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import type { ConexaoDaAlma } from '@/lib/conexoes/sinastria';

type Ocorrencia = 'anterior' | 'posterior';

interface Nascimento {
  data: string;
  hora: string;
  cidade: CidadeEscolhida | null;
  ocorrencia?: Ocorrencia;
}

const VAZIO: Nascimento = { data: '', hora: '', cidade: null };

const corpoDe = (n: Nascimento) => ({
  data: n.data,
  hora: n.hora || null,
  cidadeId: n.cidade?.id ?? null,
  ...(n.ocorrencia ? { ocorrencia: n.ocorrencia } : {}),
});

/** Campos de data, hora e cidade de uma pessoa. */
function CamposDeNascimento({
  prefixo,
  valor,
  aoMudar,
  dataObrigatoria,
}: {
  prefixo: string;
  valor: Nascimento;
  aoMudar: (n: Nascimento) => void;
  dataObrigatoria: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
      <div className="grid min-w-0 gap-1.5">
        <Label htmlFor={`${prefixo}-data`}>Data de nascimento</Label>
        <Input
          id={`${prefixo}-data`}
          type="date"
          // O seletor nativo tem largura mínima própria, que cresce com o
          // texto ampliado: min-w-0 deixa o campo encolher com a coluna.
          className="min-w-0"
          required={dataObrigatoria}
          value={valor.data}
          onChange={(e) =>
            aoMudar({ ...valor, data: e.target.value, ocorrencia: undefined })
          }
        />
      </div>
      <div className="grid min-w-0 gap-1.5">
        <Label htmlFor={`${prefixo}-hora`}>Hora (opcional)</Label>
        <Input
          id={`${prefixo}-hora`}
          type="time"
          className="min-w-0"
          value={valor.hora}
          onChange={(e) =>
            aoMudar({ ...valor, hora: e.target.value, ocorrencia: undefined })
          }
        />
      </div>
      <div className="grid min-w-0 gap-1.5 sm:col-span-2">
        <Label htmlFor={`${prefixo}-cidade`}>
          Cidade de nascimento (opcional)
        </Label>
        <SeletorDeCidade
          id={`${prefixo}-cidade`}
          valor={valor.cidade}
          aoEscolher={(cidade) =>
            aoMudar({ ...valor, cidade, ocorrencia: undefined })
          }
          permitirLimpar
        />
      </div>
    </div>
  );
}

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (!itens.length) return null;
  return (
    <div>
      <p className="font-medium">{titulo}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {itens.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Conexões da Alma (tarefa 166): comparação simbólica entre dois mapas
 * ocidentais. Sessão efêmera: os dados da outra pessoa e a leitura ficam só
 * nesta tela e somem ao sair dela ou ao apagar.
 */
function Conexoes() {
  const id = useId();
  const [apelido, setApelido] = useState('');
  const [outra, setOutra] = useState<Nascimento>(VAZIO);
  const [ajustar, setAjustar] = useState(false);
  const [titular, setTitular] = useState<Nascimento>(VAZIO);
  const [consentimento, setConsentimento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [leitura, setLeitura] = useState<ConexaoDaAlma | null>(null);

  // Horário repetido no fim do horário de verão: a pessoa escolhe qual foi.
  const horarioRepetido = erro?.includes('ocorreu duas vezes') ?? false;
  const repetidoDoTitular = horarioRepetido && erro?.startsWith('Você:');

  async function montar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    if (!consentimento) {
      setErro(
        'Confirme que a outra pessoa compartilhou esses dados com você para esta leitura.'
      );
      return;
    }
    setEnviando(true);
    try {
      const resposta = await fetch('/api/conexoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          outra: { ...corpoDe(outra), apelido: apelido.trim() || undefined },
          ...(ajustar ? { titular: corpoDe(titular) } : {}),
          consentimento: true,
        }),
      });
      const corpo = (await resposta.json().catch(() => null)) as
        (ConexaoDaAlma & { error?: string }) | null;
      if (!resposta.ok || !corpo || !('leituras' in corpo)) {
        setErro(
          corpo?.error ??
            'Não foi possível montar a leitura das Conexões da Alma agora.'
        );
        return;
      }
      setLeitura(corpo);
    } catch {
      setErro('Sem conexão com a Lyra. Confira a internet e tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  function apagar() {
    setLeitura(null);
    setApelido('');
    setOutra(VAZIO);
    setTitular(VAZIO);
    setAjustar(false);
    setConsentimento(false);
    setErro(null);
  }

  function escolherOcorrencia(ocorrencia: Ocorrencia) {
    if (repetidoDoTitular) setTitular((t) => ({ ...t, ocorrencia }));
    else setOutra((o) => ({ ...o, ocorrencia }));
    setErro(null);
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Será que encontrei minha alma gêmea?</CardTitle>
          <CardDescription>
            Compare o seu mapa com o de alguém especial. Com as duas datas, a
            leitura compara os signos do Sol; com data, hora e cidade das duas
            pessoas, compara também Lua, Mercúrio, Vênus e Marte. Nada é
            gravado: a leitura fica só nesta tela.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-[minmax(0,1fr)] gap-5"
            onSubmit={montar}
          >
            <fieldset className="grid min-w-0 gap-3">
              <legend className="text-sm font-medium">A outra pessoa</legend>
              <div className="grid min-w-0 gap-1.5">
                <Label htmlFor={`${id}-apelido`}>
                  Como chamar na leitura (opcional)
                </Label>
                <Input
                  id={`${id}-apelido`}
                  maxLength={40}
                  placeholder="Um apelido basta; não precisa do nome completo"
                  value={apelido}
                  onChange={(e) => setApelido(e.target.value)}
                />
              </div>
              <CamposDeNascimento
                prefixo={`${id}-outra`}
                valor={outra}
                aoMudar={setOutra}
                dataObrigatoria
              />
            </fieldset>

            <fieldset className="grid min-w-0 gap-3">
              <legend className="text-sm font-medium">Você</legend>
              <p className="text-sm text-muted-foreground">
                Usamos a data, a hora e a cidade do seu perfil.
              </p>
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`${id}-ajustar`}
                  checked={ajustar}
                  onCheckedChange={(v) => setAjustar(v === true)}
                />
                <Label htmlFor={`${id}-ajustar`} className="leading-snug">
                  Ajustar os meus dados só para esta leitura (o perfil não muda)
                </Label>
              </div>
              {ajustar ? (
                <CamposDeNascimento
                  prefixo={`${id}-titular`}
                  valor={titular}
                  aoMudar={setTitular}
                  dataObrigatoria
                />
              ) : null}
            </fieldset>

            <div className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Checkbox
                id={`${id}-consentimento`}
                checked={consentimento}
                onCheckedChange={(v) => setConsentimento(v === true)}
              />
              <Label htmlFor={`${id}-consentimento`} className="leading-snug">
                A outra pessoa compartilhou esses dados comigo e sabe que servem
                só para esta leitura simbólica, que não fica gravada.
              </Label>
            </div>

            {erro ? (
              <div role="alert" className="grid gap-2 text-sm">
                <p className="text-destructive">{erro}</p>
                {horarioRepetido ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto min-h-9 whitespace-normal"
                      onClick={() => escolherOcorrencia('anterior')}
                    >
                      Foi a primeira vez (antes de atrasar o relógio)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto min-h-9 whitespace-normal"
                      onClick={() => escolherOcorrencia('posterior')}
                    >
                      Foi a segunda vez (depois de atrasar o relógio)
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div>
              <Button
                type="submit"
                disabled={enviando}
                className="h-auto min-h-10 max-w-full whitespace-normal"
              >
                {enviando ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <HeartHandshake aria-hidden="true" className="size-4" />
                )}
                {leitura ? 'Comparar de novo' : 'Ver a nossa conexão'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {leitura ? (
        <section
          aria-live="polite"
          aria-label="Leitura das Conexões da Alma"
          className="grid grid-cols-[minmax(0,1fr)] gap-4"
        >
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
            {leitura.pessoas.map((p) => (
              <Card key={p.rotulo}>
                <CardHeader>
                  <CardTitle className="text-base">{p.rotulo}</CardTitle>
                  <CardDescription>{p.precisao}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-1 text-sm">
                  <p>
                    <span className="font-medium">Sol:</span>{' '}
                    {p.sol.signo ?? p.sol.possiveis.join(' ou ')}
                  </p>
                  {p.posicoes.slice(1).map((x) => (
                    <p key={x.planeta}>
                      <span className="font-medium">{x.nome}:</span> {x.signo} (
                      {x.grau}°)
                    </p>
                  ))}
                  {p.ascendente ? (
                    <p>
                      <span className="font-medium">Ascendente:</span>{' '}
                      {p.ascendente}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>

          {leitura.avisos.length ? (
            <Card>
              <CardContent className="pt-6 text-sm">
                <Lista titulo="Antes de ler" itens={leitura.avisos} />
              </CardContent>
            </Card>
          ) : null}

          {leitura.leituras.map((l) => (
            <Card key={l.condicao ?? 'unica'}>
              <CardHeader>
                <CardTitle className="text-base">
                  {l.condicao ?? 'O que os signos do Sol sugerem'}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <Lista titulo="Pontos de afinidade" itens={l.afinidades} />
                <Lista
                  titulo="Diferenças de comunicação"
                  itens={l.diferencas}
                />
                <Lista titulo="Possíveis tensões" itens={l.tensoes} />
              </CardContent>
            </Card>
          ))}

          {leitura.aspectos.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Aspectos entre os dois mapas
                </CardTitle>
                <CardDescription>
                  Do mais exato ao mais largo. O orbe é a distância, em graus,
                  até o aspecto exato.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 text-sm">
                  {leitura.aspectos.map((a) => (
                    <li key={`${a.deTitular}-${a.daOutra}-${a.aspecto}`}>
                      {a.texto}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Para conversar</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="list-disc space-y-1 pl-5">
                {leitura.perguntas.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Como ler esta comparação
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Lista titulo="O que foi comparado" itens={leitura.comparado} />
              <Lista
                titulo="O que não foi comparado"
                itens={leitura.naoComparado}
              />
              {leitura.sobre.map((t) => (
                <p key={t} className="text-muted-foreground">
                  {t}
                </p>
              ))}
            </CardContent>
          </Card>

          <div>
            <Button
              type="button"
              variant="outline"
              onClick={apagar}
              className="h-auto min-h-10 max-w-full whitespace-normal"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Apagar esta leitura e os dados da tela
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function ConexoesPage() {
  const { session } = useAuth();
  if (session === undefined) return <SplashScreen />;
  if (!session) return null;
  return (
    <AppShell>
      <PageIntro
        title="Conexões da Alma"
        description="Uma comparação simbólica entre dois mapas, para conversar e refletir. Sem veredito, sem porcentagem e sem adivinhar o que a outra pessoa sente."
      />
      <PlanFeatureGate features={['vedic_insights']}>
        <Conexoes />
      </PlanFeatureGate>
    </AppShell>
  );
}
