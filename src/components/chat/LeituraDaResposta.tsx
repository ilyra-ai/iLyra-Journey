'use client';
import { useEffect, useId, useSyncExternalStore, type RefObject } from 'react';
import { Volume2, Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { textoDaResposta } from '@/lib/voz/texto';
import {
  LEITURA_INICIAL,
  assinarLeitura,
  estadoDaLeitura,
  iniciarLeituraDaResposta,
  interromperLeituraDoChat,
  pararLeituraDaResposta,
  pausarLeitura,
  retomarLeitura,
  mudarVelocidade,
} from '@/lib/voz/controlador';
const servidor = () => LEITURA_INICIAL;
export function LeituraDaResposta({
  conteudo,
  className,
}: {
  conteudo: RefObject<HTMLDivElement | null>;
  className: string;
}) {
  const id = useId(),
    titulo = useId(),
    velocidadeId = useId(),
    s = useSyncExternalStore(assinarLeitura, estadoDaLeitura, servidor),
    ativa = s.id === id;
  useEffect(() => () => pararLeituraDaResposta(id), [id]);
  const lendo = ativa && (s.estado === 'lendo' || s.estado === 'preparando'),
    pausada = ativa && s.estado === 'pausada';
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={className}
          aria-label={
            lendo
              ? 'Controles da leitura da resposta da Lyra'
              : 'Ouvir a resposta da Lyra'
          }
        >
          <Volume2 className="size-3.5" aria-hidden="true" />
          <span>{lendo ? 'Lendo…' : 'Ouvir'}</span>
        </button>
      </DialogTrigger>
      <DialogContent
        aria-modal="true"
        aria-labelledby={titulo}
        className="max-h-[calc(100%-2rem)] max-w-sm grid-cols-[minmax(0,1fr)] gap-3"
      >
        <DialogTitle id={titulo}>Ouvir esta resposta</DialogTitle>
        <DialogDescription>
          Usa a voz local em português do dispositivo. O texto não é enviado a
          um serviço de voz externo. Blocos de código e endereços de links ficam
          no texto.
        </DialogDescription>
        <p className="break-words text-xs text-muted-foreground">
          {s.sessaoAlterada
            ? 'Sua conta foi alterada em outra aba. Atualize esta página antes de ouvir.'
            : s.disponivel
              ? `Voz: ${s.voz} (${s.idioma}).`
              : 'Nenhuma voz local em português disponível neste navegador. Verifique as vozes instaladas no dispositivo.'}
        </p>
        <div className="flex flex-col gap-1">
          <Label htmlFor={velocidadeId}>Velocidade da leitura</Label>
          <select
            id={velocidadeId}
            value={s.velocidade}
            onChange={(e) => mudarVelocidade(Number(e.target.value))}
            className="h-11 rounded-md border border-input bg-background px-3 text-base"
          >
            {[0.75, 1, 1.25, 1.5, 2].map((v) => (
              <option key={v} value={v}>
                {v.toLocaleString('pt-BR')}×
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {lendo ? (
            <Button type="button" variant="outline" onClick={pausarLeitura}>
              <Pause data-icon="inline-start" />
              Pausar leitura
            </Button>
          ) : pausada ? (
            <Button type="button" onClick={retomarLeitura}>
              <Play data-icon="inline-start" />
              Retomar leitura
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!s.disponivel}
              onClick={() => {
                if (conteudo.current)
                  iniciarLeituraDaResposta(
                    id,
                    textoDaResposta(conteudo.current)
                  );
              }}
            >
              <Play data-icon="inline-start" />
              {ativa && s.estado === 'concluida'
                ? 'Ler novamente'
                : 'Iniciar leitura'}
            </Button>
          )}
          {ativa && s.estado !== 'parada' && s.estado !== 'concluida' ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => interromperLeituraDoChat()}
            >
              <Square data-icon="inline-start" />
              Parar leitura
            </Button>
          ) : null}
        </div>
        <p role="status" className="text-sm">
          {ativa
            ? (s.erro ??
              (s.estado === 'preparando'
                ? 'Preparando a voz…'
                : s.estado === 'concluida'
                  ? 'Leitura concluída.'
                  : s.estado === 'pausada'
                    ? `Leitura pausada no trecho ${s.trecho} de ${s.total}.`
                    : s.estado === 'lendo'
                      ? `Lendo trecho ${s.trecho} de ${s.total}.`
                      : ''))
            : ''}
        </p>
        <p className="text-xs leading-5 text-muted-foreground">
          Retomar ou mudar a velocidade pode repetir o trecho atual. A leitura
          pausa ao esconder esta aba e para ao sair da conversa ou trocar de
          conta. A disponibilidade e a pronúncia dependem do navegador e das
          vozes instaladas.
        </p>
      </DialogContent>
    </Dialog>
  );
}
