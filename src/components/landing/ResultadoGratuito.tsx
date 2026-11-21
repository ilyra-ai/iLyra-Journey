'use client';

import { type FormEvent, useId, useState } from 'react';
import Link from 'next/link';
import { Loader2, MessageCircle, Sparkles } from 'lucide-react';

import type { RespostaAoVisitante } from '@/lib/descoberta/microconversa';
import type { DescobertaDoVisitante } from '@/lib/descoberta/visitante';

interface Props {
  descoberta: DescobertaDoVisitante;
  destinoDaAssinatura: string;
  classeDoBotaoPrincipal: string;
  aoRefazer: () => void;
}

type Conversa =
  | { fase: 'vazia' }
  | { fase: 'perguntando' }
  | { fase: 'respondida'; pergunta: string; resposta: RespostaAoVisitante }
  | { fase: 'erro'; mensagem: string };

function dataPorExtenso(data: string) {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

/**
 * Resultado do Experimente Grátis (tarefas 157 e 158): leitura solar com a
 * voz do Motor Lyra, reflexão do dia, a origem de cada trecho e uma
 * microconversa pela base curada. A pergunta e a resposta vivem só neste
 * componente: somem ao fechar o modal ou refazer a leitura.
 */
export function ResultadoGratuito({
  descoberta,
  destinoDaAssinatura,
  classeDoBotaoPrincipal,
  aoRefazer,
}: Props) {
  const id = useId();
  const { gratuita, leitura } = descoberta;
  const [pergunta, setPergunta] = useState('');
  const [conversa, setConversa] = useState<Conversa>({ fase: 'vazia' });

  async function perguntar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const texto = pergunta.trim();
    if (texto.length < 3) return;
    setConversa({ fase: 'perguntando' });
    try {
      const resposta = await fetch('/api/public/descoberta/pergunta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        cache: 'no-store',
        credentials: 'omit',
        body: JSON.stringify({ pergunta: texto }),
      });
      const corpo = (await resposta.json().catch(() => null)) as
        RespostaAoVisitante | { error?: string } | null;
      if (!resposta.ok || !corpo || !('texto' in corpo)) {
        setConversa({
          fase: 'erro',
          mensagem:
            (corpo && 'error' in corpo && corpo.error) ||
            'Não foi possível responder agora. Tente novamente.',
        });
        return;
      }
      setConversa({ fase: 'respondida', pergunta: texto, resposta: corpo });
      setPergunta('');
    } catch {
      setConversa({
        fase: 'erro',
        mensagem:
          'Sem conexão com a Lyra. Confira a internet e tente novamente.',
      });
    }
  }

  return (
    <section aria-live="polite" className="grid gap-4">
      <div className="grid gap-2">
        <h3 className="text-lg font-semibold text-foreground">
          {gratuita.signo
            ? `${gratuita.simbolo} Sol em ${gratuita.signo} · zodíaco tropical`
            : 'Seu mapa ocidental · zodíaco tropical'}
        </h3>
        <p className="leading-relaxed">{leitura.resumo}</p>
        {gratuita.natureza ? (
          <p className="leading-relaxed text-muted-foreground">
            {gratuita.natureza}
          </p>
        ) : null}
      </div>

      {gratuita.forcas.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <h4 className="font-medium">Forças para explorar</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {gratuita.forcas.map((forca) => (
                <li key={forca}>{forca}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium">Pontos de atenção</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {gratuita.atencao.map((ponto) => (
                <li key={ponto}>{ponto}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {gratuita.pergunta ? (
        <p className="rounded-lg border border-border bg-muted/40 p-3 italic">
          {gratuita.pergunta}
        </p>
      ) : null}

      <div className="grid gap-1">
        <h4 className="font-medium">
          Reflexão do dia · {dataPorExtenso(gratuita.reflexaoDoDia.data)}
        </h4>
        <p className="text-sm leading-relaxed">
          {gratuita.reflexaoDoDia.texto}
        </p>
      </div>

      <div className="grid gap-1">
        <p className="text-sm font-medium">
          Só com a data, esta leitura não inclui:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {leitura.limites
            .filter((limite) => !limite.endsWith('.'))
            .map((limite) => (
              <li key={limite}>{limite}</li>
            ))}
        </ul>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-medium">
          Por que estas frases?
        </summary>
        <dl className="mt-2 grid gap-2 text-muted-foreground">
          {gratuita.origens.map((origem) => (
            <div key={origem.trecho}>
              <dt className="font-medium text-foreground">{origem.trecho}</dt>
              <dd>{origem.origem}</dd>
            </div>
          ))}
        </dl>
      </details>

      <form className="grid gap-2" onSubmit={perguntar}>
        <label
          htmlFor={`${id}-pergunta`}
          className="flex items-center gap-2 font-medium"
        >
          <MessageCircle aria-hidden="true" className="size-4" />
          Pergunte à Lyra
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={`${id}-pergunta`}
            name="pergunta"
            autoComplete="off"
            maxLength={300}
            placeholder="Ex.: o que é o zodíaco tropical?"
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3"
          />
          <button
            type="submit"
            disabled={
              conversa.fase === 'perguntando' || pergunta.trim().length < 3
            }
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 disabled:opacity-60"
          >
            {conversa.fase === 'perguntando' ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : null}
            Perguntar
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Na versão gratuita a Lyra responde pela base curada dela, sem modelo
          de IA. A pergunta não é gravada.
        </p>
        {conversa.fase === 'respondida' ? (
          <div className="grid gap-1 rounded-lg border border-border p-3 text-sm">
            <p className="font-medium">{conversa.pergunta}</p>
            <p className="whitespace-pre-line leading-relaxed">
              {conversa.resposta.texto}
            </p>
            <p className="text-xs text-muted-foreground">
              {conversa.resposta.origem}
            </p>
          </div>
        ) : null}
        {conversa.fase === 'erro' ? (
          <p role="alert" className="text-sm text-destructive">
            {conversa.mensagem}
          </p>
        ) : null}
      </form>

      <p className="text-sm text-muted-foreground">
        Interpretação simbólica para reflexão, sem diagnóstico nem previsão.
        Seus dados não foram gravados.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href={destinoDaAssinatura} className={classeDoBotaoPrincipal}>
          <Sparkles aria-hidden="true" className="size-4" />
          Conhecer os quatro mapas
        </Link>
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-md border border-border px-4"
          onClick={aoRefazer}
        >
          Fazer outra leitura
        </button>
      </div>
    </section>
  );
}
