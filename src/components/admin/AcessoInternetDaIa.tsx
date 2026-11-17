'use client';

import { useCallback, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Globe, Lock, Plus, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import type { AcessoInternet, ModoDeAcesso } from '@/lib/ai/internet/dominios';
import { normalizarDominio } from '@/lib/ai/internet/dominios';
import { buscarJson } from '@/lib/http/transporte';

const ROTA = '/api/admin/ia/internet';

interface Situacao {
  acesso: AcessoInternet;
  buscaDisponivel: boolean;
  consultas: Array<{
    id: number;
    tarefa: string;
    tipo: 'busca' | 'pagina';
    alvo: string;
    situacao: string;
    created_at: string;
  }>;
}

const MODOS: Array<{
  valor: ModoDeAcesso;
  titulo: string;
  texto: string;
  icone: typeof Globe;
}> = [
  {
    valor: 'lista',
    titulo: 'Só os sites liberados',
    texto:
      'O modelo busca e lê apenas os domínios da lista abaixo (recomendado).',
    icone: ShieldCheck,
  },
  {
    valor: 'total',
    titulo: 'Acesso total',
    texto:
      'O modelo pode ler qualquer site público. A rede interna continua bloqueada.',
    icone: Globe,
  },
  {
    valor: 'desligado',
    titulo: 'Desligado',
    texto: 'O modelo não acessa a internet.',
    icone: Lock,
  },
];

/**
 * Configuração do acesso do modelo de IA à internet (tarefa 212). Quem lê as
 * páginas é o servidor da Lyra, a pedido do modelo; o motor da Lyra não
 * acessa a rede.
 */
export function AcessoInternetDaIa() {
  const { session } = useAuth();
  const [editado, setEditado] = useState<{
    modo: ModoDeAcesso;
    dominios: string[];
  } | null>(null);
  const [novo, setNovo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [atual, setAtual] = useState<Situacao | null>(null);

  const pedir = useCallback(async () => {
    const resposta = await buscarJson(ROTA, { cache: 'no-store' });
    if (!resposta.ok) throw new Error(resposta.falha.message);
    return resposta.corpo as Situacao;
  }, []);
  const avisar = useCallback((erro: unknown) => {
    toast.error('Não foi possível ler o acesso à internet.', {
      description: erro instanceof Error ? erro.message : undefined,
    });
  }, []);
  const { data, loading } = useKeyedResource<Situacao | null>(
    session ? `internet:${session.user.id}` : null,
    pedir,
    avisar,
    null
  );
  const situacao = atual ?? data;
  const valor =
    editado ??
    (situacao
      ? { modo: situacao.acesso.modo, dominios: situacao.acesso.dominios }
      : null);

  function acrescentar() {
    if (!valor) return;
    const dominio = normalizarDominio(novo);
    if (!dominio) {
      toast.error('Domínio inválido.', {
        description: 'Use só o nome, por exemplo: inca.gov.br',
      });
      return;
    }
    if (!valor.dominios.includes(dominio)) {
      setEditado({ ...valor, dominios: [...valor.dominios, dominio] });
    }
    setNovo('');
  }

  async function salvar() {
    if (!valor) return;
    setSalvando(true);
    const resposta = await buscarJson(ROTA, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(valor),
    });
    setSalvando(false);
    if (!resposta.ok) {
      toast.error('Não foi possível salvar.', {
        description: resposta.falha.message,
      });
      return;
    }
    setAtual(resposta.corpo as Situacao);
    setEditado(null);
    toast.success('Acesso à internet atualizado.');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="size-5 text-primary" aria-hidden="true" />
          Acesso do modelo de IA à internet
        </CardTitle>
        <CardDescription>
          Usado nas tarefas administrativas, como a atualização dos exames
          médicos. O servidor faz a busca e a leitura das páginas, bloqueia a
          rede interna e registra cada consulta, sem dados de usuários.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading || !valor ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <RadioGroup
              value={valor.modo}
              onValueChange={(modo) =>
                setEditado({ ...valor, modo: modo as ModoDeAcesso })
              }
              className="grid gap-3 md:grid-cols-3"
              aria-label="Alcance do acesso à internet"
            >
              {MODOS.map(({ valor: modo, titulo, texto, icone: Icone }) => (
                <label
                  key={modo}
                  htmlFor={`internet-${modo}`}
                  className="flex cursor-pointer gap-3 rounded-xl border border-border bg-background p-4 transition-colors duration-(--duracao-rapida) hover:border-primary/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/8"
                >
                  <RadioGroupItem
                    id={`internet-${modo}`}
                    value={modo}
                    className="mt-1"
                  />
                  <span className="space-y-1">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Icone
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                      {titulo}
                    </span>
                    <span className="block text-xs leading-5 text-muted-foreground">
                      {texto}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>

            {valor.modo === 'lista' ? (
              <div className="space-y-3">
                <Label htmlFor="internet-novo-dominio">Sites liberados</Label>
                <ul
                  className="flex flex-wrap gap-2"
                  aria-label="Domínios liberados"
                >
                  {valor.dominios.map((dominio) => (
                    <li key={dominio}>
                      <Badge
                        variant="outline"
                        className="gap-1 py-1 pl-2.5 pr-1"
                      >
                        {dominio}
                        <button
                          type="button"
                          aria-label={`Retirar ${dominio}`}
                          className="rounded-sm p-0.5 hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() =>
                            setEditado({
                              ...valor,
                              dominios: valor.dominios.filter(
                                (d) => d !== dominio
                              ),
                            })
                          }
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </button>
                      </Badge>
                    </li>
                  ))}
                </ul>
                <div className="flex max-w-md gap-2">
                  <Input
                    id="internet-novo-dominio"
                    value={novo}
                    placeholder="exemplo: inca.gov.br"
                    onChange={(evento) => setNovo(evento.target.value)}
                    onKeyDown={(evento) => {
                      if (evento.key === 'Enter') {
                        evento.preventDefault();
                        acrescentar();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={acrescentar}>
                    <Plus aria-hidden="true" />
                    Liberar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cada domínio libera também os seus subdomínios (gov.br inclui
                  inca.gov.br).
                </p>
              </div>
            ) : null}

            {situacao && valor.modo !== 'desligado' ? (
              <p
                role="status"
                className={
                  situacao.buscaDisponivel
                    ? 'rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground'
                    : 'rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-foreground'
                }
              >
                {situacao.buscaDisponivel
                  ? 'Busca por termos ativa (API oficial do Brave Search). O modelo também navega pelos links das páginas lidas.'
                  : 'Busca por termos desativada: falta a variável BRAVE_SEARCH_API_KEY no servidor. O modelo continua lendo as páginas oficiais e navegando pelos links delas.'}
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                disabled={salvando || editado === null}
                onClick={() => void salvar()}
              >
                {salvando ? 'Salvando…' : 'Salvar acesso'}
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Últimas consultas do modelo
              </h3>
              {situacao && situacao.consultas.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/60 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Quando</th>
                        <th className="px-3 py-2 font-medium">Tarefa</th>
                        <th className="px-3 py-2 font-medium">Tipo</th>
                        <th className="px-3 py-2 font-medium">Alvo</th>
                        <th className="px-3 py-2 font-medium">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {situacao.consultas.map((consulta) => (
                        <tr
                          key={consulta.id}
                          className="border-t border-border"
                        >
                          <td className="whitespace-nowrap px-3 py-2">
                            {format(
                              new Date(
                                `${String(consulta.created_at).replace(' ', 'T')}Z`
                              ),
                              'dd/MM HH:mm',
                              { locale: ptBR }
                            )}
                          </td>
                          <td className="px-3 py-2">{consulta.tarefa}</td>
                          <td className="px-3 py-2">
                            {consulta.tipo === 'busca' ? 'Busca' : 'Página'}
                          </td>
                          <td
                            className="max-w-80 truncate px-3 py-2"
                            title={consulta.alvo}
                          >
                            {consulta.alvo}
                          </td>
                          <td className="px-3 py-2">{consulta.situacao}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhuma consulta registrada ainda.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
