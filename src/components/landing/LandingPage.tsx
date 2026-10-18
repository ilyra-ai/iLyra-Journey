'use client';

import {
  type CSSProperties,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  Fragment,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Compass,
  Eye,
  EyeOff,
  Heart,
  Leaf,
  LockKeyhole,
  Menu,
  Moon,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Sun,
  Waves,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';
import { MarcaLyra } from '@/components/marca/MarcaLyra';
import { PuckClientRenderer } from '@/components/puck/PuckClientRenderer';
import { ThemeToggleButton } from '@/components/theme/ThemeControls';
import { usePublicSitePageConfig } from '@/hooks/use-public-site-page-config';
import { getBuilderIcon } from '@/lib/site-page-config/ui';
import {
  ROTA_POLITICA_DE_PRIVACIDADE,
  ROTA_TERMOS_DE_USO,
} from '@/lib/lgpd/documentos';
import { moedaPtBr } from '@/lib/formato/numero';
import type {
  LandingPageConfig,
  LandingSectionKey,
} from '@/lib/site-page-config/schema';
import type { PlanMatrixPlan } from '@/types/subscription';
import './LandingJornada.css';

/**
 * Landing de evolução consciente da Lyra MetaCare.
 *
 * Este componente substitui SOMENTE a landing pública. Ele mantém o contrato
 * original com o Construtor (overrideConfig e previewMode), os links
 * configuráveis, o login real, os planos obtidos da API, os recursos,
 * indicadores, FAQ, termos/LGPD e blocos Puck publicados.
 *
 * Ilustrações locais: /public/landing-jornada (extraídas exclusivamente da
 * arte aprovada pelo proprietário, sem imagens de pessoas). Só são usadas
 * quando os quatro arquivos existem (conferido no next.config.ts).
 */
const COM_ARTE = process.env.LYRA_LANDING_COM_ARTE === '1';

type LandingPageProps = {
  overrideConfig?: LandingPageConfig;
  previewMode?: boolean;
};

type PublicPlansPayload = { plans?: PlanMatrixPlan[]; error?: string };

type LigacaoProps = {
  href: string;
  previewMode: boolean;
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
};

function Ligacao({
  href,
  previewMode,
  className,
  children,
  onNavigate,
}: LigacaoProps) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (previewMode) {
      event.preventDefault();
      return;
    }
    onNavigate?.();
  };
  if (href.startsWith('/')) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      className={className}
      onClick={onClick}
      rel={href.startsWith('https://') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  );
}

// A cópia editorial substitui apenas os valores padrão de fábrica. Textos
// publicados pelo administrador continuam prevalecendo sem mudança de schema.
const COPIA_INICIAL = {
  titulo: 'Seu corpo, sua rotina e o seu céu',
  destaque: 'em um só lugar, com orientação clara para cada dia.',
  descricao:
    'A Lyra MetaCare reúne sono, energia e ritmo com a astrologia védica do seu mapa para sugerir o que fazer hoje, em linguagem simples. Não substitui avaliação profissional de saúde.',
};

function TituloSecao({
  rotulo,
  titulo,
  descricao,
  id,
}: {
  rotulo: string;
  titulo: string;
  descricao: string;
  id: string;
}) {
  return (
    <div className="jornada-secao-intro">
      <p className="jornada-etiqueta">{rotulo}</p>
      <h2 id={id}>{titulo}</h2>
      <p>{descricao}</p>
    </div>
  );
}

function SimboloMarca({ prioridade = false }: { prioridade?: boolean }) {
  return <MarcaLyra tamanho="48px" prioridade={prioridade} />;
}

export function LandingPage({
  overrideConfig,
  previewMode = false,
}: LandingPageProps) {
  const router = useRouter();
  const { db } = useAuth();
  const { config: publicada } = usePublicSitePageConfig('landing');
  const config = overrideConfig ?? publicada;

  const [menuAberto, setMenuAberto] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [autenticando, setAutenticando] = useState(false);
  const [planos, setPlanos] = useState<PlanMatrixPlan[]>([]);
  const [estadoPlanos, setEstadoPlanos] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [erroPlanos, setErroPlanos] = useState('');
  const [tentativaPlanos, setTentativaPlanos] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function consultarPlanos() {
      try {
        const resposta = await fetch('/api/public/plans', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = (await resposta.json()) as PublicPlansPayload;
        if (!resposta.ok || !Array.isArray(payload.plans)) {
          throw new Error(
            payload.error ?? 'Não foi possível carregar os planos.'
          );
        }
        if (controller.signal.aborted) return;
        setPlanos(
          [...payload.plans].sort((a, b) => a.displayOrder - b.displayOrder)
        );
        setEstadoPlanos('ready');
      } catch (erro) {
        if (controller.signal.aborted) return;
        setErroPlanos(
          erro instanceof Error ? erro.message : 'Falha ao consultar os planos.'
        );
        setPlanos([]);
        setEstadoPlanos('error');
      }
    }
    void consultarPlanos();
    return () => controller.abort();
  }, [tentativaPlanos]);

  const estatisticas = useMemo(() => {
    const habilitados = planos.flatMap((plano) =>
      plano.features.filter((recurso) => recurso.enabled)
    );
    const categorias = new Set(habilitados.map((recurso) => recurso.category));
    const comAssinatura = planos.filter((plano) => plano.assinaturaOnline);
    return {
      planCount: planos.length,
      featureCount: habilitados.length,
      categoryCount: categorias.size,
      checkoutCount: comAssinatura.length,
    };
  }, [planos]);

  const valorIndicador = (origem: string, personalizado: string) => {
    if (origem === 'custom') return personalizado;
    if (origem in estatisticas) {
      return String(estatisticas[origem as keyof typeof estatisticas]);
    }
    return personalizado;
  };

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (previewMode || autenticando) return;
    setAutenticando(true);
    try {
      const { error } = await db.auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) {
        toast.error('Não foi possível entrar agora.', {
          description: error.message,
        });
        return;
      }
      toast.success('Boas-vindas. Sua órbita foi aberta com sucesso.');
      router.push('/');
    } catch (erro) {
      toast.error('Falha na autenticação.', {
        description:
          erro instanceof Error
            ? erro.message
            : 'Tente novamente em instantes.',
      });
    } finally {
      setAutenticando(false);
    }
  }

  const menu = [
    { label: 'Início', href: '#topo', visible: true },
    { label: 'Jornada', href: '#fluxo', visible: config.flow.visible },
    {
      label: 'Benefícios',
      href: '#recursos',
      visible: config.features.visible,
    },
    { label: 'Planos', href: '#planos', visible: config.plans.visible },
    { label: 'Dúvidas', href: '#faq', visible: config.faq.visible },
    { label: 'Sobre', href: '#sobre', visible: true },
  ].filter((item) => item.visible);

  const heroTitulo =
    config.hero.title === COPIA_INICIAL.titulo
      ? 'Evolua em direção à sua'
      : config.hero.title;
  const heroDestaque =
    config.hero.accentTitle === COPIA_INICIAL.destaque
      ? 'essência.'
      : config.hero.accentTitle;
  const heroDescricao =
    config.hero.description === COPIA_INICIAL.descricao
      ? 'Mais presença, equilíbrio, clareza e expansão interior para uma vida com mais significado. A Lyra MetaCare une dados de bem-estar, inteligência artificial e sabedoria integrativa para apoiar a sua jornada.'
      : config.hero.description;

  const fatoresDeEscala = {
    '--j-hero': String(config.typography.heroTitle),
    '--j-corpo': String(config.typography.heroBody),
    '--j-titulo-secao': String(config.typography.sectionTitle),
    '--j-titulo-cartao': String(config.typography.cardTitle),
    '--j-texto-cartao': String(config.typography.cardBody),
    '--j-botao': String(config.sizing.buttonScale),
    '--j-botao-texto': String(config.typography.buttonLabel),
    '--j-texto-secao': String(config.typography.sectionBody),
    '--j-cartao': String(config.sizing.featureCard),
    '--j-plano': String(config.sizing.planCard),
    '--j-icone': String(config.sizing.iconScale),
    '--j-hero-card': String(config.sizing.heroCard),
  } as CSSProperties;

  // Estes quatro conceitos são editoriais. Recursos técnicos reais seguem
  // sendo gerados logo abaixo a partir de config.features.items.
  const pilares = [
    {
      titulo: 'Autoconhecimento',
      descricao: 'Descubra seus padrões, seus ritmos e seu potencial.',
      icon: <Leaf aria-hidden="true" />,
    },
    {
      titulo: 'Equilíbrio integral',
      descricao: 'Cultive harmonia entre corpo, emoções e energia.',
      icon: <Waves aria-hidden="true" />,
    },
    {
      titulo: 'Clareza interior',
      descricao: 'Encontre presença e escolhas com mais consciência.',
      icon: <Sun aria-hidden="true" />,
    },
    {
      titulo: 'Inteligência compassiva',
      descricao: 'Tecnologia para apoiar uma jornada mais gentil.',
      icon: <Heart aria-hidden="true" />,
    },
  ];

  function renderizarSecao(chave: LandingSectionKey) {
    switch (chave) {
      case 'features':
        if (!config.features.visible) return null;
        return (
          <section
            key={chave}
            className="jornada-secao jornada-beneficios-reais"
            id="recursos"
          >
            <div className="jornada-container">
              <TituloSecao
                id="titulo-recursos"
                rotulo={config.features.badgeText}
                titulo={config.features.title}
                descricao={config.features.description}
              />
              <div
                className="jornada-grid-recursos"
                aria-labelledby="titulo-recursos"
              >
                {config.features.items.map((item) => {
                  const Icone = getBuilderIcon(item.icon);
                  return (
                    <article className="jornada-recurso" key={item.id}>
                      <span className="jornada-icone">
                        <Icone aria-hidden="true" />
                      </span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        );
      case 'flow':
        if (!config.flow.visible) return null;
        return (
          <section
            key={chave}
            className="jornada-secao jornada-fluxo"
            id="fluxo"
          >
            <div className="jornada-container">
              <TituloSecao
                id="titulo-fluxo"
                rotulo={config.flow.badgeText}
                titulo={config.flow.title}
                descricao={config.flow.description}
              />
              <ol
                className="jornada-grid-passos"
                aria-labelledby="titulo-fluxo"
              >
                {config.flow.items.map((item) => {
                  const Icone = getBuilderIcon(item.icon);
                  return (
                    <li key={item.id}>
                      {/* Linha do tempo: número grande, traço até o
                          próximo passo e o ícone escolhido no Construtor. */}
                      <div className="jornada-passo-topo">
                        <span className="jornada-passo-numero">
                          {item.step}
                        </span>
                        <span
                          className="jornada-passo-traco"
                          aria-hidden="true"
                        />
                        <span className="jornada-icone jornada-icone-pequeno">
                          <Icone aria-hidden="true" />
                        </span>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        );
      case 'metrics':
        if (!config.metrics.visible) return null;
        return (
          <section key={chave} className="jornada-secao jornada-indicadores">
            <div className="jornada-container">
              <TituloSecao
                id="titulo-indicadores"
                rotulo={config.metrics.badgeText}
                titulo={config.metrics.title}
                descricao={config.metrics.description}
              />
              <dl
                className="jornada-grid-indicadores"
                aria-labelledby="titulo-indicadores"
                aria-busy={estadoPlanos === 'loading'}
              >
                {config.metrics.items.map((item) => (
                  <div key={item.id}>
                    <dt>{item.label}</dt>
                    <dd className="jornada-indicador-valor">
                      {estadoPlanos === 'loading' && item.source !== 'custom'
                        ? '…'
                        : estadoPlanos === 'error' && item.source !== 'custom'
                          ? '—'
                          : valorIndicador(item.source, item.customValue)}
                    </dd>
                    <dd className="jornada-indicador-nota">{item.note}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        );
      case 'plans':
        if (!config.plans.visible) return null;
        return (
          <section
            key={chave}
            className="jornada-secao jornada-planos"
            id="planos"
          >
            <div className="jornada-container">
              <TituloSecao
                id="titulo-planos"
                rotulo={config.plans.badgeText}
                titulo={config.plans.title}
                descricao={config.plans.description}
              />
              {estadoPlanos === 'loading' ? (
                <p className="jornada-status" role="status">
                  Consultando planos disponíveis…
                </p>
              ) : null}
              {estadoPlanos === 'error' ? (
                <div className="jornada-erro" role="alert">
                  <p>{erroPlanos}</p>
                  <button
                    type="button"
                    className="jornada-botao jornada-botao-contorno"
                    onClick={() => {
                      setEstadoPlanos('loading');
                      setErroPlanos('');
                      setTentativaPlanos((n) => n + 1);
                    }}
                  >
                    <RotateCw aria-hidden="true" /> Tentar novamente
                  </button>
                </div>
              ) : null}
              {estadoPlanos === 'ready' && planos.length === 0 ? (
                <p className="jornada-status">
                  Nenhum plano está aberto para assinatura no momento.
                </p>
              ) : null}
              {estadoPlanos === 'ready' && planos.length > 0 ? (
                <div className="jornada-grid-planos">
                  {planos.map((plano, indice) => {
                    const anterior = indice > 0 ? planos[indice - 1] : null;
                    const funcionalidades = plano.features.filter(
                      (r) => r.enabled
                    );
                    const anteriores = new Set(
                      anterior?.features
                        .filter((r) => r.enabled)
                        .map((r) => r.key) ?? []
                    );
                    const novidades = funcionalidades.filter(
                      (r) => !anteriores.has(r.key)
                    );
                    const herda =
                      anterior !== null &&
                      novidades.length > 0 &&
                      novidades.length < funcionalidades.length;
                    const exibidas = herda ? novidades : funcionalidades;
                    return (
                      <article
                        className={`jornada-plano ${plano.key === 'meta' ? 'jornada-plano-destaque' : ''}`}
                        key={plano.key}
                      >
                        <div className="jornada-plano-topo">
                          <h3>{plano.name}</h3>
                          {plano.highlightText ? (
                            <span>{plano.highlightText}</span>
                          ) : null}
                        </div>
                        <p>{plano.tagline}</p>
                        <p className="jornada-preco">
                          {moedaPtBr(plano.monthlyPrice, plano.currencyCode)}
                          <span> /mês</span>
                        </p>
                        <p className="jornada-anual">
                          ou {moedaPtBr(plano.annualPrice, plano.currencyCode)}{' '}
                          por ano
                        </p>
                        <p className="jornada-descricao-plano">
                          {plano.description}
                        </p>
                        <p className="jornada-inclui">
                          {herda
                            ? `Tudo do ${anterior.name}, mais:`
                            : 'Inclui:'}
                        </p>
                        <ul>
                          {exibidas.slice(0, 5).map((recurso) => (
                            <li key={recurso.key}>
                              <Check aria-hidden="true" />
                              {recurso.name}
                            </li>
                          ))}
                          {exibidas.length > 5 ? (
                            <li>
                              <Check aria-hidden="true" />E mais{' '}
                              {exibidas.length - 5} recursos
                            </li>
                          ) : null}
                        </ul>
                        <Ligacao
                          href={config.hero.primaryCtaHref}
                          previewMode={previewMode}
                          className="jornada-botao jornada-botao-plano"
                        >
                          {config.plans.ctaLabel}{' '}
                          <ArrowRight aria-hidden="true" />
                        </Ligacao>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </section>
        );
      case 'faq':
        if (!config.faq.visible) return null;
        return (
          <section key={chave} className="jornada-secao jornada-faq" id="faq">
            <div className="jornada-container jornada-faq-layout">
              <TituloSecao
                id="titulo-faq"
                rotulo={config.faq.badgeText}
                titulo={config.faq.title}
                descricao={config.faq.description}
              />
              <div
                className="jornada-faq-perguntas"
                aria-labelledby="titulo-faq"
              >
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
            </div>
          </section>
        );
      case 'finalCta':
        if (!config.finalCta.visible) return null;
        return (
          <section
            key={chave}
            className="jornada-encerramento"
            aria-labelledby="titulo-encerramento"
          >
            <div className="jornada-onda-esquerda" aria-hidden="true" />
            <div className="jornada-onda-direita" aria-hidden="true" />
            <div className="jornada-encerramento-conteudo jornada-container">
              <SimboloMarca />
              <p className="jornada-etiqueta">{config.finalCta.badgeText}</p>
              <h2 id="titulo-encerramento">
                {config.finalCta.title ===
                'O seu próximo dia pode começar mais claro.'
                  ? 'Comece a sua jornada hoje.'
                  : config.finalCta.title}
              </h2>
              <p>
                {config.finalCta.description ===
                'Crie sua conta e receba a primeira leitura do seu dia em poucos minutos.'
                  ? 'Dê o primeiro passo para uma vida mais consciente, plena e em sintonia com o que realmente importa.'
                  : config.finalCta.description}
              </p>
              <div className="jornada-botoes jornada-botoes-centro">
                <Ligacao
                  href={config.finalCta.primaryHref}
                  previewMode={previewMode}
                  className="jornada-botao jornada-botao-principal"
                >
                  {config.finalCta.primaryLabel === 'Criar minha conta'
                    ? 'Comece agora'
                    : config.finalCta.primaryLabel}{' '}
                  <ArrowRight aria-hidden="true" />
                </Ligacao>
                <Ligacao
                  href={config.finalCta.secondaryHref}
                  previewMode={previewMode}
                  className="jornada-botao-texto"
                >
                  {config.finalCta.secondaryLabel}{' '}
                  <ArrowRight aria-hidden="true" />
                </Ligacao>
              </div>
            </div>
          </section>
        );
    }
  }

  const ordem = Array.from(
    new Set<LandingSectionKey>([
      ...config.sectionOrder,
      'features',
      'metrics',
      'flow',
      'plans',
      'faq',
      'finalCta',
    ])
  );
  const Principal = previewMode ? 'div' : 'main';

  const secaoEntrada = (
    <section
      className="jornada-secao jornada-login-direto"
      aria-labelledby="titulo-login-direto"
    >
      <div className="jornada-container jornada-login-resumo">
        <div>
          <p className="jornada-etiqueta">
            <LockKeyhole aria-hidden="true" /> {config.hero.quickAuthBadge}
          </p>
          <h2 id="titulo-login-direto">{config.hero.quickAuthTitle}</h2>
          <p>{config.hero.quickAuthDescription}</p>
        </div>
        <details className="jornada-login-expansivel">
          <summary>
            {config.hero.quickAuthSubmitLabel} com e-mail e senha{' '}
            <ChevronDown aria-hidden="true" />
          </summary>
          <form onSubmit={entrar}>
            <label htmlFor="jornada-email">E-mail</label>
            <input
              id="jornada-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              disabled={previewMode || autenticando}
              onChange={(evento) => setEmail(evento.target.value)}
            />
            <label htmlFor="jornada-senha">Senha</label>
            <div className="jornada-campo-senha">
              <input
                id="jornada-senha"
                type={verSenha ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={senha}
                disabled={previewMode || autenticando}
                onChange={(evento) => setSenha(evento.target.value)}
              />
              <button
                type="button"
                aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={verSenha}
                onClick={() => setVerSenha((atual) => !atual)}
              >
                {verSenha ? (
                  <EyeOff aria-hidden="true" />
                ) : (
                  <Eye aria-hidden="true" />
                )}
              </button>
            </div>
            <button
              type="submit"
              className="jornada-botao jornada-botao-principal"
              disabled={previewMode || autenticando}
            >
              {autenticando ? 'Entrando…' : config.hero.quickAuthSubmitLabel}{' '}
              <ArrowRight aria-hidden="true" />
            </button>
            <Ligacao
              href={config.hero.primaryCtaHref}
              previewMode={previewMode}
              className="jornada-link-criar"
            >
              {config.hero.quickAuthSecondaryLabel}
            </Ligacao>
          </form>
        </details>
      </div>
    </section>
  );

  return (
    <div
      className={`lyra-jornada${COM_ARTE ? ' jornada-com-arte' : ''}`}
      style={fatoresDeEscala}
    >
      {/* O "Pular para o conteúdo" vem do layout raiz (src/app/layout.tsx),
          que aponta para o #conteudo-principal abaixo. */}
      <header className="jornada-cabecalho">
        <div className="jornada-container jornada-cabecalho-conteudo">
          <Ligacao
            href="#topo"
            previewMode={previewMode}
            className="jornada-marca"
          >
            <SimboloMarca prioridade />
            <span>{config.footer.brandLine}</span>
          </Ligacao>
          <nav
            className={`jornada-menu ${menuAberto ? 'jornada-menu-aberto' : ''}`}
            aria-label="Navegação principal"
            id="navegacao-landing"
          >
            {menu.map((item) => (
              <Ligacao
                href={item.href}
                previewMode={previewMode}
                key={item.href}
                onNavigate={() => setMenuAberto(false)}
              >
                {item.label}
              </Ligacao>
            ))}
          </nav>
          <div className="jornada-cabecalho-acoes">
            {!previewMode ? <ThemeToggleButton /> : null}
            <Ligacao
              href={config.hero.primaryCtaHref}
              previewMode={previewMode}
              className="jornada-entrar"
            >
              {config.header.loginLabel}
            </Ligacao>
            <Ligacao
              href={config.hero.primaryCtaHref}
              previewMode={previewMode}
              className="jornada-botao jornada-botao-principal jornada-header-cta"
            >
              {config.header.fullLoginLabel} <ArrowRight aria-hidden="true" />
            </Ligacao>
            <button
              type="button"
              className="jornada-abrir-menu"
              aria-expanded={menuAberto}
              aria-controls="navegacao-landing"
              aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMenuAberto((aberto) => !aberto)}
            >
              {menuAberto ? (
                <X aria-hidden="true" />
              ) : (
                <Menu aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Na prévia do Construtor a página do admin já tem o seu
          #conteudo-principal: o id só existe na landing pública. */}
      <Principal id={previewMode ? undefined : 'conteudo-principal'}>
        <section
          className="jornada-hero"
          id="topo"
          aria-labelledby="titulo-hero"
        >
          <div className="jornada-hero-ambiente" aria-hidden="true" />
          <div className="jornada-container jornada-hero-conteudo">
            <div className="jornada-hero-texto">
              <p className="jornada-etiqueta">
                <Sparkles aria-hidden="true" /> {config.hero.badgeText}
              </p>
              <h1 id="titulo-hero">
                {heroTitulo} <em>{heroDestaque}</em>
              </h1>
              <p className="jornada-hero-descricao">{heroDescricao}</p>
              <div className="jornada-botoes">
                <Ligacao
                  href={config.hero.primaryCtaHref}
                  previewMode={previewMode}
                  className="jornada-botao jornada-botao-principal"
                >
                  {config.hero.primaryCtaLabel === 'Começar agora'
                    ? 'Comece agora'
                    : config.hero.primaryCtaLabel}{' '}
                  <ArrowRight aria-hidden="true" />
                </Ligacao>
                <Ligacao
                  href={config.hero.secondaryCtaHref}
                  previewMode={previewMode}
                  className="jornada-botao-texto"
                >
                  {config.hero.secondaryCtaLabel}{' '}
                  <ArrowRight aria-hidden="true" />
                </Ligacao>
              </div>
              <div className="jornada-assinatura">
                <span /> Uma vida mais consciente começa aqui
              </div>
            </div>
            <div
              className="jornada-hero-arte"
              role="img"
              aria-label="Flor de lótus luminosa sobre água e montanhas, evocando consciência e evolução"
            />
          </div>
        </section>

        <section
          className="jornada-pilares"
          aria-label="Pilares de bem-estar consciente"
        >
          <div className="jornada-container jornada-grid-pilares">
            {pilares.map((pilar) => (
              <div key={pilar.titulo} className="jornada-pilar">
                <span className="jornada-icone">{pilar.icon}</span>
                <h2>{pilar.titulo}</h2>
                <p>{pilar.descricao}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          className="jornada-manifesto"
          id="sobre"
          aria-labelledby="titulo-manifesto"
        >
          <div className="jornada-container jornada-manifesto-grid">
            <div
              className="jornada-vale"
              role="img"
              aria-label="Portal de luz sobre um vale com água e montanhas"
            />
            <div className="jornada-manifesto-texto">
              <p className="jornada-etiqueta">Presença e transformação</p>
              <h2 id="titulo-manifesto">
                Viva com mais <em>presença e significado.</em>
              </h2>
              <p>
                A vida ganha novas possibilidades quando você se reconecta com o
                que realmente importa. A Lyra MetaCare acompanha a sua jornada
                combinando tecnologia, cuidado e autoconhecimento.
              </p>
              <div className="jornada-compromisso">
                <Compass aria-hidden="true" /> Mais vida <span>•</span> Mais
                clareza <span>•</span> Mais você
              </div>
            </div>
          </div>
        </section>

        <section
          className="jornada-secao jornada-guia"
          aria-labelledby="titulo-guia"
        >
          {/* Layout editorial em duas colunas (título à esquerda, lista à
              direita) para não repetir a grade de três cartões usada em
              Recursos e em Como funciona. */}
          <div className="jornada-container jornada-guia-layout">
            <TituloSecao
              id="titulo-guia"
              rotulo={config.hero.previewBadge}
              titulo={config.hero.previewTitle}
              descricao={config.hero.previewDescription}
            />
            <ul className="jornada-guia-lista">
              {config.hero.previewItems.map((item) => {
                const Icone = getBuilderIcon(item.icon);
                return (
                  <li key={item.id} className="jornada-guia-item">
                    <span className="jornada-icone">
                      <Icone aria-hidden="true" />
                    </span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <PuckClientRenderer documentKey="landing-home" className="w-full" />

        {/* A entrada rápida vem logo antes do convite final, para que o
            convite feche a página (antes ficava depois dele, solta). A ordem
            das demais seções continua a do Construtor. */}
        {ordem.map((chave) =>
          chave === 'finalCta' ? (
            <Fragment key="entrada-e-convite">
              {secaoEntrada}
              {renderizarSecao(chave)}
            </Fragment>
          ) : (
            renderizarSecao(chave)
          )
        )}
      </Principal>

      <footer className="jornada-rodape">
        <div className="jornada-container jornada-rodape-conteudo">
          <div className="jornada-rodape-marca">
            <SimboloMarca />
            <strong>{config.footer.brandLine}</strong>
          </div>
          <p>{config.footer.note}</p>
          <nav aria-label="Documentos legais">
            <Ligacao
              href={ROTA_POLITICA_DE_PRIVACIDADE}
              previewMode={previewMode}
            >
              Política de privacidade
            </Ligacao>
            <Ligacao href={ROTA_TERMOS_DE_USO} previewMode={previewMode}>
              Termos de uso
            </Ligacao>
          </nav>
        </div>
        <div className="jornada-container jornada-rodape-fim">
          <ShieldCheck aria-hidden="true" /> Privacidade e respeito em cada
          etapa <span>•</span> <Moon aria-hidden="true" /> Bem-estar e
          autoconhecimento
        </div>
      </footer>
    </div>
  );
}
