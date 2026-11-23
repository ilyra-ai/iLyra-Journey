'use client';

import { useCallback, useId, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { buscarJson } from '@/lib/http/transporte';
import type { Mudanca, VersaoPublicada } from '@/lib/site-page-config/versoes';

const PAGINAS = [
  { chave: 'landing', nome: 'Página inicial' },
  { chave: 'login', nome: 'Entrar e cadastro' },
  { chave: 'app', nome: 'Aplicativo' },
] as const;

type Pagina = (typeof PAGINAS)[number]['chave'];

interface Estado {
  versoes: VersaoPublicada[];
  rascunho: Mudanca[];
}

const ORIGEM: Record<VersaoPublicada['origem'], string> = {
  migracao: 'início do histórico',
  publicacao: 'publicação',
  reversao: 'reversão',
};

function valor(v: unknown) {
  if (v === undefined) return '—';
  const texto = typeof v === 'string' ? v : JSON.stringify(v);
  return texto.length > 120 ? `${texto.slice(0, 120)}…` : texto;
}

function ListaDeMudancas({ mudancas }: { mudancas: Mudanca[] }) {
  if (!mudancas.length)
    return <p className="text-sm text-muted-foreground">Nenhuma diferença.</p>;
  return (
    <ul className="grid gap-2 text-sm">
      {mudancas.slice(0, 200).map((m) => (
        <li key={m.caminho} className="rounded-md border border-border p-2">
          <p className="font-mono text-xs">{m.caminho}</p>
          <p>
            <span className="font-medium">{m.tipo}</span>
            {m.tipo !== 'adicionado' ? (
              <>
                {' '}
                · antes: <span className="break-words">{valor(m.antes)}</span>
              </>
            ) : null}
            {m.tipo !== 'removido' ? (
              <>
                {' '}
                · depois: <span className="break-words">{valor(m.depois)}</span>
              </>
            ) : null}
          </p>
        </li>
      ))}
      {mudancas.length > 200 ? (
        <li className="text-muted-foreground">
          E mais {mudancas.length - 200} diferenças.
        </li>
      ) : null}
    </ul>
  );
}

/**
 * Estúdio de publicação (tarefa 184): diferença do rascunho para o
 * publicado, publicação com justificativa, histórico de versões e
 * reversão (que também vira uma versão). O rascunho continua sendo editado
 * no construtor de páginas.
 */
export function PublicacaoAdmin() {
  const id = useId();
  const { session } = useAuth();
  const [pagina, setPagina] = useState<Pagina>('landing');
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [atualizacao, setAtualizacao] = useState(0);
  const [comparando, setComparando] = useState<{
    versao: number;
    mudancas: Mudanca[];
  } | null>(null);

  const pedir = useCallback(async () => {
    const r = await buscarJson(`/api/admin/publicacao/${pagina}`, {
      cache: 'no-store',
    });
    if (!r.ok) throw new Error(r.falha.message);
    return r.corpo as Estado;
  }, [pagina]);
  const avisar = useCallback((erro: unknown) => {
    toast.error('Não foi possível ler as versões.', {
      description: erro instanceof Error ? erro.message : undefined,
    });
  }, []);
  const { data, loading } = useKeyedResource<Estado | null>(
    session ? `publicacao:${session.user.id}:${pagina}:${atualizacao}` : null,
    pedir,
    avisar,
    null
  );

  async function agir(corpo: Record<string, unknown>, sucesso: string) {
    setEnviando(true);
    const r = await buscarJson(`/api/admin/publicacao/${pagina}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...corpo, nota }),
    });
    setEnviando(false);
    if (!r.ok) {
      toast.error('Não foi possível concluir.', {
        description: r.falha.message,
      });
      return;
    }
    const { versaoPublicada } = r.corpo as { versaoPublicada: number | null };
    toast.success(
      versaoPublicada
        ? `${sucesso}: versão ${versaoPublicada}.`
        : 'Nada mudou: o conteúdo já era este, nenhuma versão nova.'
    );
    setNota('');
    setComparando(null);
    setAtualizacao((n) => n + 1);
  }

  async function comparar(versao: number) {
    const r = await buscarJson(
      `/api/admin/publicacao/${pagina}?versao=${versao}`,
      { cache: 'no-store' }
    );
    if (!r.ok) {
      toast.error('Não foi possível comparar.', {
        description: r.falha.message,
      });
      return;
    }
    setComparando(r.corpo as { versao: number; mudancas: Mudanca[] });
  }

  const notaValida = nota.trim().length >= 5;

  return (
    <div className="min-w-0 space-y-6">
      <ToggleGroup
        type="single"
        value={pagina}
        onValueChange={(v) => {
          if (v) {
            setPagina(v as Pagina);
            setComparando(null);
          }
        }}
        aria-label="Página"
        variant="outline"
        className="flex-wrap justify-start"
      >
        {PAGINAS.map((p) => (
          <ToggleGroupItem
            key={p.chave}
            value={p.chave}
            className="min-h-11 px-4"
          >
            {p.nome}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {loading && !data ? <Skeleton className="h-64 w-full" /> : null}

      {data ? (
        <>
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Rascunho × publicado</CardTitle>
              <CardDescription>
                O que muda para quem usa o app se você publicar agora. O
                rascunho é editado no construtor de páginas, com prévia.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ListaDeMudancas mudancas={data.rascunho} />
              <div className="grid gap-1.5">
                <Label htmlFor={`${id}-nota`}>
                  Justificativa (fica no histórico)
                </Label>
                <Textarea
                  id={`${id}-nota`}
                  rows={2}
                  maxLength={300}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                />
              </div>
              <div>
                <Button
                  type="button"
                  disabled={enviando || !notaValida || !data.rascunho.length}
                  onClick={() => void agir({ acao: 'publicar' }, 'Publicado')}
                >
                  Publicar o rascunho
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Versões publicadas</CardTitle>
              <CardDescription>
                Reverter publica de novo o conteúdo daquela versão e também vira
                uma versão, então dá para desfazer. Versões incompatíveis com a
                estrutura atual da página são recusadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.versoes.length ? (
                <ol className="grid gap-2">
                  {data.versoes.map((v, i) => (
                    <li
                      key={v.versao}
                      className="grid gap-2 rounded-lg border border-border p-3 text-sm"
                    >
                      <p>
                        <span className="font-medium">Versão {v.versao}</span> ·{' '}
                        {ORIGEM[v.origem]} ·{' '}
                        {new Date(v.publicadoEm).toLocaleString('pt-BR')}
                        {v.autor ? ` · ${v.autor}` : ''}
                        {i === 0 ? ' · publicada agora' : ''}
                      </p>
                      {v.nota ? (
                        <p className="text-muted-foreground">{v.nota}</p>
                      ) : null}
                      {i > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void comparar(v.versao)}
                          >
                            Ver o que mudaria
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={enviando || !notaValida}
                            onClick={() =>
                              void agir(
                                { acao: 'reverter', versao: v.versao },
                                'Revertido'
                              )
                            }
                          >
                            Reverter para esta versão
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma versão publicada ainda.
                </p>
              )}
              {!notaValida ? (
                <p className="text-xs text-muted-foreground">
                  Para publicar ou reverter, escreva a justificativa acima.
                </p>
              ) : null}
              {comparando ? (
                <div className="grid gap-2" aria-live="polite">
                  <p className="font-medium">
                    Reverter para a versão {comparando.versao} mudaria:
                  </p>
                  <ListaDeMudancas mudancas={comparando.mudancas} />
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
