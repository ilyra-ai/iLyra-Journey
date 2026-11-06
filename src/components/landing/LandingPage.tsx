'use client';

import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import localFont from 'next/font/local';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Menu,
  RotateCw,
  Sparkles,
  X,
} from 'lucide-react';

import ceuVedico from '@/assets/celestial/ceu-vedico.png';
import esferaQuantum from '@/assets/celestial/esfera-quantum.png';
import caminhoLunar from '@/assets/celestial/caminho-lunar.png';
import lotusSamadhi from '@/assets/celestial/lotus-samadhi.png';
import horizonte from '@/assets/celestial/horizonte.png';
import marca from '@/assets/celestial/marca.png';
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

// As imagens são ilustrações editoriais, nunca resultados calculados de um mapa.
const ilustracoesDosMapas: Record<string, StaticImageData> = {
  'landing-feature-1': ceuVedico,
  'landing-feature-2': lotusSamadhi,
  'landing-feature-3': esferaQuantum,
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

export function LandingPage({ overrideConfig, previewMode = false }: Props) {
  const { config: publicada, error: erroConfiguracao } =
    usePublicSitePageConfig('landing');
  const config = overrideConfig ?? publicada;
  const [menuAberto, setMenuAberto] = useState(false);
  const [catalogo, setCatalogo] = useState<Catalogo>({
    estado: 'carregando',
    planos: [],
  });
  const [tentativa, setTentativa] = useState(0);

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
      <p className={styles.eyebrow}>{rotulo}</p>
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
                    <Image
                      src={ilustracoesDosMapas[mapa.id] ?? ceuVedico}
                      alt=""
                      sizes="(max-width: 900px) 90vw, 30vw"
                      className={styles.mapArt}
                    />
                    <div className={styles.mapCopy}>
                      <h3>{mapa.title}</h3>
                      <p>{mapa.description}</p>
                    </div>
                  </article>
                ))}
              </div>
              <p className={styles.note}>
                As imagens ilustram cada perspectiva. Suas leituras são pessoais
                e dependem dos dados do perfil e dos recursos do seu plano.
              </p>
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
                      <Image
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
                          {moedaPtBr(plano.monthlyPrice, plano.currencyCode)}
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
          <Image
            src={marca}
            alt={config.footer.brandLine}
            sizes="280px"
            loading="eager"
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
            <p className={styles.eyebrow}>{config.hero.badgeText}</p>
            <h1 id="titulo-celestial">
              {config.hero.title} <span>{config.hero.accentTitle}</span>
            </h1>
            <p className={styles.heroDescription}>{config.hero.description}</p>
            <div className={styles.heroActions}>
              <Link
                href={config.hero.primaryCtaHref}
                className={styles.primaryButton}
              >
                {config.hero.primaryCtaLabel}
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                href={config.hero.secondaryCtaHref}
                className={styles.textLink}
              >
                {config.hero.secondaryCtaLabel}
              </Link>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <Image
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
              <Image
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
    </div>
  );
}
