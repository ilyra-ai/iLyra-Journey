'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { buscarJson } from '@/lib/http/transporte';
import { LIMITE_TEXTO_NOTA } from '@/lib/admin/esquema-notas';
import type { NotaOperacional } from '@/types/gestao-usuarios';
import type { AdminUserListItem } from '@/types/subscription';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Descarte =
  { kind: 'close' | 'reset' } | { kind: 'edit'; note: NotaOperacional };
const dataHora = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function NotasUsuario({
  user,
  aoFechar,
}: {
  user: AdminUserListItem;
  aoFechar: () => void;
}) {
  const [notas, setNotas] = useState<NotaOperacional[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLeitura, setErroLeitura] = useState<string | null>(null);
  const [erroGravacao, setErroGravacao] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [body, setBody] = useState('');
  const [editando, setEditando] = useState<NotaOperacional | null>(null);
  const [novoId, setNovoId] = useState(() => crypto.randomUUID());
  const [criacaoIniciada, setCriacaoIniciada] = useState(false);
  const [exclusao, setExclusao] = useState<NotaOperacional | null>(null);
  const [descarte, setDescarte] = useState<Descarte | null>(null);
  const [visiveis, setVisiveis] = useState(20);
  const controle = useRef<AbortController | null>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const alterado = body.trim() !== (editando?.body ?? '') || criacaoIniciada;

  const carregar = useCallback(() => {
    controle.current?.abort();
    const atual = new AbortController();
    controle.current = atual;
    // O estado acompanha a resposta da rede; o carregamento inicial já
    // nasce ativo e a atualização manual é iniciada pelo evento do botão.
    return buscarJson(`/api/admin/users/${user.id}/notas`, {
      signal: atual.signal,
    })
      .then((r) => {
        if (atual.signal.aborted) return;
        if (!r.ok) throw new Error(r.falha.message);
        setErroLeitura(null);
        setNotas((r.corpo as { notes: NotaOperacional[] }).notes);
      })
      .catch((error: unknown) => {
        if (!atual.signal.aborted)
          setErroLeitura(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar as notas.'
          );
      })
      .finally(() => {
        if (!atual.signal.aborted) setCarregando(false);
      });
  }, [user.id]);
  useEffect(() => {
    void carregar();
    return () => controle.current?.abort();
  }, [carregar]);

  function recarregar() {
    setCarregando(true);
    setErroLeitura(null);
    void carregar();
  }
  const notaAtual = editando ? notas.find((n) => n.id === editando.id) : null;

  function limpar() {
    setBody('');
    setEditando(null);
    setNovoId(crypto.randomUUID());
    setCriacaoIniciada(false);
    setErroGravacao(null);
  }
  function executarAcao(acao: Descarte) {
    if (acao.kind === 'close') {
      aoFechar();
      return;
    }
    limpar();
    if (acao.kind === 'edit') {
      setEditando(acao.note);
      setBody(acao.note.body);
      requestAnimationFrame(() => campo.current?.focus());
    }
  }
  function solicitar(acao: Descarte) {
    if (salvando) return;
    if (alterado) setDescarte(acao);
    else executarAcao(acao);
  }
  async function salvar(event: React.SubmitEvent) {
    event.preventDefault();
    if (salvando || !body.trim()) return;
    setSalvando(true);
    setErroGravacao(null);
    if (!editando) setCriacaoIniciada(true);
    try {
      const r = await buscarJson(
        `/api/admin/users/${user.id}/notas${editando ? `/${editando.id}` : ''}`,
        {
          method: editando ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(
            editando
              ? { body, version: editando.version }
              : { id: novoId, body }
          ),
        }
      );
      if (!r.ok) {
        if (r.status === 409 && editando) await carregar();
        throw new Error(r.falha.message);
      }
      toast.success(editando ? 'Nota atualizada.' : 'Nota criada.');
      limpar();
      await carregar();
    } catch (error) {
      setErroGravacao(
        (error instanceof Error
          ? error.message
          : 'Não foi possível salvar a nota.') +
          ' Seu texto foi preservado. Atualize a lista para conferir antes de continuar.'
      );
    } finally {
      setSalvando(false);
    }
  }
  async function excluir() {
    if (!exclusao || salvando) return;
    setSalvando(true);
    setErroGravacao(null);
    try {
      const r = await buscarJson(
        `/api/admin/users/${user.id}/notas/${exclusao.id}`,
        {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ version: exclusao.version }),
        }
      );
      if (!r.ok) throw new Error(r.falha.message);
      if (editando?.id === exclusao.id) limpar();
      toast.success('Nota excluída.');
      await carregar();
    } catch (error) {
      setErroGravacao(
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir a nota.'
      );
    } finally {
      setSalvando(false);
      setExclusao(null);
    }
  }
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) solicitar({ kind: 'close' });
        }}
      >
        <DialogContent
          className="max-h-[85dvh] min-w-0 grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-2xl"
          aria-busy={salvando}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText aria-hidden="true" className="h-5 w-5 shrink-0" />
              Notas operacionais
            </DialogTitle>
            <DialogDescription className="break-words">
              {user.email}. Notas de atendimento compartilhadas pela
              administração. A pessoa pode obtê-las ao exportar os próprios
              dados.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={salvar}
            className="min-w-0 space-y-3 rounded-md border border-border bg-background p-4"
          >
            <Label htmlFor="nota-operacional">
              {editando ? 'Editar nota' : 'Nova nota'}
            </Label>
            <p id="nota-ajuda" className="text-sm text-muted-foreground">
              Registre apenas informações de suporte. Não inclua dados de saúde,
              senhas ou chaves.
            </p>
            <Textarea
              ref={campo}
              className="max-w-full resize-y"
              id="nota-operacional"
              aria-describedby="nota-ajuda nota-contagem"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={LIMITE_TEXTO_NOTA}
              rows={4}
              required
              disabled={salvando}
              readOnly={!editando && criacaoIniciada}
            />
            <p
              id="nota-contagem"
              className="text-right text-xs text-muted-foreground"
            >
              {body.length} de {LIMITE_TEXTO_NOTA} caracteres
            </p>
            {!editando && criacaoIniciada && (
              <p className="text-sm text-muted-foreground">
                Se houve falha de conexão, tente salvar novamente com o mesmo
                texto ou atualize a lista para conferir.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={
                  salvando ||
                  carregando ||
                  !body.trim() ||
                  (!editando && notas.length >= 100)
                }
              >
                {salvando
                  ? 'Salvando…'
                  : editando
                    ? 'Salvar alterações'
                    : 'Salvar nota'}
              </Button>
              {(editando || body || criacaoIniciada) && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={salvando}
                  onClick={() => solicitar({ kind: 'reset' })}
                >
                  {editando ? 'Cancelar edição' : 'Limpar formulário'}
                </Button>
              )}
            </div>
          </form>
          {erroGravacao && (
            <div
              role="alert"
              className="space-y-3 rounded-md border border-destructive/30 p-3"
            >
              <p className="text-sm text-destructive">{erroGravacao}</p>
              {editando &&
                notaAtual &&
                notaAtual.version !== editando.version && (
                  <Button
                    variant="outline"
                    disabled={salvando || carregando}
                    onClick={() => solicitar({ kind: 'edit', note: notaAtual })}
                  >
                    Reabrir nota atual
                  </Button>
                )}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {carregando
                ? 'Carregando notas…'
                : erroLeitura
                  ? 'Notas indisponíveis'
                  : `${notas.length} de 100 notas`}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={salvando || carregando}
              onClick={recarregar}
            >
              <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
              Atualizar lista
            </Button>
          </div>
          <div aria-busy={carregando}>
            {carregando ? (
              <p role="status" className="py-4 text-sm text-muted-foreground">
                Carregando notas…
              </p>
            ) : erroLeitura ? (
              <div role="alert" className="space-y-2">
                <p className="text-sm text-destructive">{erroLeitura}</p>
                <Button variant="outline" onClick={recarregar}>
                  Tentar novamente
                </Button>
              </div>
            ) : !notas.length ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Ainda não há notas operacionais para esta conta.
              </p>
            ) : (
              <ol className="space-y-3" aria-label="Notas da conta">
                {notas.slice(0, visiveis).map((nota) => (
                  <li
                    key={nota.id}
                    className="min-w-0 space-y-3 rounded-md border border-border p-4"
                  >
                    <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">
                      {nota.body}
                    </p>
                    <p className="break-words text-xs text-muted-foreground">
                      Criada por {nota.authorEmail ?? 'autor não disponível'} em{' '}
                      <time dateTime={nota.createdAt}>
                        {dataHora.format(new Date(nota.createdAt))}
                      </time>
                      {nota.version > 1 && (
                        <>
                          {' '}
                          · Atualizada por{' '}
                          {nota.editorEmail ?? 'autor não disponível'} em{' '}
                          <time dateTime={nota.updatedAt}>
                            {dataHora.format(new Date(nota.updatedAt))}
                          </time>
                        </>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={salvando}
                        onClick={() => solicitar({ kind: 'edit', note: nota })}
                      >
                        <Pencil aria-hidden="true" className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={salvando}
                        onClick={() => setExclusao(nota)}
                      >
                        <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />
                        Excluir nota
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {!carregando && !erroLeitura && notas.length > visiveis && (
            <Button
              variant="outline"
              onClick={() => setVisiveis((v) => v + 20)}
            >
              Mostrar mais notas
            </Button>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(exclusao)}
        onOpenChange={(open) => {
          if (!open && !salvando) setExclusao(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nota operacional?</AlertDialogTitle>
            <AlertDialogDescription>
              A nota será removida desta conta. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={salvando}
              onClick={(e) => {
                e.preventDefault();
                void excluir();
              }}
            >
              {salvando ? 'Excluindo…' : 'Excluir nota'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(descarte)}
        onOpenChange={(open) => {
          if (!open) setDescarte(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar texto não salvo?</AlertDialogTitle>
            <AlertDialogDescription>
              O texto do formulário será descartado. As notas já salvas serão
              preservadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar escrevendo</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (descarte) executarAcao(descarte);
                setDescarte(null);
              }}
            >
              Descartar texto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
