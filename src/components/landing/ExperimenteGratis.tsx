'use client';

import { type FormEvent, useId, useState } from 'react';
import Link from 'next/link';
import { Loader2, Sparkles } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DescobertaDoVisitante } from '@/lib/descoberta/visitante';

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  /** Destino de quem quer os outros três mapas (cadastro ou planos). */
  destinoDaAssinatura: string;
  /**
   * Botão principal da landing (dourado celestial). O diálogo abre num
   * portal fora da página e não herda os estilos dela.
   */
  classeDoBotaoPrincipal: string;
}

type Estado =
  | { fase: 'formulario'; erro: string | null }
  | { fase: 'calculando' }
  | { fase: 'resultado'; descoberta: DescobertaDoVisitante };

function hojeLocal() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/**
 * Experimente Grátis (tarefa 157, regras da 155): nome completo e data de
 * nascimento só na memória desta janela, enviados no corpo de um POST e
 * nunca gravados (nada de localStorage, cookie ou URL). Fechar a janela
 * apaga tudo, para a próxima pessoa no mesmo aparelho começar do zero. O
 * modal fecha só pelo X: clique fora e Escape não dispensam a experiência.
 */
export function ExperimenteGratis({
  aberto,
  aoFechar,
  destinoDaAssinatura,
  classeDoBotaoPrincipal,
}: Props) {
  const id = useId();
  const [nome, setNome] = useState('');
  const [data, setData] = useState('');
  const [estado, setEstado] = useState<Estado>({
    fase: 'formulario',
    erro: null,
  });

  function fechar() {
    setNome('');
    setData('');
    setEstado({ fase: 'formulario', erro: null });
    aoFechar();
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEstado({ fase: 'calculando' });
    try {
      const resposta = await fetch('/api/public/descoberta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        cache: 'no-store',
        credentials: 'omit',
        body: JSON.stringify({ nome, dataDeNascimento: data }),
      });
      const corpo = (await resposta.json().catch(() => null)) as
        DescobertaDoVisitante | { error?: string } | null;
      if (!resposta.ok || !corpo || !('leitura' in corpo)) {
        setEstado({
          fase: 'formulario',
          erro:
            (corpo && 'error' in corpo && corpo.error) ||
            'Não foi possível calcular a leitura agora. Tente novamente.',
        });
        return;
      }
      setEstado({ fase: 'resultado', descoberta: corpo });
    } catch {
      setEstado({
        fase: 'formulario',
        erro: 'Sem conexão com a Lyra. Confira a internet e tente novamente.',
      });
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(abrir) => {
        if (!abrir) fechar();
      }}
    >
      <DialogContent
        className="max-w-[640px]"
        onInteractOutside={(evento) => evento.preventDefault()}
        onEscapeKeyDown={(evento) => evento.preventDefault()}
      >
        <DialogTitle className="pr-10 font-serif text-2xl">
          {estado.fase === 'resultado'
            ? `Olá, ${estado.descoberta.primeiroNome}`
            : 'Experimente a Lyra grátis'}
        </DialogTitle>
        <DialogDescription>
          O gratuito inclui somente o{' '}
          <strong>mapa astrológico tradicional ocidental</strong>. Os mapas
          Védico, Lyra DM Samādhi e Quantum fazem parte da assinatura.
        </DialogDescription>

        {estado.fase === 'resultado' ? (
          <section aria-live="polite" className="grid gap-3">
            <h3 className="text-lg font-semibold text-foreground">
              Seu mapa ocidental · zodíaco tropical
            </h3>
            <p className="leading-relaxed">
              {estado.descoberta.leitura.resumo}
            </p>
            {/* Os limites do motor: itens curtos (o que falta calcular) e
                frases com ponto final (o alcance da leitura). */}
            <p className="text-sm font-medium">
              Só com a data, esta leitura não inclui:
            </p>
            <ul className="-mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {estado.descoberta.leitura.limites
                .filter((limite) => !limite.endsWith('.'))
                .map((limite) => (
                  <li key={limite}>{limite}</li>
                ))}
            </ul>
            {estado.descoberta.leitura.limites
              .filter((limite) => limite.endsWith('.'))
              .map((limite) => (
                <p key={limite} className="text-sm text-muted-foreground">
                  {limite}
                </p>
              ))}
            <p className="text-sm text-muted-foreground">
              Interpretação simbólica para reflexão, sem diagnóstico nem
              previsão. Seus dados não foram gravados.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href={destinoDaAssinatura}
                className={classeDoBotaoPrincipal}
              >
                <Sparkles aria-hidden="true" className="size-4" />
                Conhecer os quatro mapas
              </Link>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-md border border-border px-4"
                onClick={() => {
                  setNome('');
                  setData('');
                  setEstado({ fase: 'formulario', erro: null });
                }}
              >
                Fazer outra leitura
              </button>
            </div>
          </section>
        ) : (
          <form className="grid gap-4" onSubmit={enviar} noValidate>
            <div className="grid gap-1.5">
              <label htmlFor={`${id}-nome`} className="font-medium">
                Nome completo
              </label>
              <input
                id={`${id}-nome`}
                name="nome"
                autoComplete="off"
                required
                minLength={2}
                maxLength={120}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="min-h-11 rounded-md border border-input bg-background px-3"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor={`${id}-data`} className="font-medium">
                Data de nascimento
              </label>
              <input
                id={`${id}-data`}
                name="dataDeNascimento"
                type="date"
                autoComplete="off"
                required
                min="1900-01-01"
                max={hojeLocal()}
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="min-h-11 rounded-md border border-input bg-background px-3"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Para quem tem 13 anos ou mais. Seu nome e sua data servem só para
              esta leitura e não são gravados.
            </p>
            {estado.fase === 'formulario' && estado.erro ? (
              <p role="alert" className="text-sm text-destructive">
                {estado.erro}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={estado.fase === 'calculando' || !nome || !data}
              className={`${classeDoBotaoPrincipal} disabled:opacity-60`}
            >
              {estado.fase === 'calculando' ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Sparkles aria-hidden="true" className="size-4" />
              )}
              {estado.fase === 'calculando'
                ? 'Calculando seu mapa…'
                : 'Ver meu mapa ocidental'}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
