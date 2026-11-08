'use client';
import type { EstadoDosGrupos } from '@/lib/plataforma/grupos';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  bloquearCofresAbertos,
  contaPendencias,
  criarCofre,
  desbloquearCofre,
  existeCofre,
  ouvirBloqueio,
  removerCofre,
  salvarCofre,
  type CofreAberto,
  type ItemLocal,
} from '@/lib/offline/cofre';
import { prepararPaginaOffline } from '@/lib/offline/preparacao';
import {
  operacaoSchema,
  type BaseOffline,
  type ContextoOffline,
  type OperacaoOffline,
  type ReciboOffline,
  type TipoOffline,
} from '@/lib/offline/esquema';
import { SIGNIFICADO_DA_NOTA } from '@/lib/reflexao/esquema';
import {
  CAMPOS_DO_REGISTRO,
  NOMES_DOS_CAMPOS,
  type CampoDoRegistro,
} from '@/lib/metricas/registro-do-dia';
const mensagem = (e: unknown) =>
  e instanceof TypeError
    ? 'Sem confirmação de conexão com o servidor. O rascunho continua no dispositivo.'
    : e instanceof Error
      ? e.message
      : 'Não foi possível concluir. Seus rascunhos salvos continuam no cofre.';
async function contexto(selecao: ContextoOffline['selecao']) {
  const r = await fetch(
    `/api/offline/contexto?registro=${+selecao.registro}&reflexao=${+selecao.reflexao}`,
    { credentials: 'include', cache: 'no-store' }
  );
  const b = await r.json();
  if (!r.ok)
    throw new Error(
      b.error ??
        'Entre na conta original com conexão para preparar ou confirmar seus registros.'
    );
  return b as ContextoOffline;
}
const estados = {
  pendente: 'Salvo neste dispositivo · envio pendente',
  enviando: 'Aguardando confirmação do servidor',
  conflito: 'Conflito · escolha necessária',
  erro: 'Envio não confirmado',
  sincronizado: 'Sincronizado com o servidor',
};
export function CentralOffline() {
  const [permitido, setPermitido] = useState(false);
  useEffect(() => {
    let ativa = true;
    const chave = 'lyra:disponibilidade-offline';
    const aplicar = (grupos: Partial<EstadoDosGrupos> | null) => {
      if (ativa)
        setPermitido(
          grupos?.registros_saude === true && grupos?.diario_reflexao === true
        );
    };
    const verificar = async () => {
      try {
        const resposta = await fetch('/api/plataforma/funcionalidades', {
          cache: 'no-store',
        });
        if (!resposta.ok) {
          aplicar(null);
          return;
        }
        const grupos = (await resposta.json()) as EstadoDosGrupos;
        aplicar(grupos);
        try {
          localStorage.setItem(chave, JSON.stringify(grupos));
        } catch {
          /* A restrição do servidor continua valendo. */
        }
      } catch {
        if (navigator.onLine) {
          aplicar(null);
          return;
        }
        try {
          aplicar(JSON.parse(localStorage.getItem(chave) ?? 'null'));
        } catch {
          aplicar(null);
        }
      }
    };
    void verificar();
    window.addEventListener('online', verificar);
    const intervalo = window.setInterval(() => void verificar(), 30_000);
    return () => {
      ativa = false;
      clearInterval(intervalo);
      window.removeEventListener('online', verificar);
    };
  }, []);
  return permitido ? (
    <CofreOfflineAtivo />
  ) : (
    <main className="mx-auto max-w-xl p-6">
      <Link href="/">Voltar ao aplicativo</Link>
    </main>
  );
}

function CofreOfflineAtivo() {
  const [cofre, setCofre] = useState<CofreAberto | null>(null),
    atual = useRef<CofreAberto | null>(null),
    geracao = useRef(0),
    ocupada = useRef(false);
  const [existe, setExiste] = useState<boolean | null>(null),
    [online, setOnline] = useState(false),
    [busy, setBusy] = useState(false),
    [erro, setErro] = useState(''),
    [aviso, setAviso] = useState('');
  const [frase, setFrase] = useState(''),
    [repeticao, setRepeticao] = useState(''),
    [registro, setRegistro] = useState(false),
    [reflexao, setReflexao] = useState(false),
    [consentiu, setConsentiu] = useState(false),
    [exclusao, setExclusao] = useState('');
  const [tipo, setTipo] = useState<TipoOffline>('registro'),
    [data, setData] = useState(''),
    [valores, setValores] = useState<Partial<Record<CampoDoRegistro, string>>>(
      {}
    ),
    [escalas, setEscalas] = useState({
      emocional: '',
      corpo: '',
      espiritual: '',
    }),
    [nota, setNota] = useState('');
  const tituloDoCofre = useRef<HTMLHeadingElement>(null);
  const cofreAberto = Boolean(cofre);
  useEffect(() => {
    if (cofreAberto) tituloDoCofre.current?.focus();
  }, [cofreAberto]);
  const sincronizador = useRef<() => Promise<void>>(async () => {});
  const publicar = useCallback((c: CofreAberto | null) => {
    atual.current = c;
    setCofre(c);
  }, []);
  const bloquear = useCallback(() => {
    geracao.current++;
    publicar(null);
    setFrase('');
    setRepeticao('');
    setValores({});
    setEscalas({ emocional: '', corpo: '', espiritual: '' });
    setNota('');
    setData('');
  }, [publicar]);
  useEffect(() => {
    const atualizar = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void sincronizador.current();
    };
    atualizar();
    void existeCofre()
      .then(setExiste)
      .catch((e) => setErro(mensagem(e)));
    const parar = ouvirBloqueio(() => {
      bloquear();
      setAviso('O cofre foi bloqueado. Abra novamente com sua frase local.');
    });
    window.addEventListener('online', atualizar);
    window.addEventListener('offline', atualizar);
    const aoSair = () => bloquear();
    window.addEventListener('pagehide', aoSair);
    return () => {
      parar();
      window.removeEventListener('online', atualizar);
      window.removeEventListener('offline', atualizar);
      window.removeEventListener('pagehide', aoSair);
    };
  }, [bloquear]);
  async function persistir(
    c: CofreAberto,
    conteudo: CofreAberto['conteudo'],
    g: number
  ) {
    const salvo = await salvarCofre(c, conteudo);
    if (geracao.current !== g)
      throw new Error(
        'O cofre foi bloqueado. Abra novamente para conferir o que ficou salvo.'
      );
    publicar(salvo);
    return salvo;
  }
  async function executar(acao: (g: number) => Promise<void>) {
    if (ocupada.current) return;
    ocupada.current = true;
    setBusy(true);
    setErro('');
    setAviso('');
    try {
      await acao(geracao.current);
    } catch (e) {
      setErro(mensagem(e));
    } finally {
      ocupada.current = false;
      setBusy(false);
    }
  }
  async function sincronizar() {
    if (!atual.current || !navigator.onLine || ocupada.current) return;
    await executar(async (g) => {
      let c = atual.current!;
      const novo = await contexto(c.conteudo.contexto.selecao);
      if (novo.titular !== c.conteudo.contexto.titular) {
        bloquearCofresAbertos();
        throw new Error(
          'A conta conectada é diferente da titular do cofre. Entre na conta original para sincronizar.'
        );
      }
      c = await persistir(c, { ...c.conteudo, contexto: novo }, g);
      for (const item of c.conteudo.itens) {
        if (geracao.current !== g) return;
        if (
          item.estado === 'conflito' ||
          (item.estado === 'sincronizado' &&
            item.recibo?.recalculos === 'concluidos')
        )
          continue;
        const enviando: ItemLocal = {
          ...item,
          tentada: true,
          estado: 'enviando',
          erro: null,
        };
        c = await persistir(
          c,
          {
            ...c.conteudo,
            itens: c.conteudo.itens.map((i) =>
              i.operacao.id === item.operacao.id ? enviando : i
            ),
          },
          g
        );
        let retorno: ItemLocal;
        try {
          const r = await fetch('/api/offline/sincronizar', {
            method: 'POST',
            credentials: 'include',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              permissao: novo.permissao,
              operacao: item.operacao,
            }),
          });
          const b = await r.json();
          if (r.status === 401)
            throw new Error(
              'Sessão encerrada. Entre na conta original; o envio será confirmado pelo mesmo identificador.'
            );
          retorno = r.ok
            ? {
                ...enviando,
                estado: 'sincronizado',
                recibo: b as ReciboOffline,
              }
            : {
                ...enviando,
                estado: b.codigo === 'conflito' ? 'conflito' : 'erro',
                atual: b.atual ?? null,
                erro: b.error ?? 'O servidor não confirmou o envio.',
              };
        } catch (e) {
          retorno = { ...enviando, estado: 'erro', erro: mensagem(e) };
        }
        c = await persistir(
          c,
          {
            ...c.conteudo,
            itens: c.conteudo.itens.map((i) =>
              i.operacao.id === item.operacao.id ? retorno : i
            ),
          },
          g
        );
        if (retorno.estado === 'erro') break;
      }
      setAviso(
        'Conferência encerrada. Veja o estado individual de cada registro.'
      );
    });
  }
  useEffect(() => {
    sincronizador.current = sincronizar;
  });
  const bases =
    cofre?.conteudo.contexto.bases.filter((b) => b.tipo === tipo) ?? [];
  const selecionada = bases.find((b) => b.data === data);
  async function abrir() {
    await executar(async (g) => {
      const c = await desbloquearCofre(frase);
      if (geracao.current !== g) return;
      publicar(c);
      setFrase('');
      setRepeticao('');
      const b = c.conteudo.contexto.bases.at(-1);
      if (b) {
        setTipo(b.tipo);
        setData(b.data);
      }
    });
    if (atual.current && navigator.onLine) void sincronizador.current();
  }
  async function preparar() {
    await executar(async (g) => {
      if (!consentiu || (!registro && !reflexao))
        throw new Error(
          'Escolha os dados e confirme a proteção neste dispositivo.'
        );
      if (frase !== repeticao)
        throw new Error('As frases locais precisam ser iguais.');
      if (frase.normalize('NFC').length < 12)
        throw new Error('Use pelo menos 12 caracteres na frase local.');
      const c = await contexto({ registro, reflexao });
      if (!c.bases.length)
        throw new Error(
          'Nenhum dos registros escolhidos está disponível no seu plano atual.'
        );
      await prepararPaginaOffline();
      if (geracao.current !== g) return;
      const aberto = await criarCofre(frase, c);
      publicar(aberto);
      setExiste(true);
      setFrase('');
      setRepeticao('');
      const b = c.bases.at(-1)!;
      setTipo(b.tipo);
      setData(b.data);
      setAviso(
        'Preparação concluída. A página e o cofre protegido estão disponíveis neste navegador.'
      );
    });
  }
  async function salvar() {
    await executar(async (g) => {
      const c = atual.current;
      if (!c || !selecionada)
        throw new Error('Escolha uma data preparada para este registro.');
      if (
        c.conteudo.itens.some(
          (i) =>
            i.estado !== 'sincronizado' &&
            i.operacao.tipo === tipo &&
            i.operacao.conteudo.data === data
        )
      )
        throw new Error(
          'Já há um rascunho pendente para essa data. Confirme ou remova-o antes de criar outro.'
        );
      const op = operacaoSchema.safeParse({
        id: crypto.randomUUID(),
        base: selecionada.revisao,
        salvoLocalEm: new Date().toISOString(),
        tipo,
        conteudo:
          tipo === 'registro'
            ? {
                data,
                valores: Object.fromEntries(
                  Object.entries(valores)
                    .filter(([, v]) => v?.trim() !== '')
                    .map(([k, v]) => [k, Number(v)])
                ),
              }
            : {
                data,
                emocional: Number(escalas.emocional),
                corpo: Number(escalas.corpo),
                espiritual: Number(escalas.espiritual),
                frase: nota.trim() || null,
              },
      });
      if (!op.success)
        throw new Error(op.error.issues[0]?.message ?? 'Confira os campos.');
      const itens = [
        ...c.conteudo.itens.filter(
          (i) =>
            i.estado !== 'sincronizado' || i.recibo?.recalculos !== 'concluidos'
        ),
        {
          operacao: op.data,
          estado: 'pendente' as const,
          tentada: false,
          erro: null,
          atual: null,
          recibo: null,
        },
      ];
      if (itens.length > 32)
        throw new Error(
          'Confirme ou remova rascunhos antes de salvar mais. O limite é 32.'
        );
      await persistir(c, { ...c.conteudo, itens }, g);
      setValores({});
      setEscalas({ emocional: '', corpo: '', espiritual: '' });
      setNota('');
      setAviso(
        'Salvo e criptografado neste dispositivo. Ainda não é confirmação do servidor.'
      );
    });
    if (atual.current && navigator.onLine) void sincronizador.current();
  }
  async function escolher(item: ItemLocal, manterLocal: boolean) {
    await executar(async (g) => {
      const c = atual.current!;
      let itens: ItemLocal[];
      if (manterLocal && item.atual) {
        const operacao = {
          ...item.operacao,
          id: crypto.randomUUID(),
          base: item.atual.revisao,
          salvoLocalEm: new Date().toISOString(),
        } as OperacaoOffline;
        itens = c.conteudo.itens.map((i) =>
          i.operacao.id === item.operacao.id
            ? {
                operacao,
                estado: 'pendente',
                tentada: false,
                erro: null,
                atual: null,
                recibo: null,
              }
            : i
        );
      } else
        itens = c.conteudo.itens.filter(
          (i) => i.operacao.id !== item.operacao.id
        );
      const contextoAtual = item.atual
        ? {
            ...c.conteudo.contexto,
            bases: c.conteudo.contexto.bases.map((b) =>
              b.tipo === item.atual!.tipo && b.data === item.atual!.data
                ? item.atual!
                : b
            ),
          }
        : c.conteudo.contexto;
      await persistir(c, { ...c.conteudo, contexto: contextoAtual, itens }, g);
      setAviso(
        manterLocal
          ? 'Sua escolha foi salva. Confirme o envio; se o servidor mudar de novo, haverá nova revisão.'
          : 'Rascunho removido por sua escolha. Nenhum registro do servidor foi apagado.'
      );
    });
  }
  function versao(b: BaseOffline) {
    return b.tipo === 'registro'
      ? Object.entries(b.valores)
          .filter(([, v]) => v !== null)
          .map(
            ([k, v]) =>
              `${CAMPOS_DO_REGISTRO[k as CampoDoRegistro].rotulo}: ${v}`
          )
          .join(' · ') || 'Sem métricas informadas'
      : b.reflexao
        ? `Emocional ${b.reflexao.emocional}/5 · Corpo ${b.reflexao.corpo}/5 · Espiritual ${b.reflexao.espiritual}/5 · ${b.reflexao.frase ?? 'Sem nota'}`
        : 'Sem reflexão';
  }
  return (
    <main
      id="conteudo-principal"
      className="section-shell max-w-4xl space-y-6 py-8"
    >
      <header className="space-y-3">
        <Link
          href="/"
          prefetch={false}
          onClick={(e) => {
            e.preventDefault();
            // Requisição de documento: permite ao service worker abrir /offline sem rede.

            window.location.assign(new URL('/', window.location.origin));
          }}
          className="text-primary underline underline-offset-4"
        >
          Voltar à Lyra
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          Seus registros, mesmo sem internet
        </h1>
        <p className="text-muted-foreground">
          Prepare este navegador enquanto estiver conectado. Check-in manual e
          reflexão ficam protegidos por sua frase local. Chat, análise de IA e
          alertas do servidor exigem conexão.
        </p>
        <p role="status" className="text-sm font-medium">
          {online
            ? 'Navegador com conexão disponível; o servidor será conferido em cada envio.'
            : 'Sem conexão · registros salvos ficam neste dispositivo.'}
        </p>
      </header>
      {erro && (
        <p
          role="alert"
          className="rounded-lg border border-destructive p-3 text-destructive"
        >
          {erro}
        </p>
      )}
      {aviso && (
        <p role="status" className="rounded-lg border p-3">
          {aviso}
        </p>
      )}
      {!cofre ? (
        <Card>
          <CardHeader>
            <CardTitle as="h2">
              {existe
                ? 'Abrir o cofre deste dispositivo'
                : 'Preparar seu dispositivo'}
            </CardTitle>
            <CardDescription>
              A frase local é diferente da senha da conta, não sai deste
              navegador e não pode ser recuperada pela Lyra. Guarde-a em local
              seguro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {existe === null ? (
              <p role="status">Conferindo armazenamento local…</p>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void (existe ? abrir() : preparar());
                }}
              >
                {!existe && (
                  <fieldset className="space-y-3">
                    <legend className="mb-2 font-medium">
                      Escolha o que copiar para este navegador
                    </legend>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        disabled={busy}
                        id="preparar-registro"
                        checked={registro}
                        onCheckedChange={(v) => setRegistro(v === true)}
                      />
                      <Label htmlFor="preparar-registro">
                        Check-in manual · até os últimos 7 dias permitidos
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        disabled={busy}
                        id="preparar-reflexao"
                        checked={reflexao}
                        onCheckedChange={(v) => setReflexao(v === true)}
                      />
                      <Label htmlFor="preparar-reflexao">
                        Reflexão · hoje e ontem, conforme seu plano
                      </Label>
                    </div>
                  </fieldset>
                )}
                <div className="space-y-2">
                  <Label htmlFor="frase-local">Frase local de proteção</Label>
                  <Input
                    disabled={busy}
                    id="frase-local"
                    type="password"
                    autoComplete="off"
                    minLength={12}
                    required
                    value={frase}
                    onChange={(e) => setFrase(e.target.value)}
                  />
                </div>
                {!existe && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="repetir-frase">
                        Repita a frase local
                      </Label>
                      <Input
                        disabled={busy}
                        id="repetir-frase"
                        type="password"
                        autoComplete="off"
                        minLength={12}
                        required
                        value={repeticao}
                        onChange={(e) => setRepeticao(e.target.value)}
                      />
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        disabled={busy}
                        id="consentir-local"
                        checked={consentiu}
                        onCheckedChange={(v) => setConsentiu(v === true)}
                      />
                      <Label htmlFor="consentir-local" className="leading-6">
                        Autorizo a cópia criptografada dos dados escolhidos
                        neste dispositivo. Ela permanece após sair da conta,
                        exige a frase para abrir e pode ser perdida se o
                        navegador limpar o armazenamento.
                      </Label>
                    </div>
                  </>
                )}
                <Button
                  disabled={
                    busy ||
                    (!existe &&
                      (!online || !consentiu || (!registro && !reflexao)))
                  }
                  type="submit"
                >
                  {busy
                    ? 'Aguarde…'
                    : existe
                      ? 'Abrir cofre'
                      : 'Preparar para usar sem internet'}
                </Button>
              </form>
            )}
            <p className="text-sm text-muted-foreground">
              Para preparar ou sincronizar,{' '}
              <a className="text-primary underline" href="/login">
                entre na conta original
              </a>{' '}
              com conexão. Não use dispositivo compartilhado. O armazenamento do
              navegador pode ser removido pelo sistema; confirme os envios assim
              que possível.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle as="h2" ref={tituloDoCofre} tabIndex={-1}>
                Cofre de {cofre.conteudo.contexto.nome}
              </CardTitle>
              <CardDescription>
                Fuso preparado: {cofre.conteudo.contexto.fuso}. Datas copiadas
                em{' '}
                {new Date(cofre.conteudo.contexto.emitidoEm).toLocaleString(
                  'pt-BR'
                )}
                . A permissão é renovada ao confirmar online na mesma conta; as
                janelas de edição continuam valendo.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                disabled={busy || !online}
                onClick={() => void sincronizar()}
              >
                Conferir e sincronizar
              </Button>
              <Button variant="outline" onClick={bloquearCofresAbertos}>
                Bloquear cofre
              </Button>
              <p className="w-full text-sm">
                {contaPendencias(cofre.conteudo)} registro(s) sem confirmação.
                Sair da conta bloqueia o cofre; a cópia criptografada permanece
                até sua remoção.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle as="h2">Salvar um registro local</CardTitle>
              <CardDescription>
                Preencha apenas o que você mediu ou sentiu. Campos de métricas
                vazios não apagam valores. A reflexão substitui as três escalas
                e a nota da data somente após confirmação sem conflito.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void salvar();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tipo-local">Tipo de registro</Label>
                    <Select
                      value={tipo}
                      disabled={busy}
                      onValueChange={(v) => {
                        const t = v as TipoOffline;
                        setTipo(t);
                        const ds = cofre.conteudo.contexto.bases.filter(
                          (b) => b.tipo === t
                        );
                        setData(
                          ds.find(
                            (b) => b.data === cofre.conteudo.contexto.hoje
                          )?.data ??
                            ds.at(-1)?.data ??
                            ''
                        );
                        setValores({});
                      }}
                    >
                      <SelectTrigger id="tipo-local">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="registro"
                          disabled={!cofre.conteudo.contexto.recursos.registro}
                        >
                          Check-in manual
                        </SelectItem>
                        <SelectItem
                          value="reflexao"
                          disabled={!cofre.conteudo.contexto.recursos.reflexao}
                        >
                          Reflexão
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data-local">Data preparada</Label>
                    <Select
                      value={data}
                      disabled={busy}
                      onValueChange={setData}
                    >
                      <SelectTrigger id="data-local">
                        <SelectValue placeholder="Escolha uma data" />
                      </SelectTrigger>
                      <SelectContent>
                        {bases.map((b) => (
                          <SelectItem key={b.data} value={b.data}>
                            {b.data.split('-').reverse().join('/')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {selecionada && (
                  <details className="rounded-md border p-3">
                    <summary className="cursor-pointer font-medium">
                      Versão copiada do servidor
                    </summary>
                    <p className="mt-3 break-words text-sm">
                      {versao(selecionada)}
                    </p>
                  </details>
                )}
                {tipo === 'registro' ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {NOMES_DOS_CAMPOS.map((k) => {
                      const d = CAMPOS_DO_REGISTRO[k];
                      return (
                        <div key={k} className="space-y-2">
                          <Label htmlFor={`local-${k}`}>
                            {d.rotulo}
                            {'unidade' in d ? ` (${d.unidade})` : ''}
                          </Label>
                          <Input
                            disabled={busy}
                            id={`local-${k}`}
                            type="number"
                            min={d.minimo}
                            max={d.maximo}
                            step={10 ** -d.casas}
                            value={valores[k] ?? ''}
                            onChange={(e) =>
                              setValores((v) => ({ ...v, [k]: e.target.value }))
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <p
                      className="text-sm text-muted-foreground"
                      id="significado-notas"
                    >
                      {Object.entries(SIGNIFICADO_DA_NOTA)
                        .map(([n, texto]) => `${n}: ${texto}`)
                        .join(' · ')}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-3">
                      {(['emocional', 'corpo', 'espiritual'] as const).map(
                        (k) => (
                          <div className="space-y-2" key={k}>
                            <Label htmlFor={`local-${k}`}>
                              {k === 'emocional'
                                ? 'Emocional'
                                : k === 'corpo'
                                  ? 'Corpo'
                                  : 'Espiritual'}{' '}
                              (1 a 5)
                            </Label>
                            <Input
                              disabled={busy}
                              id={`local-${k}`}
                              aria-describedby="significado-notas"
                              type="number"
                              min={1}
                              max={5}
                              step={1}
                              required
                              value={escalas[k]}
                              onChange={(e) =>
                                setEscalas((v) => ({
                                  ...v,
                                  [k]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        )
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nota-local">
                        Nota opcional (até 280 caracteres)
                      </Label>
                      <Textarea
                        disabled={busy}
                        id="nota-local"
                        maxLength={280}
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                      />
                    </div>
                  </>
                )}
                <Button type="submit" disabled={busy || !selecionada}>
                  Salvar neste dispositivo
                </Button>
              </form>
            </CardContent>
          </Card>
          <section aria-labelledby="titulo-envios" className="space-y-4">
            <h2 id="titulo-envios" className="text-xl font-semibold">
              Registros e confirmações
            </h2>
            {cofre.conteudo.itens.length === 0 && (
              <p>Nenhum registro local salvo.</p>
            )}
            {cofre.conteudo.itens.map((i) => (
              <Card key={i.operacao.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {i.operacao.tipo === 'registro' ? 'Check-in' : 'Reflexão'} ·{' '}
                    {i.operacao.conteudo.data.split('-').reverse().join('/')}
                  </CardTitle>
                  <CardDescription>{estados[i.estado]}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="break-words text-sm">
                    {i.operacao.tipo === 'registro'
                      ? Object.entries(i.operacao.conteudo.valores)
                          .map(
                            ([k, v]) =>
                              `${CAMPOS_DO_REGISTRO[k as CampoDoRegistro].rotulo}: ${v}`
                          )
                          .join(' · ')
                      : `Emocional ${i.operacao.conteudo.emocional}/5 · Corpo ${i.operacao.conteudo.corpo}/5 · Espiritual ${i.operacao.conteudo.espiritual}/5 · ${i.operacao.conteudo.frase ?? 'Sem nota'}`}
                  </p>
                  {i.erro && (
                    <p className="text-sm text-destructive">{i.erro}</p>
                  )}
                  {i.recibo && (
                    <p className="text-sm">
                      Confirmado em{' '}
                      {new Date(i.recibo.aplicadoEm).toLocaleString('pt-BR')} ·{' '}
                      {i.recibo.recalculos === 'concluidos'
                        ? 'Indicadores atualizados'
                        : 'Dado salvo; indicadores aguardam nova conferência'}
                      .
                    </p>
                  )}
                  {i.atual && (
                    <div className="space-y-3 rounded-md border p-3">
                      <p className="font-medium">Versão atual do servidor</p>
                      <p className="break-words text-sm">{versao(i.atual)}</p>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          disabled={busy}
                          variant="outline"
                          onClick={() => void escolher(i, false)}
                        >
                          Manter servidor e descartar rascunho
                        </Button>
                        <Button
                          disabled={busy}
                          onClick={() => void escolher(i, true)}
                        >
                          Usar meus campos locais nesta versão
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        A escolha local cria um novo envio. Nenhum conflito é
                        substituído automaticamente.
                      </p>
                    </div>
                  )}
                  {!i.atual && (
                    <details>
                      <summary className="cursor-pointer text-sm underline">
                        Remover esta cópia local
                      </summary>
                      <p className="my-3 text-sm">
                        {i.tentada
                          ? 'O servidor pode já ter recebido este envio. Remover a cópia não desfaz uma gravação remota. Confira online antes de remover.'
                          : 'O rascunho ainda não foi enviado. Esta remoção é definitiva.'}
                      </p>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => void escolher(i, false)}
                      >
                        Confirmar remoção desta cópia
                      </Button>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>
        </>
      )}
      {existe && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">Remover o cofre deste navegador</CardTitle>
            <CardDescription>
              Apaga definitivamente a cópia local, inclusive rascunhos não
              enviados. Não apaga registros do servidor. Outros dispositivos
              precisam ser limpos separadamente, inclusive após excluir sua
              conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="excluir-local">Digite REMOVER para confirmar</Label>
            <Input
              disabled={busy}
              id="excluir-local"
              autoComplete="off"
              value={exclusao}
              onChange={(e) => setExclusao(e.target.value)}
            />
            <Button
              variant="destructive"
              disabled={busy || exclusao !== 'REMOVER'}
              onClick={() =>
                void executar(async () => {
                  await removerCofre();
                  bloquear();
                  setExiste(false);
                  setExclusao('');
                  setAviso('Cofre removido deste navegador.');
                })
              }
            >
              Remover cofre local
            </Button>
          </CardContent>
        </Card>
      )}
      <footer className="border-t pt-4 text-sm text-muted-foreground">
        Apenas esta página pública e o código do app são armazenados sem
        criptografia. Dados escolhidos e rascunhos ficam cifrados. Bloqueie ao
        terminar e proteja o acesso ao aparelho. Sem conexão, a Lyra não
        confirma sessão, não envia registros e não produz análises de IA.
      </footer>
    </main>
  );
}
