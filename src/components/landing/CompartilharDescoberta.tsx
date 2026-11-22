'use client';

import { useEffect, useId, useState } from 'react';
import { Download, Loader2, Share2 } from 'lucide-react';

import {
  CAMINHO_DA_JORNADA,
  caminhoDaImagem,
  type FormatoDoCartao,
  identificadorDoSigno,
  nomeDoArquivo,
  textoDoCompartilhamento,
} from '@/lib/descoberta/cartao';
import type { Signo } from '@/lib/lyra/conhecimento/signos-ocidentais';

interface Props {
  signo: Signo | null;
}

type Imagem =
  | { fase: 'carregando' }
  | { fase: 'pronta'; arquivo: File; previa: string }
  | { fase: 'erro' };

/** Resultado do pedido de um cartão, guardado com a chave que o pediu. */
type Pedido =
  | { chave: string; arquivo: File; previa: string }
  | { chave: string; erro: true };

const OPCOES: { valor: FormatoDoCartao; rotulo: string }[] = [
  { valor: 'retrato', rotulo: 'Feed (4:5)' },
  { valor: 'stories', rotulo: 'Stories (9:16)' },
];

/**
 * Compartilhar ou baixar o cartão da descoberta (tarefa 168). Opcional: o
 * resultado não depende disso. A imagem é preparada antes do clique porque
 * o Safari exige que o compartilhamento nativo aconteça no próprio gesto.
 * Só o signo vai no cartão e no texto; o link é o da jornada pública, sem
 * nenhum dado da pessoa.
 */
export function CompartilharDescoberta({ signo }: Props) {
  const id = useId();
  const identificador = identificadorDoSigno(signo);
  const [formato, setFormato] = useState<FormatoDoCartao>('retrato');
  const chave = `${identificador}:${formato}`;
  const [pedido, setPedido] = useState<Pedido | null>(null);
  // Enquanto o pedido da chave atual não volta, o cartão está carregando.
  const imagem: Imagem =
    pedido?.chave !== chave
      ? { fase: 'carregando' }
      : 'erro' in pedido
        ? { fase: 'erro' }
        : { fase: 'pronta', arquivo: pedido.arquivo, previa: pedido.previa };
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(
    null
  );

  useEffect(() => {
    let vivo = true;
    let previa: string | null = null;
    fetch(caminhoDaImagem(identificador, formato), { credentials: 'omit' })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      })
      .then((blob) => {
        if (!vivo) return;
        const arquivo = new File(
          [blob],
          nomeDoArquivo(identificador, formato),
          {
            type: 'image/png',
          }
        );
        previa = URL.createObjectURL(arquivo);
        setPedido({ chave: `${identificador}:${formato}`, arquivo, previa });
      })
      .catch(() => {
        if (vivo)
          setPedido({ chave: `${identificador}:${formato}`, erro: true });
      });
    return () => {
      vivo = false;
      if (previa) URL.revokeObjectURL(previa);
    };
  }, [identificador, formato]);

  const link = () => new URL(CAMINHO_DA_JORNADA, window.location.origin).href;

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(
        `${textoDoCompartilhamento(signo)} ${link()}`
      );
      setAviso({
        texto: 'Link copiado. Cole onde quiser compartilhar.',
        erro: false,
      });
    } catch {
      setAviso({
        texto: `Não foi possível copiar. O endereço é ${link()}`,
        erro: true,
      });
    }
  }

  async function compartilhar() {
    setAviso(null);
    const texto = textoDoCompartilhamento(signo);
    const comImagem =
      imagem.fase === 'pronta' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [imagem.arquivo] });
    if (!comImagem && typeof navigator.share !== 'function') {
      await copiarLink();
      return;
    }
    try {
      await navigator.share(
        comImagem && imagem.fase === 'pronta'
          ? { files: [imagem.arquivo], text: `${texto} ${link()}` }
          : { title: 'Lyra MetaCare', text: texto, url: link() }
      );
      setAviso({
        texto: 'Pronto, enviado para o compartilhamento.',
        erro: false,
      });
    } catch (erro) {
      // Cancelar o diálogo nativo não é falha, mas também não é envio.
      if (erro instanceof DOMException && erro.name === 'AbortError') {
        setAviso({ texto: 'Compartilhamento cancelado.', erro: false });
        return;
      }
      await copiarLink();
    }
  }

  function baixar() {
    if (imagem.fase !== 'pronta') return;
    const url = URL.createObjectURL(imagem.arquivo);
    const ancora = document.createElement('a');
    ancora.href = url;
    ancora.download = imagem.arquivo.name;
    document.body.append(ancora);
    ancora.click();
    ancora.remove();
    URL.revokeObjectURL(url);
    setAviso({ texto: 'Cartão baixado.', erro: false });
  }

  const preparando = imagem.fase === 'carregando';

  return (
    <div className="grid gap-3 rounded-lg border border-border p-3">
      <div className="grid gap-1">
        <p className="font-medium">Quer guardar ou mostrar esta descoberta?</p>
        <p className="text-xs text-muted-foreground">
          É opcional. O cartão leva só{' '}
          {signo ? `o Sol em ${signo}` : 'o céu ocidental'}: nada do seu nome,
          da data ou do que você perguntou.
        </p>
      </div>
      {imagem.fase === 'pronta' ? (
        // eslint-disable-next-line @next/next/no-img-element -- prévia local do arquivo gerado.
        <img
          src={imagem.previa}
          alt={`Prévia do cartão: ${signo ? `Sol em ${signo}` : 'Meu céu ocidental'}`}
          className="mx-auto max-h-64 w-auto rounded-md border border-border"
        />
      ) : null}
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Formato do cartão</legend>
        {OPCOES.map((opcao) => (
          <label
            key={opcao.valor}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm has-[:checked]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            <input
              type="radio"
              name={`${id}-formato`}
              value={opcao.valor}
              checked={formato === opcao.valor}
              onChange={() => setFormato(opcao.valor)}
              className="accent-primary"
            />
            {opcao.rotulo}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void compartilhar()}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4"
        >
          <Share2 aria-hidden="true" className="size-4" />
          Compartilhar minha descoberta
        </button>
        <button
          type="button"
          onClick={baixar}
          disabled={imagem.fase !== 'pronta'}
          aria-describedby={preparando ? `${id}-preparo` : undefined}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 disabled:opacity-60"
        >
          {preparando ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Download aria-hidden="true" className="size-4" />
          )}
          Baixar meu cartão
        </button>
      </div>
      {preparando ? (
        <p id={`${id}-preparo`} className="text-xs text-muted-foreground">
          Preparando o cartão…
        </p>
      ) : null}
      {imagem.fase === 'erro' ? (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível preparar o cartão (confira a conexão). Ainda dá para
          compartilhar o link.
        </p>
      ) : null}
      <p
        role="status"
        className={
          aviso?.erro ? 'text-sm text-destructive' : 'text-sm text-foreground'
        }
      >
        {aviso?.texto ?? ''}
      </p>
    </div>
  );
}
