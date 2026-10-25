'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { buscarJson } from '@/lib/http/transporte';
import {
  FILTROS_INICIAIS,
  type ConsultaUsuarios,
  type SegmentoUsuarios,
} from '@/lib/admin/esquema-filtros';
import type { MarcadorOperacional } from '@/types/gestao-usuarios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

interface Opcoes {
  roles: string[];
  plans: Array<{ key: string; name: string }>;
  markers: MarcadorOperacional[];
}
function Campo({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="h-11 w-full min-w-0 rounded border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
export function FiltrosUsuarios({
  query,
  onChange,
  metadataRevision = 0,
}: {
  metadataRevision?: number;
  query: ConsultaUsuarios;
  onChange: (q: ConsultaUsuarios) => void;
}) {
  const [options, setOptions] = useState<Opcoes | null>(null),
    [segments, setSegments] = useState<SegmentoUsuarios[]>([]),
    [erro, setErro] = useState<string | null>(null),
    [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(''),
    [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{
      id: string;
      name: string;
      version?: number;
      query: ConsultaUsuarios;
    } | null>(null),
    [name, setName] = useState(''),
    [started, setStarted] = useState(false),
    [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<SegmentoUsuarios | null>(null);
  const load = useCallback(
    () =>
      Promise.all([
        buscarJson('/api/admin/users/filtros'),
        buscarJson('/api/admin/users/segmentos'),
      ])
        .then(([a, b]) => {
          if (!a.ok) throw new Error(a.falha.message);
          if (!b.ok) throw new Error(b.falha.message);
          setOptions(a.corpo as Opcoes);
          setSegments((b.corpo as { segments: SegmentoUsuarios[] }).segments);
          setErro(null);
        })
        .catch((e: unknown) =>
          setErro(
            e instanceof Error
              ? e.message
              : 'Não foi possível carregar filtros e segmentos.'
          )
        )
        .finally(() => setLoading(false)),
    []
  );
  useEffect(() => {
    let ativo = true;
    async function iniciar() {
      const [a, b] = await Promise.all([
        buscarJson('/api/admin/users/filtros'),
        buscarJson('/api/admin/users/segmentos'),
      ]);
      if (!ativo) return;
      if (!a.ok || !b.ok)
        setErro(
          !a.ok
            ? a.falha.message
            : !b.ok
              ? b.falha.message
              : 'Falha de leitura.'
        );
      else {
        setOptions(a.corpo as Opcoes);
        setSegments((b.corpo as { segments: SegmentoUsuarios[] }).segments);
      }
      setLoading(false);
    }
    void iniciar();
    return () => {
      ativo = false;
    };
  }, [metadataRevision]);
  const segmento = segments.find((s) => s.id === selected);
  const missingMarker = Boolean(
    options &&
    query.filters.markerId &&
    !options.markers.some((m) => m.id === query.filters.markerId)
  );
  function abrir(edit: boolean) {
    if (edit && !segmento) return;
    const base = edit ? segmento! : null;
    setForm({
      id: base?.id ?? crypto.randomUUID(),
      name: base?.name ?? '',
      version: base?.version,
      query: structuredClone(query),
    });
    setName(base?.name ?? '');
    setFormError(null);
    setStarted(false);
  }
  async function salvar(e: React.SubmitEvent) {
    e.preventDefault();
    if (!form || busy || !name.trim()) return;
    setBusy(true);
    setFormError(null);
    setStarted(true);
    try {
      const r = await buscarJson(
        '/api/admin/users/segmentos' + (form.version ? '/' + form.id : ''),
        {
          method: form.version ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(
            form.version
              ? { name, query: form.query, version: form.version }
              : { id: form.id, name, query: form.query }
          ),
        }
      );
      if (!r.ok) throw new Error(r.falha.message);
      setSelected(form.id);
      setForm(null);
      await load();
      toast.success('Segmento privado salvo.');
    } catch (error) {
      setFormError(
        (error instanceof Error ? error.message : 'Não foi possível salvar.') +
          ' Os dados do formulário foram preservados.'
      );
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function excluir() {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      const r = await buscarJson('/api/admin/users/segmentos/' + deleting.id, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version: deleting.version }),
      });
      if (!r.ok) throw new Error(r.falha.message);
      if (selected === deleting.id) setSelected('');
      toast.success('Segmento excluído. Os usuários foram preservados.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Não foi possível excluir.'
      );
    } finally {
      await load();
      setBusy(false);
      setDeleting(null);
    }
  }
  return (
    <div className="mb-5 min-w-0 space-y-4 rounded-md border border-border bg-background p-4">
      <div>
        <h3 className="text-sm font-semibold">Filtros e segmentos</h3>
        <p className="text-sm text-muted-foreground">
          Combine critérios para organizar o atendimento. Segmentos salvos ficam
          privados para sua conta administrativa.
        </p>
      </div>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Campo
          id="filtro-acesso"
          label="Acesso"
          value={query.filters.access}
          options={[
            ['all', 'Todos'],
            ['active', 'Ativos'],
            ['blocked', 'Bloqueados'],
          ]}
          onChange={(v) =>
            onChange({
              ...query,
              filters: {
                ...query.filters,
                access: v as ConsultaUsuarios['filters']['access'],
              },
            })
          }
        />
        <Campo
          id="filtro-papel"
          label="Perfil"
          value={query.filters.role ? 'role:' + query.filters.role : 'all'}
          options={[
            ['all', 'Todos'],
            ...(options?.roles ?? []).map(
              (r) =>
                [
                  'role:' + r,
                  (
                    {
                      admin: 'Administrador',
                      patient: 'Usuário',
                      professional: 'Profissional',
                      user: 'Usuário',
                    } as Record<string, string>
                  )[r] ?? r,
                ] as [string, string]
            ),
            ...(query.filters.role &&
            !options?.roles.includes(query.filters.role)
              ? [
                  [
                    'role:' + query.filters.role,
                    'Perfil salvo: ' + query.filters.role,
                  ] as [string, string],
                ]
              : []),
          ]}
          onChange={(v) =>
            onChange({
              ...query,
              filters: {
                ...query.filters,
                role: v === 'all' ? null : v.slice(5),
              },
            })
          }
        />
        <Campo
          id="filtro-onboarding"
          label="Onboarding"
          value={query.filters.onboarding}
          options={[
            ['all', 'Todos'],
            ['complete', 'Concluído'],
            ['pending', 'Pendente'],
          ]}
          onChange={(v) =>
            onChange({
              ...query,
              filters: {
                ...query.filters,
                onboarding: v as ConsultaUsuarios['filters']['onboarding'],
              },
            })
          }
        />
        <Campo
          id="filtro-plano"
          label="Plano"
          value={query.filters.plan}
          options={[
            ['all', 'Todos'],
            ['none', 'Sem assinatura'],
            ...(options?.plans ?? []).map(
              (p) => [p.key, p.name] as [string, string]
            ),
          ]}
          onChange={(v) =>
            onChange({
              ...query,
              filters: {
                ...query.filters,
                plan: v as ConsultaUsuarios['filters']['plan'],
              },
            })
          }
        />
        <Campo
          id="filtro-marcador"
          label="Marcador"
          value={query.filters.markerId ?? 'all'}
          options={[
            ['all', 'Todos'],
            ...(options?.markers ?? []).map(
              (m) => [m.id, m.name] as [string, string]
            ),
            ...(missingMarker
              ? [
                  [query.filters.markerId!, 'Marcador removido'] as [
                    string,
                    string,
                  ],
                ]
              : []),
          ]}
          onChange={(v) =>
            onChange({
              ...query,
              filters: { ...query.filters, markerId: v === 'all' ? null : v },
            })
          }
        />
      </div>
      {missingMarker && (
        <p role="status" className="text-sm text-warning">
          O marcador deste filtro foi removido. A consulta continuará sem
          resultados até você escolher outro critério.
        </p>
      )}
      {erro && (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-destructive">{erro}</p>
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full min-w-0 sm:w-64">
          <Campo
            id="segmento-salvo"
            label="Segmentos privados"
            value={segmento ? selected : ''}
            options={[
              ['', 'Selecione um segmento'],
              ...segments.map((s) => [s.id, s.name] as [string, string]),
            ]}
            onChange={setSelected}
          />
        </div>
        <Button
          variant="outline"
          disabled={!segmento || loading || busy}
          onClick={() => {
            if (segmento) onChange(structuredClone(segmento.query));
          }}
        >
          Aplicar
        </Button>
        <Button
          variant="outline"
          disabled={loading || busy || segments.length >= 20 || missingMarker}
          onClick={() => abrir(false)}
        >
          Salvar segmento
        </Button>
        <Button
          variant="outline"
          disabled={!segmento || busy || loading || missingMarker}
          onClick={() => abrir(true)}
        >
          Editar segmento
        </Button>
        <Button
          variant="outline"
          disabled={!segmento || busy || loading}
          onClick={() => {
            if (segmento) setDeleting(segmento);
          }}
        >
          Excluir segmento
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            onChange({
              search: '',
              filters: { ...FILTROS_INICIAIS },
              sortColumn: 'created_at',
              ascending: false,
            })
          }
        >
          Limpar busca e filtros
        </Button>
      </div>
      <Dialog
        open={Boolean(form)}
        onOpenChange={(open) => {
          if (!open && !busy) setForm(null);
        }}
      >
        <DialogContent className="min-w-0 grid-cols-[minmax(0,1fr)]">
          <DialogHeader>
            <DialogTitle>
              {form?.version
                ? 'Editar segmento privado'
                : 'Salvar segmento privado'}
            </DialogTitle>
            <DialogDescription>
              Salva a busca, a ordenação e os filtros que estavam na tela ao
              abrir este formulário. O segmento será consultado sobre os dados
              atuais; não guarda uma cópia dos usuários.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="segmento-nome">Nome do segmento</Label>
              <Input
                id="segmento-nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                required
                disabled={busy}
                readOnly={started && !form?.version}
              />
            </div>
            {form?.version && (
              <p className="text-sm text-muted-foreground">
                Ao salvar, os critérios anteriores serão substituídos pelos
                filtros atuais capturados ao abrir esta edição.
              </p>
            )}
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError} Se houve conflito, cancele e reabra a edição após
                atualizar a lista.
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setForm(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={busy || !name.trim()}>
                {busy ? 'Salvando…' : 'Salvar segmento privado'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleting(null);
        }}
      >
        <AlertDialogContent className="min-w-0 grid-cols-[minmax(0,1fr)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir segmento privado?</AlertDialogTitle>
            <AlertDialogDescription className="[overflow-wrap:anywhere]">
              “{deleting?.name}” será removido da sua lista. Os usuários e seus
              dados serão preservados.
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
              Excluir segmento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
