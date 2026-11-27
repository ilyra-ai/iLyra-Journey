'use client';

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import Image, { type ImageProps, type StaticImageData } from 'next/image';
import Link from 'next/link';
import localFont from 'next/font/local';
import {
  ArrowRight,
  Check,
  ChevronDown,
  HeartHandshake,
  Menu,
  RotateCw,
  Sparkles,
  X,
} from 'lucide-react';

import ceuVedico from '@/assets/celestial/ceu-vedico.png';
import esferaQuantum from '@/assets/celestial/esfera-quantum.png';
import caminhoLunar from '@/assets/celestial/caminho-lunar.png';
import lotusSamadhi from '@/assets/celestial/lotus-samadhi.png';
import signoDeAries from '@/assets/celestial/signos/aries.png';
import horizonte from '@/assets/celestial/horizonte.png';
import ceuVedicoTransparente from '@/assets/celestial/ceu-vedico-transparente.png';
import esferaQuantumTransparente from '@/assets/celestial/esfera-quantum-transparente.png';
import luaTransparente from '@/assets/celestial/lua-transparente.png';
import lotusTransparente from '@/assets/celestial/temas/sensibilidade.png';
import { ConviteDaAssinatura } from '@/components/landing/ConviteDaAssinatura';
import { ExperimenteGratis } from '@/components/landing/ExperimenteGratis';
import { LogoILyra } from '@/components/marca/ilyra/LogoILyra';
import { marcarEtapa } from '@/lib/funil/cliente';
import { ThemeToggleButton } from '@/components/theme/ThemeControls';
import { usePublicSitePageConfig } from '@/hooks/use-public-site-page-config';
import { beneficiosPublicos } from '@/lib/plans/beneficios-publicos';
import { EVENTO_PLANOS_ATUALIZADOS } from '@/lib/plans/atualizacao-publica';
import { moedaPtBr } from '@/lib/formato/numero';
import {
  ROTA_POLITICA_DE_PRIVACIDADE,
  ROTA_TERMOS_DE_USO,
} from '@/lib/lgpd/documentos';
import type {
  LandingPageConfig,
  LandingSectionKey,
} from '@/lib/site-page-config/schema';
import type { PlanMatrixPlan } from '@/types/subscription';
import styles from './LandingCelestial.module.css';

const editorial = localFont({
  src: '../../assets/fonts/clicker-script/ClickerScript-Regular.ttf',
  variable: '--font-celestial-editorial',
  display: 'swap',
  weight: '400',
});

const imprima = localFont({
  src: '../../assets/fonts/imprima/Imprima-Regular.ttf',
  variable: '--font-imprima',
  display: 'swap',
  weight: '400',
});

const varela = localFont({
  src: '../../assets/fonts/varela/varela-latin-400-normal.ttf',
  variable: '--font-varela',
  display: 'swap',
  weight: '400',
});

const varelaEstendida = localFont({
  src: '../../assets/fonts/varela/varela-latin-ext-400-normal.ttf',
  variable: '--font-varela-estendida',
  display: 'swap',
  weight: '400',
  preload: false,
});

type Props = { overrideConfig?: LandingPageConfig; previewMode?: boolean };
type Catalogo = {
  estado: 'carregando' | 'pronto' | 'erro';
  planos: PlanMatrixPlan[];
  erro?: string;
};

/** Cartão do mapa gratuito (ocidental, tarefa 157). */
const MAPA_GRATUITO = 'landing-feature-4';

// As imagens são ilustrações editoriais, nunca resultados calculados de um mapa.
const ilustracoesDosMapas: Record<string, StaticImageData> = {
  'landing-feature-1': ceuVedico,
  'landing-feature-2': lotusSamadhi,
  'landing-feature-3': esferaQuantum,
  // O zodíaco tropical começa em Áries, no equinócio de março.
  'landing-feature-4': signoDeAries,
};
const ilustracoesDosDestaques: Record<string, StaticImageData> = {
  'landing-preview-1': ceuVedico,
  'landing-preview-2': esferaQuantum,
  'landing-preview-3': caminhoLunar,
};
const destinosDosDestaques: Record<string, string> = {
  'landing-preview-1': '#mapas',
  'landing-preview-2': '#lyra-ai',
  'landing-preview-3': '#sobre',
};
const ilustracoesDosPlanos: Partial<
  Record<PlanMatrixPlan['key'], StaticImageData>
> = {
  free: caminhoLunar,
  meta: esferaQuantum,
  care: lotusSamadhi,
};

/**
 * Tema claro da landing (tarefa 228): cada arte de céu noturno opaco tem a
 * versão transparente já registrada em src/assets/celestial/TRANSPARENCIA.md
 * (o lótus reutiliza temas/sensibilidade.png). As duas versões vão no HTML e
 * o CSS mostra a do tema em uso, sem depender do JavaScript para trocar.
 */
const VERSAO_CLARA = new Map<StaticImageData, StaticImageData>([
  [ceuVedico, ceuVedicoTransparente],
  [esferaQuantum, esferaQuantumTransparente],
  [caminhoLunar, luaTransparente],
  [lotusSamadhi, lotusTransparente],
]);

function ArteDoTema({
  src,
  alt,
  className,
  ...props
}: Omit<ImageProps, 'src'> & { src: StaticImageData }) {
  const clara = VERSAO_CLARA.get(src);
  if (!clara)
    return <Image src={src} alt={alt} className={className} {...props} />;
  return (
    <>
      <Image
        src={src}
        alt={alt}
        className={[className, styles.artePraEscuro].filter(Boolean).join(' ')}
        {...props}
      />
      <Image
        src={clara}
        alt={alt}
        className={[className, styles.artePraClaro].filter(Boolean).join(' ')}
        {...props}
      />
    </>
  );
}

/**
 * Os títulos pequenos (`.eyebrow`) são em caixa-alta, mas a marca mantém a
 * grafia oficial "iLyra", com o i minúsculo (tarefa 173).
 */
function comGrafiaDaMarca(texto: string) {
  const partes = texto.split(/(iLyra)/);
  if (partes.length === 1) return texto;
  // Um único item: o `.eyebrow` é flex com `gap`, que separaria os pedaços.
  return (
    <span>
      {partes.map((parte, indice) =>
        parte === 'iLyra' ? (
          <span key={indice} className={styles.grafiaDaMarca}>
            iLyra
          </span>
        ) : (
          parte
        )
      )}
    </span>
  );
}

const semAssinatura = () => () => undefined;
/** A URL só muda por `replaceState` ao fechar o modal, logo abaixo. */
const lerPedidoPeloLink = () =>
  new URLSearchParams(window.location.search).get('experimente') === '1';

export function LandingPage({ overrideConfig, previewMode = false }: Props) {
  const { config: publicada, error: erroConfiguracao } =
    usePublicSitePageConfig('landing');
  const config = overrideConfig ?? publicada;
  const [menuAberto, setMenuAberto] = useState(false);
  const [experimentando, setExperimentando] = useState(false);
  const [convite, setConvite] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<Catalogo>({
    estado: 'carregando',
    planos: [],
  });
  const [tentativa, setTentativa] = useState(0);

  // Link do cartão compartilhado (tarefa 168): `/?experimente=1` abre o
  // Experimente Grátis. Ao fechar, o parâmetro sai da barra de endereço.
  const pedidoPeloLink = useSyncExternalStore(
    semAssinatura,
    lerPedidoPeloLink,
    () => false
  );
  // Fechar precisa mudar estado: a URL sozinha não renderiza de novo.
  const [linkAtendido, setLinkAtendido] = useState(false);
  const abrirPeloLink = pedidoPeloLink && !linkAtendido && !previewMode;

  // Funil anônimo (tarefa 170): uma visita por sessão da aba; a prévia do
  // editor não conta.
  useEffect(() => {
    if (previewMode) return;
    marcarEtapa('visita_landing', '', { umaVezPorSessao: true });
    if (lerPedidoPeloLink())
      marcarEtapa('iniciou_descoberta', 'link', { umaVezPorSessao: true });
  }, [previewMode]);

  function experimentar(origem: 'inicio' | 'mapa') {
    if (!previewMode) marcarEtapa('iniciou_descoberta', origem);
    setExperimentando(true);
  }

  function abrirConvite(mapa: { id: string; title: string }) {
    if (!previewMode && mapa.id !== MAPA_GRATUITO) {
      marcarEtapa('conteudo_premium_clicado', mapa.id);
      marcarEtapa('modal_visto');
    }
    setConvite(mapa.title);
  }

  useEffect(() => {
    const controller = new AbortController();
    async function carregar() {
      try {
        const resposta = await fetch('/api/public/plans', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const dados = (await resposta.json()) as {
          plans?: PlanMatrixPlan[];
          error?: string;
        };
        if (!resposta.ok || !Array.isArray(dados.plans)) {
          throw new Error(
            dados.error ?? 'Não foi possível consultar os planos.'
          );
        }
        if (!controller.signal.aborted) {
          setCatalogo({
            estado: 'pronto',
            planos: [...dados.plans].sort(
              (a, b) => a.displayOrder - b.displayOrder
            ),
          });
        }
      } catch (erro) {
        if (!controller.signal.aborted)
          setCatalogo({
            estado: 'erro',
            planos: [],
            erro:
              erro instanceof TypeError
                ? 'Não foi possível conectar ao catálogo. Verifique sua conexão e tente novamente.'
                : erro instanceof SyntaxError
                  ? 'O catálogo não pôde ser carregado. Tente novamente em instantes.'
                  : erro instanceof Error
                    ? erro.message
                    : 'Falha ao consultar os planos.',
          });
      }
    }
    void carregar();
    return () => controller.abort();
  }, [tentativa]);

  useEffect(() => {
    const atualizar = () => {
      if (document.visibilityState === 'visible')
        setTentativa((atual) => atual + 1);
    };
    const aoArmazenar = (evento: StorageEvent) => {
      if (evento.key === EVENTO_PLANOS_ATUALIZADOS) atualizar();
    };
    const timer = window.setInterval(atualizar, 30_000);
    window.addEventListener('focus', atualizar);
    document.addEventListener('visibilitychange', atualizar);
    window.addEventListener(EVENTO_PLANOS_ATUALIZADOS, atualizar);
    window.addEventListener('storage', aoArmazenar);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', atualizar);
      document.removeEventListener('visibilitychange', atualizar);
      window.removeEventListener(EVENTO_PLANOS_ATUALIZADOS, atualizar);
      window.removeEventListener('storage', aoArmazenar);
    };
  }, []);

  useEffect(() => {
    if (!menuAberto) return;
    const fechar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setMenuAberto(false);
        document.getElementById('abrir-menu-celestial')?.focus();
      }
    };
    document.addEventListener('keydown', fechar);
    return () => document.removeEventListener('keydown', fechar);
  }, [menuAberto]);

  const escala = {
    '--celestial-hero-scale': config.typography.heroTitle,
    '--celestial-body-scale': config.typography.heroBody,
    '--celestial-section-scale': config.typography.sectionTitle,
    '--celestial-section-body-scale': config.typography.sectionBody,
    '--celestial-card-scale': config.typography.cardTitle,
    '--celestial-card-body-scale': config.typography.cardBody,
    '--celestial-button-scale': config.sizing.buttonScale,
    '--celestial-button-label-scale': config.typography.buttonLabel,
    '--celestial-feature-scale': config.sizing.featureCard,
    '--celestial-plan-scale': config.sizing.planCard,
    '--celestial-hero-card-scale': config.sizing.heroCard,
    '--celestial-icon-scale': config.sizing.iconScale,
  } as CSSProperties;
  const Principal = previewMode ? 'div' : 'main';
  const ordem = Array.from(
    new Set([
      ...config.sectionOrder,
      'features',
      'plans',
      'flow',
      'faq',
      'finalCta',
    ] as LandingSectionKey[])
  );

  const intro = (rotulo: string, titulo: string, descricao: string) => (
    <div className={styles.sectionIntro}>
      <p className={styles.eyebrow}>{comGrafiaDaMarca(rotulo)}</p>
      <h2>{titulo}</h2>
      <p>{descricao}</p>
    </div>
  );

  function secao(chave: LandingSectionKey): ReactNode {
    switch (chave) {
      case 'features':
        return (
          config.features.visible && (
            <section id="mapas" className={styles.section} key={chave}>
              <span id="recursos" className={styles.anchor} />
              <span id="leituras-de-mapas" className={styles.anchor} />
              {intro(
                config.features.badgeText,
                config.features.title,
                config.features.description
              )}
              <div className={styles.mapGrid}>
                {config.features.items.map((mapa) => (
                  <article className={styles.mapCard} key={mapa.id}>
                    <ArteDoTema
                      src={ilustracoesDosMapas[mapa.id] ?? ceuVedico}
                      alt=""
                      sizes="(max-width: 900px) 90vw, 30vw"
                      className={styles.mapArt}
                    />
                    <div className={styles.mapCopy}>
                      <h3>{mapa.title}</h3>
                      <p>{mapa.description}</p>
                      {/* O ocidental é gratuito (tarefa 157); os demais
                          abrem o convite da assinatura (tarefa 161). */}
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        className={styles.textLink}
                        onClick={() =>
                          mapa.id === MAPA_GRATUITO
                            ? experimentar('mapa')
                            : abrirConvite(mapa)
                        }
                      >
                        {mapa.id === MAPA_GRATUITO
                          ? 'Experimentar grátis'
                          : 'Quero este mapa'}
                        <ArrowRight aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <p className={styles.note}>
                As imagens ilustram cada perspectiva. Suas leituras são pessoais
                e dependem dos dados do perfil e dos recursos do seu plano.
              </p>
              {/* Conexões da Alma (tarefa 166): para quem não assina, o
                  convite da assinatura (tarefa 161) abre antes de qualquer
                  dado de outra pessoa ser pedido. */}
              <div className={styles.conexoes}>
                <HeartHandshake aria-hidden="true" />
                <div>
                  <h3>Conexões da Alma</h3>
                  <p>
                    Compare o seu mapa com o de alguém especial: afinidades,
                    diferenças e perguntas para conversar. Sem veredito e sem
                    porcentagem.
                  </p>
                </div>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  className={styles.textLink}
                  onClick={() =>
                    abrirConvite({
                      id: 'conexoes-da-alma',
                      title: 'Conexões da Alma',
                    })
                  }
                >
                  Será que encontrei minha alma gêmea?
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>
            </section>
          )
        );
      case 'plans':
        return (
          config.plans.visible && (
            <section
              id="planos"
              className={styles.section}
              key={chave}
              aria-busy={catalogo.estado === 'carregando'}
            >
              {intro(
                config.plans.badgeText,
                config.plans.title,
                config.plans.description
              )}
              {catalogo.estado === 'carregando' && (
                <p className={styles.status} role="status">
                  Consultando planos disponíveis…
                </p>
              )}
              {catalogo.estado === 'erro' && (
                <div className={styles.status} role="alert">
                  <p>{catalogo.erro}</p>
                  <button
                    className={styles.outlineButton}
                    type="button"
                    onClick={() => {
                      setCatalogo({ estado: 'carregando', planos: [] });
                      setTentativa((atual) => atual + 1);
                    }}
                  >
                    <RotateCw aria-hidden="true" /> Tentar novamente
                  </button>
                </div>
              )}
              {catalogo.estado === 'pronto' && catalogo.planos.length === 0 && (
                <p className={styles.status}>
                  Nenhum plano está publicado no momento.
                </p>
              )}
              <div className={styles.planGrid}>
                {catalogo.planos.map((plano) => {
                  const beneficios = beneficiosPublicos(plano.features);
                  return (
                    <article
                      key={plano.key}
                      className={styles.planCard}
                      data-destaque={Boolean(plano.highlightText)}
                    >
                      <ArteDoTema
                        src={ilustracoesDosPlanos[plano.key] ?? ceuVedico}
                        alt=""
                        sizes="(max-width: 900px) 90vw, 30vw"
                        className={styles.planArt}
                      />
                      <div className={styles.planCopy}>
                        <div className={styles.planTitle}>
                          <h3>{plano.name}</h3>
                          {plano.highlightText && (
                            <span>{plano.highlightText}</span>
                          )}
                        </div>
                        <p>{plano.tagline}</p>
                        <p className={styles.planDescription}>
                          {plano.description}
                        </p>
                        <p className={styles.price}>
                          {/* Valores de colaboração (tarefa 226): os dois, com o mesmo acesso. */}
                          {plano.contributionOptions.length > 0
                            ? plano.contributionOptions
                                .map((v) =>
                                  moedaPtBr(v.monthlyPrice, plano.currencyCode)
                                )
                                .join(' ou ')
                            : moedaPtBr(plano.monthlyPrice, plano.currencyCode)}
                          <span> /mês</span>
                        </p>
                        {plano.annualPrice > 0 && (
                          <p className={styles.annual}>
                            ou{' '}
                            {moedaPtBr(plano.annualPrice, plano.currencyCode)}{' '}
                            por ano
                          </p>
                        )}
                        <ul className={styles.benefits}>
                          {beneficios.map((beneficio) => (
                            <li key={beneficio.key}>
                              <Check aria-hidden="true" />
                              <span>{beneficio.label}</span>
                            </li>
                          ))}
                        </ul>
                        {beneficios.length === 0 && (
                          <p className={styles.note}>
                            Nenhum recurso habilitado neste plano.
                          </p>
                        )}
                        <Link
                          href={config.hero.primaryCtaHref}
                          className={styles.primaryButton}
                        >
                          {config.plans.ctaLabel}{' '}
                          <ArrowRight aria-hidden="true" />
                        </Link>
                        <p className={styles.note}>
                          {plano.monthlyPrice === 0
                            ? 'Comece com os recursos incluídos no plano gratuito.'
                            : plano.assinaturaOnline
                              ? 'A contratação está disponível na sua conta, após entrar.'
                              : 'Consulte a disponibilidade de contratação na sua conta.'}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )
        );
      case 'flow':
        return (
          config.flow.visible && (
            <section id="sobre" className={styles.about} key={chave}>
              <span id="fluxo" className={styles.anchor} />
              <div>
                {intro(
                  config.flow.badgeText,
                  config.flow.title,
                  config.flow.description
                )}
                <div id="lyra-ai" className={styles.aiDescription}>
                  <Sparkles aria-hidden="true" />
                  <p>
                    Com a Lyra AI, você pode conversar sobre suas leituras,
                    aprofundar perguntas e retomar conversas. Memória e anexos
                    seguem suas autorizações e os recursos disponíveis no seu
                    plano.
                  </p>
                </div>
              </div>
            </section>
          )
        );
      case 'faq':
        return (
          config.faq.visible && (
            <section id="faq" className={styles.section} key={chave}>
              {intro(
                config.faq.badgeText,
                config.faq.title,
                config.faq.description
              )}
              <div className={styles.faq}>
                {config.faq.items.map((item) => (
                  <details key={item.id}>
                    <summary>
                      {item.question}
                      <ChevronDown aria-hidden="true" />
                    </summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )
        );
      case 'metrics': {
        if (!config.metrics.visible) return null;
        const contagens: Record<string, number> = {
          planCount: catalogo.planos.length,
          featureCount: catalogo.planos.flatMap((plano) =>
            beneficiosPublicos(plano.features)
          ).length,
          categoryCount: new Set(
            catalogo.planos.flatMap((plano) =>
              plano.features.filter((f) => f.enabled).map((f) => f.category)
            )
          ).size,
          checkoutCount: catalogo.planos.filter(
            (plano) => plano.assinaturaOnline
          ).length,
        };
        return (
          <section className={styles.section} key={chave}>
            {intro(
              config.metrics.badgeText,
              config.metrics.title,
              config.metrics.description
            )}
            <dl className={styles.metrics}>
              {config.metrics.items.map((item) => (
                <div key={item.id}>
                  <dt>{item.label}</dt>
                  <dd>
                    {item.source === 'custom'
                      ? item.customValue
                      : catalogo.estado === 'pronto'
                        ? contagens[item.source]
                        : 'Indisponível'}
                  </dd>
                  <dd>{item.note}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      }
      case 'finalCta':
        return (
          config.finalCta.visible && (
            <section className={styles.finalCta} key={chave}>
              <Image
                src={horizonte}
                alt=""
                fill
                sizes="100vw"
                className={styles.horizon}
              />
              <h2>{config.finalCta.title}</h2>
              <Link
                href={config.finalCta.primaryHref}
                className={styles.primaryButton}
              >
                {config.finalCta.primaryLabel}
                <ArrowRight aria-hidden="true" />
              </Link>
            </section>
          )
        );
    }
  }

  return (
    <div
      className={`${styles.page} ${editorial.variable} ${imprima.variable} ${varela.variable} ${varelaEstendida.variable}`}
      style={escala}
      onClickCapture={(evento) => {
        if (evento.target instanceof Element && evento.target.closest('a')) {
          if (previewMode) evento.preventDefault();
          else setMenuAberto(false);
        }
      }}
    >
      <header className={styles.header}>
        <Link href="#topo" className={styles.brand}>
          <LogoILyra
            titulo={config.footer.brandLine}
            className={styles.brandImage}
          />
        </Link>
        <button
          type="button"
          id="abrir-menu-celestial"
          className={styles.menuToggle}
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuAberto}
          aria-controls="navegacao-celestial"
          onClick={() => setMenuAberto((atual) => !atual)}
        >
          {menuAberto ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        <nav
          id="navegacao-celestial"
          className={styles.nav}
          data-aberto={menuAberto}
          aria-label="Navegação principal"
        >
          <Link href="#experiencia">A experiência</Link>
          {config.features.visible && <Link href="#mapas">Seus mapas</Link>}
          {config.flow.visible && <Link href="#sobre">Sobre</Link>}
          {config.plans.visible && <Link href="#planos">Planos</Link>}
        </nav>
        <div className={styles.headerActions}>
          <ThemeToggleButton className={styles.themeToggle} />
          <Link href={config.hero.primaryCtaHref} className={styles.login}>
            {config.header.fullLoginLabel}
          </Link>
          <Link href="/login" className={styles.primaryButton}>
            {config.header.loginLabel}
          </Link>
        </div>
      </header>
      <Principal id={previewMode ? undefined : 'conteudo-principal'}>
        {erroConfiguracao && !overrideConfig && (
          <p className={styles.status} role="status">
            Exibindo a apresentação padrão. Não foi possível atualizar o
            conteúdo publicado neste momento.
          </p>
        )}
        <section
          id="topo"
          className={styles.hero}
          aria-labelledby="titulo-celestial"
        >
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              {comGrafiaDaMarca(config.hero.badgeText)}
            </p>
            <h1 id="titulo-celestial">
              {config.hero.title} <span>{config.hero.accentTitle}</span>
            </h1>
            <p className={styles.heroDescription}>{config.hero.description}</p>
            <div className={styles.heroActions}>
              {/* Experimente Grátis (tarefa 157): abre a leitura sem conta. */}
              <button
                type="button"
                onClick={() => experimentar('inicio')}
                aria-haspopup="dialog"
                className={`${styles.primaryButton} ${styles.trialButton}`}
              >
                <Sparkles aria-hidden="true" />
                {config.hero.primaryCtaLabel === 'Começar minha jornada'
                  ? 'Experimente Grátis'
                  : config.hero.primaryCtaLabel}
                <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <ArteDoTema
              src={ceuVedico}
              alt=""
              sizes="(max-width: 700px) 100vw, 55vw"
              loading="eager"
              fetchPriority="high"
              className={styles.heroArt}
            />
            <p className={styles.heroCaption}>
              <Sparkles aria-hidden="true" />
              {config.hero.previewTitle}
            </p>
          </div>
        </section>
        <section
          id="experiencia"
          className={styles.highlights}
          aria-label="A experiência Lyra"
        >
          {config.hero.previewItems.map((item) => (
            <Link
              key={item.id}
              href={destinosDosDestaques[item.id] ?? '#sobre'}
              className={styles.highlight}
            >
              <ArteDoTema
                src={ilustracoesDosDestaques[item.id] ?? ceuVedico}
                alt=""
                sizes="(max-width: 700px) 34vw, (max-width: 900px) 40vw, 15vw"
                className={styles.highlightArt}
              />
              <div>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </div>
              <ArrowRight aria-hidden="true" />
            </Link>
          ))}
        </section>
        {ordem.map(secao)}
      </Principal>
      <footer className={styles.footer}>
        <div className={styles.footerSignature}>
          <span />
          {config.footer.brandLine}
          <span />
        </div>
        <nav aria-label="Documentos legais">
          <Link href={ROTA_POLITICA_DE_PRIVACIDADE}>Privacidade</Link>
          <Link href={ROTA_TERMOS_DE_USO}>Termos</Link>
        </nav>
        <p>{config.footer.note}</p>
      </footer>
      <ExperimenteGratis
        aberto={experimentando || abrirPeloLink}
        aoFechar={() => {
          if (pedidoPeloLink) {
            const url = new URL(window.location.href);
            url.searchParams.delete('experimente');
            window.history.replaceState(
              window.history.state,
              '',
              url.pathname + url.search + url.hash
            );
          }
          setLinkAtendido(true);
          setExperimentando(false);
        }}
        destinoDaAssinatura={config.hero.primaryCtaHref}
        classeDoBotaoPrincipal={styles.primaryButton}
      />
      <ConviteDaAssinatura
        recurso={convite}
        aoFechar={() => setConvite(null)}
        medir={!previewMode}
        plano={
          catalogo.planos.find((p) => p.contributionOptions.length > 0) ?? null
        }
        destinoDoCadastro={config.hero.primaryCtaHref}
        classeDoBotaoPrincipal={styles.primaryButton}
      />
    </div>
  );
}
