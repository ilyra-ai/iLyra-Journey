'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CalendarRange,
  Layers3,
  MapPinned,
  MoonStar,
  Orbit,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SplashScreen } from '@/components/SplashScreen';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Tipo =
  'transitos' | 'd9' | 'd10' | 'astrocartografia' | 'retornos' | 'eclipses';
type Zodiaco = 'sideral' | 'tropical';
type Ponto = { latitude: number; longitude: number };
type Linha = {
  planeta: string;
  angulo: 'MC' | 'IC' | 'AS' | 'DS';
  segmentos: Ponto[][];
};
type Transito = {
  utc: string;
  transito: string;
  natal: string;
  aspecto: string;
  angulo: number;
  longitudeNatal: number;
  longitudeEmTransito: number;
  movimento: string;
};
type Eclipse = {
  tipo: 'solar' | 'lunar';
  classificacao: string;
  utc: string;
  visivel: boolean;
  obscuracao: number | null;
  detalhe: string;
};
type Retorno = {
  instanteUtc: string;
  longitudeNatal: number;
  longitudeDoRetorno: number;
  ascendente: number;
  local: { nome: string };
  planetas: {
    planeta: string;
    longitude: number;
    signo: number;
    casa: number;
  }[];
};
type Divisional = {
  graha: string;
  nomeDoSigno: string;
  casa: number | null;
  porcao: number;
  vargottama: boolean;
};
type Resultado = {
  versao: number;
  metodo?: string;
  limite?: string;
  interpretacao?: string;
  zodiaco?: string;
  eventos?: (Transito | Eclipse)[];
  retornos?: Retorno[];
  planetas?: Divisional[];
  ascendente?: { nomeDoSigno: string } | null;
  linhas?: Linha[];
  comparacao?: {
    ascendenteOriginal: number;
    ascendenteRelocado: number;
  };
};
type Consulta = {
  tipo: Tipo;
  zodiaco: Zodiaco;
  inicio: string;
  dias: string;
  corpo: 'sol' | 'lua';
  latitude: string;
  longitude: string;
};

const OPCOES: {
  id: Tipo;
  nome: string;
  descricao: string;
  icone: LucideIcon;
}[] = [
  {
    id: 'transitos',
    nome: 'Trânsitos exatos',
    descricao: 'Instantes de aspectos geométricos com as posições natais.',
    icone: Orbit,
  },
  {
    id: 'd9',
    nome: 'Navamsa D9',
    descricao: 'Carta divisional védica derivada dos graus siderais natais.',
    icone: Layers3,
  },
  {
    id: 'd10',
    nome: 'Dashamsa D10',
    descricao: 'Carta divisional védica de aprofundamento tradicional.',
    icone: Layers3,
  },
  {
    id: 'astrocartografia',
    nome: 'Astrocartografia',
    descricao: 'Linhas angulares no globo e ascendente relocalizado.',
    icone: MapPinned,
  },
  {
    id: 'retornos',
    nome: 'Retornos solar e lunar',
    descricao: 'Cartas construídas nos retornos exatos ao grau natal.',
    icone: CalendarRange,
  },
  {
    id: 'eclipses',
    nome: 'Eclipses por localidade',
    descricao: 'Eventos solares e lunares calculados para a região.',
    icone: MoonStar,
  },
];

function dataUtc(valor: string) {
  return (
    new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(valor)) + ' UTC'
  );
}

function grau(valor: number) {
  return valor.toFixed(2).replace('.', ',') + '°';
}

function pontosNoMapa(pontos: Ponto[]) {
  return pontos
    .map(
      (ponto) => (ponto.longitude + 180) * 2 + ',' + (90 - ponto.latitude) * 2
    )
    .join(' ');
}

function MapaAngular({ linhas }: { linhas: Linha[] }) {
  const [planeta, setPlaneta] = useState('todos');
  const nomes = useMemo(
    () => [...new Set(linhas.map((linha) => linha.planeta))],
    [linhas]
  );
  const filtradas = useMemo(
    () =>
      linhas.filter(
        (linha) => planeta === 'todos' || linha.planeta === planeta
      ),
    [linhas, planeta]
  );

  return (
    <section className="space-y-4" aria-label="Mapa de astrocartografia">
      <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
        Filtrar linhas por planeta
        <select
          className="h-11 rounded border border-input bg-card px-3"
          value={planeta}
          onChange={(evento) => setPlaneta(evento.target.value)}
        >
          <option value="todos">Todos os planetas</option>
          {nomes.map((nome) => (
            <option key={nome} value={nome}>
              {nome}
            </option>
          ))}
        </select>
      </label>
      <svg
        role="img"
        aria-label="Mapa mundial com linhas geográficas dos planetas"
        viewBox="0 0 720 360"
        className="w-full rounded-xl border border-border bg-muted"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Astrocartografia sobre contornos Natural Earth</title>
        <image
          href="/world-countries.svg"
          x="0"
          y="0"
          width="720"
          height="360"
        />
        {Array.from({ length: 13 }, (_, i) => (
          <line
            key={'meridiano-' + i}
            x1={i * 60}
            x2={i * 60}
            y1="0"
            y2="360"
            stroke="currentColor"
            strokeWidth="0.7"
            opacity="0.14"
          />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <line
            key={'paralelo-' + i}
            x1="0"
            x2="720"
            y1={i * 60}
            y2={i * 60}
            stroke="currentColor"
            strokeWidth="0.7"
            opacity="0.14"
          />
        ))}
        {filtradas.flatMap((linha, i) =>
          linha.segmentos.map((segmento, j) => (
            <polyline
              key={linha.planeta + linha.angulo + i + '-' + j}
              points={pontosNoMapa(segmento)}
              fill="none"
              stroke={
                linha.angulo === 'AS' || linha.angulo === 'MC'
                  ? '#187d81'
                  : '#bf604d'
              }
              strokeWidth="1.8"
              strokeDasharray={
                linha.angulo === 'AS' || linha.angulo === 'DS'
                  ? '6 4'
                  : undefined
              }
            />
          ))
        )}
      </svg>
      <p className="text-xs leading-5 text-muted-foreground">
        Contornos mundiais Natural Earth (domínio público). AS e DS são
        tracejados; MC e IC, contínuos. A geometria é geocêntrica e não inclui
        paralaxe lunar, refração ou relevo.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(['AS', 'DS', 'MC', 'IC'] as const).map((angulo) => (
          <div
            key={angulo}
            className="rounded border border-border p-3 text-sm"
          >
            <strong>{angulo}</strong>
            {' · '}
            {filtradas.filter((linha) => linha.angulo === angulo).length}
            {' linhas'}
          </div>
        ))}
      </div>
    </section>
  );
}

function Conteudo({ tipo, dados }: { tipo: Tipo; dados: Resultado }) {
  if (tipo === 'd9' || tipo === 'd10') {
    return (
      <div className="space-y-3">
        <p className="text-sm">
          Ascendente divisional:{' '}
          <strong>{dados.ascendente?.nomeDoSigno ?? 'Não calculável'}</strong>
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(dados.planetas ?? []).map((posicao) => (
            <article
              key={posicao.graha}
              className="rounded-lg border border-border p-4"
            >
              <h3 className="font-semibold capitalize">{posicao.graha}</h3>
              <p>
                {posicao.nomeDoSigno} · divisão {posicao.porcao}
              </p>
              <p className="text-sm text-muted-foreground">
                {posicao.casa ? 'Casa ' + posicao.casa : 'Casa indeterminada'}
                {posicao.vargottama ? ' · Vargottama' : ''}
              </p>
            </article>
          ))}
        </div>
      </div>
    );
  }
  if (tipo === 'transitos') {
    const eventos = (dados.eventos ?? []) as Transito[];
    return (
      <div className="grid gap-2 md:grid-cols-2">
        {eventos.length === 0 ? (
          <p>Nenhum aspecto exato encontrado no intervalo.</p>
        ) : (
          eventos.map((evento, indice) => (
            <article
              key={evento.utc + evento.transito + evento.natal + indice}
              className="rounded-lg border border-border p-3"
            >
              <h3 className="font-medium capitalize">
                {evento.transito} em {evento.aspecto} com {evento.natal} natal
              </h3>
              <p className="text-sm text-muted-foreground">
                {dataUtc(evento.utc)} · {evento.movimento} · grau natal{' '}
                {grau(evento.longitudeNatal)}
              </p>
            </article>
          ))
        )}
      </div>
    );
  }
  if (tipo === 'retornos') {
    return (
      <div className="space-y-3">
        {(dados.retornos ?? []).length === 0 ? (
          <p>Nenhum retorno no intervalo pesquisado.</p>
        ) : (
          (dados.retornos ?? []).map((retorno) => (
            <article
              key={retorno.instanteUtc}
              className="rounded-lg border border-border p-4"
            >
              <h3 className="font-semibold">
                Retorno em {dataUtc(retorno.instanteUtc)}
              </h3>
              <p className="text-sm">
                Longitude: {grau(retorno.longitudeDoRetorno)} · Ascendente:{' '}
                {grau(retorno.ascendente)}
              </p>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-medium">
                  Conferir posições e casas calculadas
                </summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {retorno.planetas.map((p) => (
                    <p key={p.planeta} className="capitalize">
                      {p.planeta}: {grau(p.longitude)} · casa {p.casa}
                    </p>
                  ))}
                </div>
              </details>
            </article>
          ))
        )}
      </div>
    );
  }
  if (tipo === 'eclipses') {
    const eventos = (dados.eventos ?? []) as Eclipse[];
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {eventos.length === 0 ? (
          <p>Nenhum eclipse no intervalo pesquisado.</p>
        ) : (
          eventos.map((evento) => (
            <article
              key={evento.utc + evento.tipo}
              className="rounded-lg border border-border p-4"
            >
              <h3 className="font-semibold">
                Eclipse {evento.tipo} · {evento.classificacao}
              </h3>
              <p className="text-sm">
                {dataUtc(evento.utc)} ·{' '}
                {evento.visivel
                  ? 'Ao menos uma fase acima do horizonte'
                  : 'Sem visibilidade local confirmada'}
              </p>
              {evento.obscuracao !== null && (
                <p className="text-sm">
                  Obscuração: {(evento.obscuracao * 100).toFixed(1)}%
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {evento.detalhe}
              </p>
            </article>
          ))
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {dados.linhas && <MapaAngular linhas={dados.linhas} />}
      <p className="text-sm">
        Ascendente natal:{' '}
        <strong>
          {dados.comparacao
            ? grau(dados.comparacao.ascendenteOriginal)
            : 'Não calculável'}
        </strong>
        . Ascendente no local escolhido:{' '}
        <strong>
          {dados.comparacao
            ? grau(dados.comparacao.ascendenteRelocado)
            : 'Não calculável'}
        </strong>
        .
      </p>
    </div>
  );
}

function ExploradorDeInovacoes() {
  const [tipo, setTipo] = useState<Tipo>('transitos');
  const [zodiaco, setZodiaco] = useState<Zodiaco>('sideral');
  const [inicio, setInicio] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [dias, setDias] = useState('14');
  const [corpo, setCorpo] = useState<'sol' | 'lua'>('sol');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [dados, setDados] = useState<Resultado | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [consulta, setConsulta] = useState<Consulta>({
    tipo,
    zodiaco,
    inicio,
    dias,
    corpo,
    latitude,
    longitude,
  });

  const limiteDias = tipo === 'transitos' ? 31 : 370;
  const opcao = OPCOES.find((item) => item.id === tipo)!;
  const Icone = opcao.icone;

  function trocarTipo(novo: Tipo) {
    const periodo = novo === 'transitos' ? '14' : '365';
    setTipo(novo);
    setDias(periodo);
    setDados(null);
    setErro('');
    setConsulta({
      tipo: novo,
      zodiaco,
      inicio,
      dias: periodo,
      corpo,
      latitude,
      longitude,
    });
  }

  useEffect(() => {
    const controle = new AbortController();
    const parametros = new URLSearchParams({
      tipo: consulta.tipo,
      zodiaco: consulta.zodiaco,
      inicio: consulta.inicio,
      dias: consulta.dias,
    });
    if (consulta.tipo === 'retornos') parametros.set('corpo', consulta.corpo);
    if (
      consulta.tipo === 'astrocartografia' &&
      (consulta.latitude !== '' || consulta.longitude !== '')
    ) {
      parametros.set('latitude', consulta.latitude);
      parametros.set('longitude', consulta.longitude);
    }
    async function executar() {
      setCarregando(true);
      setErro('');
      setDados(null);
      try {
        const resposta = await fetch(
          '/api/astrologia/inovacoes?' + parametros.toString(),
          {
            signal: controle.signal,
            cache: 'no-store',
            credentials: 'same-origin',
          }
        );
        const corpo: {
          dados?: Resultado;
          error?: string;
          message?: string;
        } = await resposta.json();
        if (!resposta.ok)
          throw new Error(
            corpo.error ?? corpo.message ?? 'O cálculo não pôde ser concluído.'
          );
        if (!corpo.dados)
          throw new Error('O servidor não retornou um resultado calculado.');
        setDados(corpo.dados);
      } catch (falha) {
        if (!controle.signal.aborted)
          setErro(falha instanceof Error ? falha.message : 'Falha inesperada.');
      } finally {
        if (!controle.signal.aborted) setCarregando(false);
      }
    }
    void executar();
    return () => controle.abort();
  }, [consulta]);

  function consultar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setConsulta({ tipo, zodiaco, inicio, dias, corpo, latitude, longitude });
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Orbit className="size-5" aria-hidden="true" />
            Motor da Lyra · Descobertas avançadas
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Explore o seu céu com precisão
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            Cinco cálculos astronômicos e astrológicos do motor próprio da Lyra,
            sem depender de modelos de IA conectados. Leituras astrológicas são
            interpretações simbólicas.
          </p>
        </header>
        <Tabs value={tipo} onValueChange={(valor) => trocarTipo(valor as Tipo)}>
          <TabsList className="flex h-auto flex-wrap justify-start gap-1">
            {OPCOES.map((item) => (
              <TabsTrigger key={item.id} value={item.id}>
                {item.nome}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <Icone aria-hidden="true" className="size-5 text-primary" />
              {opcao.nome}
            </CardTitle>
            <CardDescription>{opcao.descricao}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={consultar}
              className="flex flex-wrap items-end gap-3"
            >
              {tipo !== 'd9' && tipo !== 'd10' && (
                <label className="grid gap-1 text-sm font-medium">
                  Início (UTC)
                  <Input
                    type="date"
                    value={inicio}
                    min="1900-01-01"
                    max="2100-12-31"
                    onChange={(e) => setInicio(e.target.value)}
                    required
                  />
                </label>
              )}
              {(tipo === 'transitos' ||
                tipo === 'eclipses' ||
                tipo === 'retornos') && (
                <label className="grid gap-1 text-sm font-medium">
                  Dias de pesquisa
                  <Input
                    type="number"
                    min="1"
                    max={limiteDias}
                    value={dias}
                    onChange={(e) => setDias(e.target.value)}
                    required
                  />
                </label>
              )}
              {tipo !== 'eclipses' && tipo !== 'd9' && tipo !== 'd10' && (
                <label className="grid gap-1 text-sm font-medium">
                  Método
                  <select
                    className="h-11 rounded border border-input bg-card px-3"
                    value={zodiaco}
                    onChange={(e) => setZodiaco(e.target.value as Zodiaco)}
                  >
                    <option value="sideral">Védico sideral</option>
                    <option value="tropical">Ocidental tropical</option>
                  </select>
                </label>
              )}
              {tipo === 'retornos' && (
                <label className="grid gap-1 text-sm font-medium">
                  Retorno
                  <select
                    className="h-11 rounded border border-input bg-card px-3"
                    value={corpo}
                    onChange={(e) => setCorpo(e.target.value as 'sol' | 'lua')}
                  >
                    <option value="sol">Solar</option>
                    <option value="lua">Lunar</option>
                  </select>
                </label>
              )}
              {tipo === 'astrocartografia' && (
                <>
                  <label className="grid gap-1 text-sm font-medium">
                    Latitude do local consultado
                    <Input
                      type="number"
                      min="-90"
                      max="90"
                      step="any"
                      placeholder="Usar cidade do perfil"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium">
                    Longitude do local consultado
                    <Input
                      type="number"
                      min="-180"
                      max="180"
                      step="any"
                      placeholder="Usar cidade do perfil"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                    />
                  </label>
                </>
              )}
              <Button type="submit" disabled={carregando}>
                <RefreshCw
                  aria-hidden="true"
                  className={carregando ? 'size-4 animate-spin' : 'size-4'}
                />
                {carregando ? 'Calculando…' : 'Calcular agora'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle as="h2">Resultado calculado</CardTitle>
            <CardDescription>
              Instantes em UTC e longitudes obtidos pelo motor astronômico.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div aria-live="polite" className="space-y-4">
              {carregando && (
                <p role="status">Calculando posições e eventos reais…</p>
              )}
              {erro && (
                <p
                  role="alert"
                  className="rounded border border-destructive p-3 text-sm text-destructive"
                >
                  {erro}
                </p>
              )}
              {!carregando && !erro && dados && (
                <>
                  <Conteudo tipo={tipo} dados={dados} />
                  {dados.limite && (
                    <p className="text-xs text-muted-foreground">
                      {dados.limite}
                    </p>
                  )}
                  {dados.interpretacao && (
                    <p className="text-xs text-muted-foreground">
                      {dados.interpretacao}
                    </p>
                  )}
                </>
              )}
              {!carregando && !erro && !dados && (
                <p className="text-sm text-muted-foreground">
                  Escolha uma técnica e consulte os resultados do motor.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export default function InovacoesPage() {
  const { session } = useAuth();
  if (session === undefined) return <SplashScreen />;
  if (!session) return null;
  return <ExploradorDeInovacoes />;
}
