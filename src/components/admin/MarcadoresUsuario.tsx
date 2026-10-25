'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Tags, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { buscarJson } from '@/lib/http/transporte';
import type { AdminUserListItem } from '@/types/subscription';
import {
  CORES_MARCADOR,
  type CorMarcador,
  type MarcadorOperacional,
} from '@/types/gestao-usuarios';
import { MarcadorBadge, NOMES_CORES } from './MarcadorBadge';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type Descarte =
  { kind: 'close' | 'reset' } | { kind: 'edit'; marker: MarcadorOperacional };
export function MarcadoresUsuario({
  user,
  aoFechar,
}: {
  user: AdminUserListItem;
  aoFechar: () => void;
}) {
  const [markers, setMarkers] = useState<MarcadorOperacional[]>([]);
  const [carregando, setCarregando] = useState(true),
    [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null),
    [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [name, setName] = useState(''),
    [color, setColor] = useState<CorMarcador>('neutro');
  const [editing, setEditing] = useState<MarcadorOperacional | null>(null),
    [exclusao, setExclusao] = useState<MarcadorOperacional | null>(null);
  const [draftId, setDraftId] = useState(() => crypto.randomUUID()),
    [iniciado, setIniciado] = useState(false);
  const [descarte, setDescarte] = useState<Descarte | null>(null);
  const controller = useRef<AbortController | null>(null);
  const alterado = editing
    ? name.trim() !== editing.name || color !== editing.color
    : Boolean(name.trim()) || color !== 'neutro' || iniciado;
  const load = useCallback(() => {
    controller.current?.abort();
    const atual = new AbortController();
    controller.current = atual;
    return buscarJson(`/api/admin/users/${user.id}/marcadores`, {
      signal: atual.signal,
    })
      .then((r) => {
        if (atual.signal.aborted) return;
        if (!r.ok) throw new Error(r.falha.message);
        setMarkers((r.corpo as { markers: MarcadorOperacional[] }).markers);
        setErro(null);
      })
      .catch((error: unknown) => {
        if (!atual.signal.aborted)
          setErro(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar os marcadores.'
          );
      })
      .finally(() => {
        if (!atual.signal.aborted) setCarregando(false);
      });
  }, [user.id]);
  useEffect(() => {
    void load();
    return () => controller.current?.abort();
  }, [load]);
  function falha(message: string) {
    setErroSalvar(message);
    toast.error(message);
  }
  function atualizar() {
    setCarregando(true);
    setErro(null);
    void load();
  }
  function limpar() {
    setName('');
    setColor('neutro');
    setEditing(null);
    setDraftId(crypto.randomUUID());
    setIniciado(false);
    setErroSalvar(null);
  }
  function executar(acao: Descarte) {
    if (acao.kind === 'close') {
      aoFechar();
      return;
    }
    limpar();
    if (acao.kind === 'edit') {
      setEditing(acao.marker);
      setName(acao.marker.name);
      setColor(acao.marker.color);
    }
  }
  function solicitar(acao: Descarte) {
    if (busy) return;
    if (alterado) setDescarte(acao);
    else executar(acao);
  }
  async function atribuir(m: MarcadorOperacional) {
    if (busy) return;
    setBusy(true);
    setErroSalvar(null);
    try {
      const r = await buscarJson(
        `/api/admin/users/${user.id}/marcadores/${m.id}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ assigned: !m.assigned }),
        }
      );
      if (!r.ok) throw new Error(r.falha.message);
      await load();
      toast.success(
        m.assigned
          ? 'Marcador removido da conta.'
          : 'Marcador adicionado à conta.'
      );
    } catch (error) {
      falha(
        error instanceof Error
          ? error.message
          : 'Não foi possível alterar o marcador.'
      );
    } finally {
      setBusy(false);
    }
  }
  async function salvar(event: React.SubmitEvent) {
    event.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setErroSalvar(null);
    if (!editing) setIniciado(true);
    try {
      const r = await buscarJson(
        `/api/admin/marcadores${editing ? `/${editing.id}` : ''}`,
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(
            editing
              ? { name, color, version: editing.version }
              : { id: draftId, name, color }
          ),
        }
      );
      if (!r.ok) {
        if (r.status === 409) await load();
        throw new Error(r.falha.message);
      }
      toast.success(
        editing
          ? 'Marcador atualizado em todas as contas.'
          : 'Marcador criado no catálogo.'
      );
      limpar();
      await load();
    } catch (error) {
      falha(
        (error instanceof Error ? error.message : 'Não foi possível salvar.') +
          ' O formulário foi preservado. Atualize o catálogo para conferir.'
      );
    } finally {
      setBusy(false);
    }
  }
  async function excluir() {
    if (!exclusao || busy) return;
    setBusy(true);
    setErroSalvar(null);
    try {
      const r = await buscarJson(`/api/admin/marcadores/${exclusao.id}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          version: exclusao.version,
          expectedUsers: exclusao.userCount,
        }),
      });
      if (!r.ok) {
        await load();
        throw new Error(r.falha.message);
      }
      if (editing?.id === exclusao.id) limpar();
      await load();
      toast.success('Marcador excluído do catálogo e das contas associadas.');
    } catch (error) {
      falha(
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir o marcador.'
      );
    } finally {
      setBusy(false);
      setExclusao(null);
    }
  }
  const atual = editing ? markers.find((m) => m.id === editing.id) : null;
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
          aria-busy={busy}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags aria-hidden="true" className="h-5 w-5 shrink-0" />
              Marcadores operacionais
            </DialogTitle>
            <DialogDescription className="break-words">
              {user.email}. Organize o atendimento sem alterar o plano ou o
              papel da conta. Use categorias operacionais, sem nomes pessoais ou
              informações de saúde.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {carregando
                ? 'Carregando catálogo…'
                : erro
                  ? 'Catálogo indisponível'
                  : `${markers.filter((m) => m.assigned).length} de 10 nesta conta · ${markers.length} de 50 no catálogo`}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || carregando}
              onClick={atualizar}
            >
              <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
              Atualizar catálogo
            </Button>
          </div>
          {erroSalvar && (
            <div
              role="alert"
              className="space-y-3 rounded-md border border-destructive/30 p-3"
            >
              <p className="text-sm text-destructive">{erroSalvar}</p>
              {editing && atual && atual.version !== editing.version && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => solicitar({ kind: 'edit', marker: atual })}
                >
                  Reabrir marcador atual
                </Button>
              )}
            </div>
          )}
          <Tabs defaultValue="conta" className="min-w-0">
            <TabsList className="grid h-auto w-full grid-cols-2">
              <TabsTrigger value="conta" className="whitespace-normal">
                Nesta conta
              </TabsTrigger>
              <TabsTrigger value="catalogo" className="whitespace-normal">
                Gerenciar catálogo
              </TabsTrigger>
            </TabsList>
            <TabsContent value="conta" className="min-w-0 space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione até 10 marcadores. Cada alteração é salva
                automaticamente.
              </p>
              {carregando ? (
                <p role="status">Carregando marcadores…</p>
              ) : erro ? (
                <div role="alert">
                  <p className="text-sm text-destructive">{erro}</p>
                  <Button variant="outline" onClick={atualizar}>
                    Tentar novamente
                  </Button>
                </div>
              ) : !markers.length ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Ainda não há marcadores. Crie o primeiro em Gerenciar
                  catálogo.
                </p>
              ) : (
                <fieldset disabled={busy} className="space-y-2">
                  <legend className="sr-only">Marcadores desta conta</legend>
                  {markers.map((m) => (
                    <label
                      key={m.id}
                      className="flex min-w-0 cursor-pointer items-center gap-3 rounded-md border border-border p-3"
                    >
                      <Checkbox
                        checked={Boolean(m.assigned)}
                        disabled={
                          busy ||
                          (!m.assigned &&
                            markers.filter((x) => x.assigned).length >= 10)
                        }
                        onCheckedChange={() => void atribuir(m)}
                        aria-label={`Usar marcador ${m.name}`}
                      />
                      <MarcadorBadge name={m.name} color={m.color} />
                    </label>
                  ))}
                </fieldset>
              )}
            </TabsContent>
            <TabsContent value="catalogo" className="min-w-0 space-y-4">
              <form
                onSubmit={salvar}
                className="min-w-0 space-y-3 rounded-md border border-border bg-background p-4"
              >
                <h3 className="text-sm font-medium">
                  {editing ? 'Editar marcador' : 'Novo marcador'}
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="marcador-nome">Nome operacional</Label>
                  <Input
                    id="marcador-nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={40}
                    required
                    disabled={busy}
                    readOnly={!editing && iniciado}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marcador-cor">Cor de identificação</Label>
                  <Select
                    value={color}
                    onValueChange={(v) => setColor(v as CorMarcador)}
                    disabled={busy || (!editing && iniciado)}
                  >
                    <SelectTrigger id="marcador-cor">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CORES_MARCADOR.map((c) => (
                        <SelectItem key={c} value={c}>
                          {NOMES_CORES[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Prévia · a identificação sempre inclui o nome
                  </p>
                  <MarcadorBadge
                    name={name.trim() || 'Nome do marcador'}
                    color={color}
                  />
                </div>
                {editing && (
                  <p className="text-sm text-muted-foreground">
                    Alterar nome ou cor atualiza a apresentação em todas as
                    contas associadas.
                  </p>
                )}
                {!editing && iniciado && (
                  <p className="text-sm text-muted-foreground">
                    Após uma falha de conexão, repita com os mesmos dados ou
                    atualize o catálogo para conferir.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={
                      busy ||
                      carregando ||
                      !name.trim() ||
                      (!editing && markers.length >= 50)
                    }
                  >
                    {busy
                      ? 'Salvando…'
                      : editing
                        ? 'Salvar alterações'
                        : 'Criar marcador'}
                  </Button>
                  {(editing || alterado) && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => solicitar({ kind: 'reset' })}
                    >
                      {editing ? 'Cancelar edição' : 'Limpar formulário'}
                    </Button>
                  )}
                </div>
              </form>
              {carregando ? (
                <p role="status">Carregando catálogo…</p>
              ) : erro ? (
                <div role="alert">
                  <p className="text-sm text-destructive">{erro}</p>
                  <Button variant="outline" onClick={atualizar}>
                    Tentar novamente
                  </Button>
                </div>
              ) : !markers.length ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum marcador criado.
                </p>
              ) : (
                <ul className="space-y-2" aria-label="Catálogo de marcadores">
                  {markers.map((m) => (
                    <li
                      key={m.id}
                      className="min-w-0 space-y-3 rounded-md border border-border p-3"
                    >
                      <MarcadorBadge name={m.name} color={m.color} />
                      <p className="text-sm text-muted-foreground">
                        Usado em {m.userCount}{' '}
                        {m.userCount === 1 ? 'conta' : 'contas'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => solicitar({ kind: 'edit', marker: m })}
                        >
                          <Pencil aria-hidden="true" className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => setExclusao(m)}
                        >
                          <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />
                          Excluir marcador
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(exclusao)}
        onOpenChange={(open) => {
          if (!open && !busy) setExclusao(null);
        }}
      >
        <AlertDialogContent className="min-w-0 grid-cols-[minmax(0,1fr)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir marcador do catálogo?</AlertDialogTitle>
            <AlertDialogDescription className="[overflow-wrap:anywhere]">
              “{exclusao?.name}” será removido de {exclusao?.userCount ?? 0}{' '}
              {exclusao?.userCount === 1 ? 'conta' : 'contas'}. Dados, planos e
              papéis serão preservados. A exclusão do marcador não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void excluir();
              }}
            >
              {busy ? 'Excluindo…' : 'Excluir marcador'}
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
        <AlertDialogContent className="min-w-0 grid-cols-[minmax(0,1fr)]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Descartar alterações do formulário?
            </AlertDialogTitle>
            <AlertDialogDescription>
              As alterações não salvas serão descartadas. Os marcadores já
              salvos e atribuídos serão preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (descarte) executar(descarte);
                setDescarte(null);
              }}
            >
              Descartar alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
