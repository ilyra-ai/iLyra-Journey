'use client';
import { useState } from 'react';
import Image from 'next/image';
import type { ImagemDoTurno } from '@/lib/chat/tipos';
import { usePrivacyMode } from '@/hooks/use-privacy-mode';
import { buscarJson } from '@/lib/http/transporte';
import { Button } from '@/components/ui/button';

export function ImagemDaConversa({
  imagem: inicial,
}: {
  imagem: ImagemDoTurno;
}) {
  const [imagem, setImagem] = useState(inicial);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { privacyMode } = usePrivacyMode();
  const url = `/api/chat/imagens/${imagem.turnoId}`;
  const atualizar = async (gerar: boolean) => {
    setOcupado(true);
    setErro(null);
    const resultado = await buscarJson(
      url,
      gerar
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ privacyMode }),
          }
        : { cache: 'no-store' }
    );
    if (resultado.ok)
      setImagem((resultado.corpo as { imagem: ImagemDoTurno }).imagem);
    else setErro(resultado.falha.message);
    setOcupado(false);
  };
  return (
    <figure className="mt-3 max-w-xl space-y-2 rounded-xl border border-border bg-card p-3">
      {imagem.estado === 'pronta' ? (
        <>
          {/* Arquivo privado: a sessão do titular é exigida a cada leitura,
              por isso a imagem não passa pelo otimizador (unoptimized). */}
          <Image
            unoptimized
            src={`${url}?arquivo=1`}
            alt={
              imagem.tipo === 'mapa'
                ? 'Interpretação visual do seu mapa pessoal gerada por IA'
                : 'Imagem gerada para o seu pedido nesta conversa'
            }
            width={imagem.largura ?? 1024}
            height={imagem.altura ?? 1024}
            className="h-auto max-w-full rounded-lg"
          />
          <a
            className="inline-flex min-h-11 items-center text-sm underline"
            href={`${url}?arquivo=1`}
            download={`lyra-${imagem.turnoId}.webp`}
          >
            Baixar imagem
          </a>
        </>
      ) : (
        <>
          <p role="status" className="text-sm">
            {ocupado
              ? 'Preparando sua imagem…'
              : (imagem.erro ?? 'Sua imagem ainda está sendo preparada.')}
          </p>
          <Button
            variant="outline"
            disabled={ocupado || privacyMode}
            onClick={() => void atualizar(imagem.estado !== 'gerando')}
          >
            {imagem.estado === 'gerando'
              ? 'Verificar imagem'
              : 'Tentar gerar imagem'}
          </Button>
        </>
      )}
      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}
      <figcaption className="text-xs text-muted-foreground">
        {imagem.provedor && imagem.modelo
          ? `${imagem.provedor} · ${imagem.modelo}. `
          : ''}
        Imagem gerada por IA
        {imagem.tipo === 'mapa'
          ? ': interpretação simbólica; os cálculos estão na leitura textual.'
          : '.'}
      </figcaption>
    </figure>
  );
}
