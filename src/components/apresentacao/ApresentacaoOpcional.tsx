'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { RegistroDoDiaDialog } from '@/components/metricas/RegistroDoDia';
import {
  conteudoDoPasso,
  type EstadoApresentacao,
  type Passo,
} from '@/lib/apresentacao/esquema';
import { EVENTO_PLANOS_ATUALIZADOS } from '@/lib/plans/atualizacao-publica';
async function ler() {
  const r = await fetch('/api/apresentacao', {
      cache: 'no-store',
      credentials: 'include',
    }),
    b = await r.json();
  if (!r.ok) throw new Error(b.error ?? 'Não foi possível carregar a ajuda.');
  return b as EstadoApresentacao;
}
export function ApresentacaoOpcional() {
  const { session } = useAuth();
  return session ? (
    <ApresentacaoDaConta key={session.user.id} titular={session.user.id} />
  ) : null;
}
function ApresentacaoDaConta({ titular }: { titular: string }) {
  const [erro, setErro] = useState(''),
    [alterado, setAlterado] = useState<EstadoApresentacao | null>(null),
    [aberto, setAberto] = useState(false),
    [registro, setRegistro] = useState(false),
    [busy, setBusy] = useState(false);
  const erroDeCarga = useCallback(
    (e: unknown) =>
      setErro(
        e instanceof Error ? e.message : 'Não foi possível carregar a ajuda.'
      ),
    []
  );
  const recurso = useKeyedResource<EstadoApresentacao | null>(
      titular,
      ler,
      erroDeCarga,
      null
    ),
    titulo = useRef<HTMLHeadingElement>(null),
    gatilho = useRef<HTMLButtonElement>(null);
  const estado = alterado ?? recurso.data,
    passo = estado?.passo,
    conteudo = passo ? conteudoDoPasso[passo] : null;
  useEffect(() => {
    if (aberto) titulo.current?.focus();
  }, [aberto, passo]);
  const recarregar = useCallback(async () => {
    try {
      setAlterado(await ler());
    } catch (e) {
      erroDeCarga(e);
    }
  }, [erroDeCarga]);
  useEffect(() => {
    const atualizar = () => {
      void recarregar();
    };
    window.addEventListener(EVENTO_PLANOS_ATUALIZADOS, atualizar);
    window.addEventListener('focus', atualizar);
    return () => {
      window.removeEventListener(EVENTO_PLANOS_ATUALIZADOS, atualizar);
      window.removeEventListener('focus', atualizar);
    };
  }, [recarregar]);
  async function mudar(
    acao: 'iniciar' | 'ir' | 'dispensar' | 'concluir',
    destino: Passo
  ) {
    if (!estado || busy) return false;
    setBusy(true);
    setErro('');
    try {
      const r = await fetch('/api/apresentacao', {
          method: 'PUT',
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acao, passo: destino, versao: estado.versao }),
        }),
        b = await r.json();
      if (!r.ok) {
        if (r.status === 409 || r.status === 403) {
          await recarregar();
        }
        throw new Error(b.error ?? 'Não foi possível salvar a ajuda.');
      }
      setAlterado(b);
      return true;
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : 'Sem conexão para salvar o progresso.'
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function abrir() {
    setBusy(true);
    setErro('');
    try {
      let atual = await ler();
      if (atual.estado !== 'em_andamento') {
        const r = await fetch('/api/apresentacao', {
          method: 'PUT',
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            acao: 'iniciar',
            passo: atual.passos[0],
            versao: atual.versao,
          }),
        });
        const b = await r.json();
        if (!r.ok)
          throw new Error(b.error ?? 'Não foi possível iniciar a ajuda.');
        atual = b;
      }
      setAlterado(atual);
      setAberto(true);
    } catch (e) {
      erroDeCarga(e);
    } finally {
      setBusy(false);
    }
  }
  const indice = estado && passo ? estado.passos.indexOf(passo) : 0;
  // O cartão só aparece para quem ainda não viu a apresentação ou parou no
  // meio (tarefa 217): concluída ou dispensada, ele some de todas as páginas.
  // Sem estado carregado não há o que mostrar, nem aviso de carregamento.
  if (!estado) return null;
  if (
    !aberto &&
    (estado.estado === 'concluida' || estado.estado === 'dispensada')
  )
    return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {estado?.estado === 'novo'
            ? 'Quer conhecer a Lyra?'
            : 'Ajuda para começar'}
        </p>
        {estado?.estado === 'novo' && (
          <p className="text-xs text-muted-foreground">
            Uma apresentação curta e opcional. Seu cadastro já está concluído.
          </p>
        )}
        {erro && !aberto && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {erro}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          ref={gatilho}
          type="button"
          variant="outline"
          size="sm"
          // Quebra linha com texto ampliado a 200% (WCAG 1.4.4), sem vazar.
          className="h-auto min-h-9 max-w-full whitespace-normal"
          disabled={busy}
          onClick={() => void abrir()}
        >
          {estado?.estado === 'novo'
            ? 'Conhecer o aplicativo'
            : estado?.estado === 'em_andamento'
              ? 'Retomar apresentação'
              : 'Rever apresentação'}
        </Button>
        {estado?.estado === 'novo' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => void mudar('dispensar', estado.passo)}
          >
            Agora não
          </Button>
        )}
      </div>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent
          aria-modal="true"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            titulo.current?.focus();
          }}
          className="max-h-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            if (!registro) gatilho.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle ref={titulo} tabIndex={-1}>
              {conteudo?.titulo ?? 'Ajuda para começar'}
            </DialogTitle>
            <DialogDescription>
              Apresentação opcional · passo {indice + 1} de{' '}
              {estado?.passos.length ?? 0}. Nenhum dado pessoal de demonstração
              é usado.
            </DialogDescription>
          </DialogHeader>
          {conteudo && estado && (
            <>
              <p className="text-sm leading-6">{conteudo.texto}</p>
              <div className="rounded-lg border p-3">
                <p className="mb-3 text-sm text-muted-foreground">
                  Você pode experimentar o controle real ou seguir sem preencher
                  nada.
                </p>
                {passo === 'registro' ? (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      if (await mudar('iniciar', passo)) {
                        setAberto(false);
                        setRegistro(true);
                      }
                    }}
                  >
                    {conteudo.acao}
                  </Button>
                ) : (
                  <Button variant="outline" asChild>
                    <Link
                      href={conteudo.href ?? '/profile'}
                      onClick={() => setAberto(false)}
                    >
                      {conteudo.acao}
                    </Link>
                  </Button>
                )}
              </div>
              {erro && (
                <p role="alert" className="text-sm text-destructive">
                  {erro}
                </p>
              )}
              <DialogFooter className="flex-wrap gap-2 sm:justify-between">
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={async () => {
                    if (await mudar('dispensar', estado.passo))
                      setAberto(false);
                  }}
                >
                  Pular apresentação
                </Button>
                <div className="flex min-w-0 flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={busy || indice === 0}
                    onClick={() => void mudar('ir', estado.passos[indice - 1])}
                  >
                    Voltar
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={async () => {
                      if (indice === estado.passos.length - 1) {
                        if (await mudar('concluir', estado.passo))
                          setAberto(false);
                      } else await mudar('ir', estado.passos[indice + 1]);
                    }}
                  >
                    {busy
                      ? 'Salvando…'
                      : indice === estado.passos.length - 1
                        ? 'Concluir apresentação'
                        : 'Avançar'}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {registro && (
        <RegistroDoDiaDialog
          open={registro}
          onOpenChange={(v) => {
            setRegistro(v);
            if (!v) setAberto(true);
          }}
        />
      )}
    </div>
  );
}
