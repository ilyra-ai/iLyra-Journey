'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ChevronRight,
  RefreshCw,
  MousePointerClick,
  Orbit,
} from 'lucide-react';
import ceu from '@/assets/celestial/ceu-vedico-transparente.png';
import lotus from '@/assets/celestial/temas/sensibilidade.png';
import esfera from '@/assets/celestial/esfera-quantum-transparente.png';
import lua from '@/assets/celestial/lua-transparente.png';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PlanUpgradeNotice } from '@/components/subscription/PlanUpgradeNotice';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/use-profile';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { usePlanFeatureAccess } from '@/hooks/use-plan-feature-access';
import { buscarJson } from '@/lib/http/transporte';
import { ouvirMapaAtualizado } from '@/lib/astrology/evento-do-mapa';
import { dataLocal } from '@/lib/astrology/tempo';
import type { PainelCelestial } from '@/lib/astrology/painel-celestial';
import type { LeituraDaLyra } from '@/lib/lyra/leitura-do-mapa';
import type { LeituraTropical } from '@/lib/lyra/leitura-tropical';
import identidade from '@/components/public/CelestialIdentity.module.css';
import { cn } from '@/lib/utils';
import { CelestialChat } from './CelestialChat';
import { PrevencaoCard } from './PrevencaoCard';
import { VinculosFamiliares } from './VinculosFamiliares';
import { arteDoSigno } from './signos';
import { arteDoTema } from './temas-do-dia';
import styles from './CelestialDashboard.module.css';
import { PLANO_DE_BASE } from '@/types/subscription';

const MapaCompleto = dynamic(
  () =>
    import('@/components/profile/MapaVedicoCard').then((m) => m.MapaVedicoCard),
  {
    loading: () => <p role="status">Carregando mapa completo…</p>,
  }
);
const TIPOS = [
  { id: 'vedico', nome: 'Védico', arte: ceu },
  { id: 'samadhi', nome: 'Lyra DM Samādhi', arte: lotus },
  { id: 'quantum', nome: 'Quantum', arte: esfera },
] as const;
const ABAS = [
  ...TIPOS,
  { id: 'ocidental', nome: 'Ocidental', arte: ceu },
] as const;
type Tipo = (typeof TIPOS)[number]['id'];
type Aba = (typeof ABAS)[number]['id'];
type Dia = PainelCelestial['dias'][number];
const registrarErro = (erro: unknown) =>
  console.error('Falha ao carregar o painel celestial:', erro);
function resumo(leitura: LeituraDaLyra, tipo: Tipo) {
  if (tipo === 'vedico') return leitura.vedico.dasha ?? leitura.vedico.lua;
  return tipo === 'samadhi' ? leitura.samadhi.sintese : leitura.quantum.texto;
}
function formatarData(data: string, curta = false) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: curta ? 'short' : 'long',
    year: curta ? undefined : 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${data}T12:00:00Z`));
}
function arteDoDia(dia: Dia) {
  return arteDoTema(dia.dia?.pessoal?.tara.tema);
}
function ResumosDoDia({ dia }: { dia: Dia }) {
  return (
    <>
      {dia.erro ? <p role="alert">{dia.erro}</p> : null}
      {dia.dia ? (
        <p>
          <strong>Lua em {dia.dia.signoDaLua}</strong> · {dia.dia.tithi.nome} ·{' '}
          {dia.dia.tithi.paksha}. {dia.dia.pessoal?.tara.sentido}
        </p>
      ) : null}
      {dia.leitura ? (
        TIPOS.map((tipo) => (
          <section key={tipo.id}>
            <h3>{tipo.nome}</h3>
            <p>{resumo(dia.leitura!, tipo.id)}</p>
            {tipo.id === 'samadhi' ? (
              <p>{dia.leitura!.samadhi.celestial}</p>
            ) : null}
            {tipo.id === 'quantum'
              ? dia.leitura!.quantum.indisponivel.map((item) => (
                  <p key={item}>{item}</p>
                ))
              : null}
          </section>
        ))
      ) : (
        <p>
          Complete os dados de nascimento no perfil para os três mapas pessoais.
        </p>
      )}
    </>
  );
}

const semAssinatura = () => () => undefined;
/** Só identificadores de planeta; qualquer outro valor é ignorado. */
const lerPontoDoLink = () => {
  const valor = new URLSearchParams(window.location.search).get('ponto');
  return valor && /^[a-z]{3,8}$/.test(valor) ? valor : null;
};

export function CelestialDashboard() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const acesso = usePlanFeatureAccess('vedic_insights');
  const [versao, setVersao] = useState(0);
  const [tipo, setTipo] = useState<Aba>('vedico');
  const [modal, setModal] = useState<
    'mapa' | 'ocidental' | 'dia' | 'signo' | null
  >(null);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  // Volta de uma pergunta sobre um ponto do mapa (tarefa 187): `/?ponto=sol`
  // abre o mapa completo com o planeta escolhido. Ao fechar, sai da URL.
  const pontoPeloLink = useSyncExternalStore(
    semAssinatura,
    lerPontoDoLink,
    () => null
  );
  const [pontoAtendido, setPontoAtendido] = useState(false);
  const ponto = pontoAtendido ? null : pontoPeloLink;
  const modalAberto = modal ?? (ponto ? 'mapa' : null);
  const ler = useCallback(async (): Promise<PainelCelestial | null> => {
    const resposta = await buscarJson('/api/astrologia/painel', {
      cache: 'no-store',
    });
    if (!resposta.ok) throw new Error(resposta.falha.message);
    return resposta.corpo as PainelCelestial;
  }, []);
  const { data, loading, error, refresh } =
    useKeyedResource<PainelCelestial | null>(
      session && acesso.enabled ? `${session.user.id}:${versao}` : null,
      ler,
      registrarErro,
      null
    );
  const lerOcidental = useCallback(async () => {
    const resposta = await buscarJson('/api/astrologia/ocidental', {
      cache: 'no-store',
    });
    if (!resposta.ok) throw new Error(resposta.falha.message);
    return (resposta.corpo as { leitura: LeituraTropical | null }).leitura;
  }, []);
  const ocidental = useKeyedResource<LeituraTropical | null>(
    session && acesso.enabled && tipo === 'ocidental'
      ? `${session.user.id}:${versao}`
      : null,
    lerOcidental,
    registrarErro,
    null
  );
  useEffect(() => ouvirMapaAtualizado(() => setVersao((v) => v + 1)), []);
  useEffect(() => {
    if (!data?.fuso || !data.hoje) return;
    const conferir = () => {
      if (dataLocal(new Date(), data.fuso!) !== data.hoje)
        setVersao((v) => v + 1);
    };
    const intervalo = window.setInterval(conferir, 60_000);
    window.addEventListener('focus', conferir);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener('focus', conferir);
    };
  }, [data?.fuso, data?.hoje]);
  const abrirDia = (dia: Dia) => {
    setDiaSelecionado(dia.data);
    setModal('dia');
  };
  const hoje = data?.dias[0];
  const dia = data?.dias.find((item) => item.data === diaSelecionado) ?? hoje;
  const sol = data?.mapa?.planetas.find((planeta) => planeta.graha === 'sol');
  const imagemSigno = sol ? arteDoSigno(sol.signo) : null;
  const nome = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(' ');
  const aba = ABAS.find((item) => item.id === tipo)!;
  return (
    <div className={styles.panel}>
      <section
        className={styles.intro}
        aria-labelledby="titulo-painel-celestial"
      >
        <p className={styles.eyebrow}>SEU ESPAÇO LYRA</p>
        <div className={styles.headingRow}>
          <h2 id="titulo-painel-celestial">Um novo olhar para o seu dia.</h2>
          {data?.hoje ? (
            <time dateTime={data.hoje}>{formatarData(data.hoje)}</time>
          ) : null}
        </div>
      </section>
      {acesso.loading || loading ? (
        <div className={cn(styles.card, styles.state)} role="status">
          Calculando suas leituras pessoais…
        </div>
      ) : !acesso.enabled ? (
        <PlanUpgradeNotice
          currentPlanKey={acesso.subscription?.plan.key ?? PLANO_DE_BASE}
          title="Seus mapas pessoais"
          description="Conheça os planos que incluem as leituras dos seus mapas."
        />
      ) : error ? (
        <div className={cn(styles.card, styles.state)} role="alert">
          <p>
            {error instanceof Error
              ? error.message
              : 'Não foi possível carregar suas leituras.'}
          </p>
          <button
            className={styles.outlineButton}
            type="button"
            onClick={() => void refresh()}
          >
            <RefreshCw aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
      ) : data ? (
        <>
          {!data.mapa ? (
            <div className={cn(styles.card, styles.state)}>
              <p>
                Seu mapa começa com seus dados de nascimento. Complete{' '}
                {data.faltando.join(', ')} no perfil.
              </p>
              <Link href="/profile" className={styles.primaryButton}>
                Completar meu perfil <ChevronRight aria-hidden="true" />
              </Link>
            </div>
          ) : null}
          {hoje ? (
            <div className={styles.highlights}>
              <button
                type="button"
                className={cn(styles.card, styles.highlight)}
                onClick={() => abrirDia(hoje)}
              >
                <Image src={lua} alt="" sizes="100px" />
                <span>
                  <strong>Lua de hoje</strong>
                  <small>
                    {hoje.dia
                      ? `${hoje.dia.tithi.nome === 'Purnima' ? 'Cheia' : hoje.dia.tithi.nome === 'Amavasya' ? 'Nova' : hoje.dia.tithi.paksha === 'Shukla Paksha' ? 'Crescente' : 'Minguante'} · em ${hoje.dia.signoDaLua}`
                      : 'Consultar leitura do dia'}
                  </small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
              <button
                type="button"
                className={cn(styles.card, styles.highlight)}
                onClick={() => setModal('mapa')}
              >
                <Image src={ceu} alt="" sizes="100px" />
                <span>
                  <strong>Seu período atual</strong>
                  <small>
                    {data.mapa?.dasha
                      ? `${data.mapa.dasha.mahadasha.nome} / ${data.mapa.dasha.antardasha.nome}`
                      : 'Hora de nascimento necessária'}
                    <br />
                    Dasha e subperíodo
                  </small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
              <button
                type="button"
                className={cn(styles.card, styles.highlight)}
                onClick={() => abrirDia(hoje)}
              >
                {arteDoDia(hoje) ? (
                  <Image src={arteDoDia(hoje)!} alt="" sizes="100px" />
                ) : null}
                <span>
                  <strong>Destaque do dia</strong>
                  <small>
                    {hoje.dia?.pessoal?.tara.tema ??
                      hoje.dia?.yoga.nome ??
                      'Consultar seu dia'}
                  </small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          ) : null}
          <div className={styles.mainGrid}>
            <section
              className={cn(styles.card, styles.mapCard)}
              aria-labelledby="titulo-meus-mapas"
            >
              <Tabs
                className={styles.mapLayout}
                value={tipo}
                activationMode="manual"
                onValueChange={(valor) => setTipo(valor as Aba)}
              >
                <div className={styles.mapHeading}>
                  <h2 id="titulo-meus-mapas">
                    {tipo === 'vedico'
                      ? 'Meu mapa védico'
                      : tipo === 'samadhi'
                        ? 'Meu mapa Lyra DM Samādhi'
                        : tipo === 'ocidental'
                          ? 'Meu mapa ocidental'
                          : 'Meu mapa Quantum'}
                  </h2>
                  <p className={styles.subtitle}>
                    Seu céu de nascimento, novas perspectivas.
                  </p>
                </div>
                <TabsList className={styles.tabs} aria-label="Tipo de mapa">
                  {ABAS.map((item) => (
                    <TabsTrigger value={item.id} key={item.id}>
                      {item.nome}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <Image
                  src={aba.arte}
                  alt={`Ilustração da perspectiva ${aba.nome}`}
                  className={styles.mapArt}
                  sizes="(max-width: 699px) 90vw, (max-width: 1199px) 45vw, 430px"
                  priority
                />
                <div className={styles.reading}>
                  {TIPOS.map((item) => (
                    <TabsContent
                      key={item.id}
                      value={item.id}
                      className={styles.summary}
                    >
                      <p className={styles.readingLabel}>
                        {item.nome} · sua leitura
                      </p>
                      <p className={styles.excerpt}>
                        {data.leitura
                          ? resumo(data.leitura, item.id)
                          : 'Complete seu perfil para calcular esta leitura.'}
                      </p>
                    </TabsContent>
                  ))}
                  <TabsContent value="ocidental" className={styles.summary}>
                    <p className={styles.readingLabel}>
                      Ocidental · zodíaco tropical
                    </p>
                    {ocidental.loading ? (
                      <p role="status">Calculando sua leitura ocidental…</p>
                    ) : ocidental.error instanceof Error ? (
                      <p role="alert">{ocidental.error.message}</p>
                    ) : (
                      <p>
                        {ocidental.data?.resumo ??
                          'Informe sua data de nascimento no perfil.'}
                      </p>
                    )}
                  </TabsContent>
                  {(tipo === 'ocidental' ? ocidental.data : data.mapa) ? (
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() =>
                        setModal(tipo === 'ocidental' ? 'ocidental' : 'mapa')
                      }
                    >
                      <Orbit aria-hidden="true" /> Explorar meu mapa{' '}
                      <ChevronRight aria-hidden="true" />
                    </button>
                  ) : tipo === 'ocidental' && ocidental.error ? (
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => void ocidental.refresh()}
                    >
                      <RefreshCw aria-hidden="true" /> Tentar novamente
                    </button>
                  ) : tipo === 'ocidental' && ocidental.loading ? null : (
                    <Link className={styles.primaryButton} href="/profile">
                      Completar meu perfil
                    </Link>
                  )}
                </div>
              </Tabs>
            </section>
            {/* Vínculos em resumo, em cima do chat compacto (tarefa 213). */}
            <div className={styles.ladoDoMapa}>
              <VinculosFamiliares
                dados={data.leitura?.vinculos ?? null}
                className={styles.card}
              />
              <CelestialChat nome={profile?.first_name ?? null} />
            </div>
          </div>
          <div className={styles.bottomGrid}>
            <section
              className={cn(styles.card, styles.timelineCard)}
              aria-labelledby="titulo-linha-temporal"
            >
              <div className={styles.timelineHeading}>
                <h2 id="titulo-linha-temporal">
                  Linha temporal <span>- Seu mapa nos próximos 7 dias</span>
                </h2>
                <span className={styles.dateHint}>
                  <MousePointerClick aria-hidden="true" /> Clique na data
                </span>
              </div>
              {data.dias.length ? (
                <div className={styles.timeline}>
                  <svg
                    className={styles.timelineWave}
                    viewBox="0 0 600 32"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M0 16 C25 0 75 0 100 16 S175 32 200 16 S275 0 300 16 S375 32 400 16 S475 0 500 16 S575 32 600 16"
                      fill="none"
                      stroke="currentColor"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  {data.dias.map((item, indice) => (
                    <button
                      type="button"
                      key={item.data}
                      className={styles.day}
                      onClick={() => abrirDia(item)}
                      aria-label={`Abrir resumo dos três mapas de ${formatarData(item.data)}`}
                    >
                      {arteDoDia(item) ? (
                        <Image src={arteDoDia(item)!} alt="" sizes="90px" />
                      ) : (
                        <span
                          className={styles.dayWithoutArt}
                          aria-hidden="true"
                        />
                      )}
                      <span className={styles.dayLabel}>
                        {item.dia?.pessoal?.tara.tema ??
                          item.dia?.yoga.nome ??
                          'Leitura do dia'}
                      </span>
                      <span className={styles.dayDot} aria-hidden="true" />
                      <time dateTime={item.data}>
                        {indice === 0 ? 'Hoje · ' : ''}
                        {formatarData(item.data, true)}
                      </time>
                    </button>
                  ))}
                </div>
              ) : (
                <p>
                  Informe sua cidade no perfil para calcular os próximos dias.
                </p>
              )}
            </section>
            <section
              className={cn(styles.card, styles.signCard)}
              aria-labelledby="titulo-signo"
            >
              <h2 id="titulo-signo">Seu signo</h2>
              {sol && imagemSigno ? (
                <div className={styles.signBody}>
                  <Image
                    src={imagemSigno}
                    alt={`Representação de ${sol.signo}`}
                    className={styles.signArt}
                    sizes="(max-width: 699px) 38vw, 240px"
                  />
                  <div className={styles.signCopy}>
                    <h3>{sol.signo} · hoje</h3>
                    <p className={styles.excerpt}>
                      {data.leitura?.vedico.sol}{' '}
                      {hoje?.dia?.pessoal
                        ? `Hoje: ${hoje.dia.pessoal.tara.conselho}.`
                        : ''}
                    </p>
                    <button
                      type="button"
                      className={styles.textLink}
                      onClick={() => setModal('signo')}
                    >
                      Ver leitura do signo <ChevronRight aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : (
                <p>
                  Seu signo será exibido após completar os dados de nascimento.
                </p>
              )}
            </section>
          </div>
          <PrevencaoCard className={cn(styles.card, 'mt-6')} />
          <div className={styles.footer}>Lyra MetaCare</div>
        </>
      ) : null}
      <Dialog
        open={modalAberto !== null}
        onOpenChange={(aberto) => {
          if (aberto) return;
          // Lido da URL agora: a escolha de planeta no Astrolábio grava
          // `?ponto=` sem passar por este componente (tarefa 181).
          const url = new URL(window.location.href);
          if (url.searchParams.has('ponto')) {
            url.searchParams.delete('ponto');
            window.history.replaceState(
              window.history.state,
              '',
              url.pathname + url.search + url.hash
            );
            setPontoAtendido(true);
          }
          setModal(null);
        }}
      >
        <DialogContent className={cn(identidade.theme, styles.dialog)}>
          <DialogTitle>
            {modalAberto === 'ocidental'
              ? 'Mapa astrológico tradicional ocidental'
              : modalAberto === 'mapa'
                ? 'Seus mapas pessoais'
                : modalAberto === 'signo'
                  ? `${sol?.signo ?? 'Signo'} · ${nome}`
                  : `Linha temporal · ${dia ? formatarData(dia.data) : ''}`}
          </DialogTitle>
          <DialogDescription>
            {modalAberto === 'dia'
              ? 'Três perspectivas do seu mapa e o contexto calculado para a data selecionada.'
              : 'Leituras pessoais calculadas com seus dados. Imagens ilustrativas; interpretações simbólicas para reflexão.'}
          </DialogDescription>
          {modalAberto === 'ocidental' ? (
            ocidental.data ? (
              <section>
                <h3>Zodíaco tropical</h3>
                <p>{ocidental.data.resumo}</p>
                {ocidental.data.ascendente ? (
                  <p>{ocidental.data.ascendente}</p>
                ) : null}
                {ocidental.data.planetas
                  .filter(({ planeta }) => planeta !== 'sol')
                  .map(({ planeta, texto }) => (
                    <p key={planeta}>{texto}</p>
                  ))}
                {ocidental.data.aspectos.map((aspecto) => (
                  <p key={aspecto}>{aspecto}</p>
                ))}
                {ocidental.data.limites.map((limite) => (
                  <p key={limite}>{limite}</p>
                ))}
              </section>
            ) : (
              <p role="status">
                {ocidental.loading
                  ? 'Atualizando a leitura ocidental…'
                  : 'A leitura ocidental não está disponível no momento.'}
              </p>
            )
          ) : modalAberto === 'mapa' ? (
            <MapaCompleto pontoInicial={ponto} sincronizarUrl />
          ) : modalAberto === 'signo' ? (
            <section>
              {imagemSigno ? (
                <Image
                  src={imagemSigno}
                  alt={`Representação de ${sol?.signo}`}
                  width={220}
                  height={220}
                />
              ) : null}
              <h3>Sol sideral em {sol?.signo}</h3>
              <p>{data?.leitura?.vedico.sol}</p>
              <p>{data?.leitura?.vedico.lua}</p>
              {hoje?.dia?.pessoal ? (
                <p>
                  <strong>Contexto de hoje:</strong>{' '}
                  {hoje.dia.pessoal.tara.sentido}
                </p>
              ) : null}
              {hoje?.dia?.pessoal ? (
                <p>
                  <strong>Para viver o dia:</strong>{' '}
                  {hoje.dia.pessoal.tara.conselho}. A Lua de hoje está em{' '}
                  {hoje.dia.signoDaLua}, na casa {hoje.dia.pessoal.chandra.casa}{' '}
                  a partir da sua Lua natal.
                  {hoje.dia.pessoal.chandra.chandrashtama
                    ? ' Esse trânsito pede mais cautela e espaço para rever suas escolhas.'
                    : ''}
                </p>
              ) : null}
              {data?.leitura?.vedico.dasha ? (
                <p>
                  <strong>Seu momento pessoal:</strong>{' '}
                  {data.leitura.vedico.dasha}
                </p>
              ) : null}
            </section>
          ) : dia ? (
            <ResumosDoDia dia={dia} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
