'use client';

import { CSSProperties, SubmitEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ceuVedico from '@/assets/celestial/ceu-vedico-transparente.png';
import { MarcaLyra } from '@/components/marca/MarcaLyra';
import { CelestialBrand } from '@/components/public/CelestialBrand';
import identidade from '@/components/public/CelestialIdentity.module.css';
import { toast } from 'sonner';
import { ArrowLeft, Eye, EyeOff, Mail, User } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { usePublicSitePageConfig } from '@/hooks/use-public-site-page-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { apelidoSchema } from '@/lib/perfil/apelido';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { LoginPageConfig, ToneKey } from '@/lib/site-page-config/schema';
import { getBuilderIcon } from '@/lib/site-page-config/ui';
import { guardarRetorno } from '@/lib/auth/retorno';
import type { ErroDoLoginSocialCodigo } from '@/lib/auth/social/rotas';
import { BotaoDaChaveDeAcesso } from './BotaoDaChaveDeAcesso';
import { BotoesDeLoginSocial } from './BotoesDeLoginSocial';

/** Explicações dos erros do login com Google ou Apple (tarefa 235). */
const MENSAGENS_DO_LOGIN_SOCIAL: Record<ErroDoLoginSocialCodigo, string> = {
  indisponivel:
    'Esse login não está disponível agora. Entre com e-mail e senha.',
  expirou: 'O login demorou demais ou foi aberto em outra aba. Tente de novo.',
  recusado:
    'Não foi possível confirmar o login com o provedor. Tente de novo ou entre com e-mail e senha.',
  termos:
    'Para criar a conta, abra Criar conta, aceite os termos e escolha o Google ou a Apple de novo.',
  'sem-email': 'O provedor não confirmou um e-mail. Entre com e-mail e senha.',
  bloqueada:
    'Sua conta está bloqueada. Entre em contato com a administração para recuperar o acesso.',
  cancelado:
    'O login foi cancelado. Escolha outra forma de entrar ou tente de novo.',
};
import {
  ROTA_POLITICA_DE_PRIVACIDADE,
  ROTA_TERMOS_DE_USO,
} from '@/lib/lgpd/documentos';
import { marcarEtapa } from '@/lib/funil/cliente';
import {
  separarNome,
  verParaOCadastro,
} from '@/lib/descoberta/levar-ao-cadastro';
import './LoginExperience.css';

type SubmitMode = 'login' | 'register' | null;

// Os destaques do construtor mantêm contraste na identidade celestial.
function corDoIconeDestaque(tone: ToneKey): string {
  return tone === 'cosmic' ? 'text-foreground' : 'text-primary';
}

type LoginExperienceProps = {
  modoInicial?: 'login' | 'cadastro';
  /** Identificador de retorno já validado (tarefa 159). */
  retorno?: string | null;
  /** Código de erro do login social, já validado pela página (tarefa 235). */
  erroSocial?: ErroDoLoginSocialCodigo | null;
  // Configuração em edição no Site Experience Builder (pré-visualização).
  overrideConfig?: LoginPageConfig;
  previewMode?: boolean;
};

// Converte a escala tipográfica configurada pelo admin (0,8 a 1,4) em um
// tamanho fluido, mantendo a proporção do design base.
function escalaFluida(
  baseRem: number,
  escala: number
): Pick<CSSProperties, 'fontSize'> {
  const min = (baseRem * 0.85 * escala).toFixed(3);
  const ideal = (baseRem * escala).toFixed(3);
  const max = (baseRem * 1.12 * escala).toFixed(3);
  return { fontSize: `clamp(${min}rem, ${ideal}rem, ${max}rem)` };
}

export function LoginExperience({
  overrideConfig,
  previewMode = false,
  modoInicial = 'login',
  retorno = null,
  erroSocial = null,
}: LoginExperienceProps) {
  // Guarda só o identificador, nesta aba, para depois do cadastro e do
  // onboarding (tarefa 159).
  useEffect(() => guardarRetorno(retorno), [retorno]);
  // Depois do login ou do cadastro, o AuthProvider leva a sessão ao destino
  // certo (onboarding para conta nova, painel para as demais) numa única
  // navegação; antes esta tela ia ao painel e só então ao onboarding.
  const { db } = useAuth();
  const { config: publicConfig } = usePublicSitePageConfig('login');
  const config = overrideConfig ?? publicConfig;
  const { intro, auth, typography, sizing } = config;

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  // Leitura gratuita levada com consentimento (tarefa 188): o nome vem só
  // da memória desta janela, sem armazenamento.
  const [registerFirstName, setRegisterFirstName] = useState(
    () => separarNome(verParaOCadastro()?.nome ?? '').primeiro
  );
  const [registerLastName, setRegisterLastName] = useState(
    () => separarNome(verParaOCadastro()?.nome ?? '').sobrenome
  );
  const [registerNickname, setRegisterNickname] = useState('');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [submitMode, setSubmitMode] = useState<SubmitMode>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Alterna entre as visões de login e cadastro.
  const [isRegistering, setIsRegistering] = useState(
    modoInicial === 'cadastro'
  );
  // "Lembrar-me": sessão de 7 dias quando marcado; sessão de navegador quando
  // desmarcado (ver src/lib/auth/session.ts).
  const [rememberMe, setRememberMe] = useState(false);
  // LGPD: o cadastro exige o aceite dos termos e da política de privacidade.
  const [aceiteDosTermos, setAceiteDosTermos] = useState(false);

  const iconStyle: CSSProperties = {
    width: `${(1.125 * sizing.iconScale).toFixed(3)}rem`,
    height: `${(1.125 * sizing.iconScale).toFixed(3)}rem`,
  };
  const buttonStyle: CSSProperties = {
    minHeight: `max(44px, ${(2.75 * sizing.buttonScale).toFixed(3)}rem)`,
    height: 'auto',
    ...escalaFluida(0.9375, typography.buttonLabel),
  };
  const fieldStyle = escalaFluida(1.0625, typography.fieldLabel);
  const labelStyle = escalaFluida(1, typography.fieldLabel);

  async function handleLogin(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (previewMode || submitMode) return;

    // Funil anônimo (tarefa 170): o servidor conta o login concluído.
    marcarEtapa('login_iniciado', 'email');
    setSubmitMode('login');

    const { error } = await db.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
      remember: rememberMe,
    });

    setSubmitMode(null);

    if (error) {
      toast.error('Não foi possível entrar agora.', {
        description: error.message,
      });
      return;
    }

    toast.success('Que bom te receber de novo.');
  }

  async function handleRegister(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (previewMode || submitMode) return;
    marcarEtapa('login_iniciado', 'email');
    const apelido = apelidoSchema.safeParse(registerNickname);
    if (!apelido.success) {
      setNicknameError(apelido.error.issues[0]?.message ?? 'Revise o apelido.');
      return;
    }

    setSubmitMode('register');

    const { error } = await db.auth.signUp({
      email: registerEmail,
      password: registerPassword,
      firstName: registerFirstName,
      lastName: registerLastName,
      nickname: apelido.data,
      acceptTerms: aceiteDosTermos,
    });

    setSubmitMode(null);

    if (error) {
      toast.error('Não foi possível criar sua conta agora.', {
        description: error.message,
      });
      return;
    }

    toast.success('Conta criada com sucesso. Vamos abrir sua jornada.');
  }

  // Ícone à esquerda dentro do campo (decorativo; o rótulo é o nome acessível).
  const fieldIconWrapperClass =
    'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5';
  const fieldIconClass =
    'text-muted-foreground transition-colors group-focus-within:text-primary';

  const larguraDaIntroducao = {
    maxWidth: `${Math.round(520 * sizing.introCard)}px`,
  };
  const paddingDaColunaEsquerda = 'login-coluna-intro';

  // Ordem do conteúdo (DOM e leitura): marca → título → formulário →
  // detalhes da introdução → volta à landing. No celular é exatamente essa a
  // ordem na tela, então o formulário aparece logo na primeira dobra (antes
  // vinha depois de todo o texto de apresentação). A partir de `lg`, a grade
  // devolve o desenho em duas colunas: apresentação à esquerda (título e
  // detalhes centralizados na altura) e formulário à direita.
  return (
    <main
      id={previewMode ? undefined : 'conteudo-principal'}
      className={cn(identidade.theme, 'lyra-login')}
      data-cadastro={isRegistering}
      onClickCapture={
        previewMode
          ? (event) => {
              if ((event.target as HTMLElement).closest('a'))
                event.preventDefault();
            }
          : undefined
      }
      style={
        {
          '--login-largura-intro': larguraDaIntroducao.maxWidth,
        } as CSSProperties
      }
    >
      <div
        className={cn(
          'login-marca flex min-w-0 flex-wrap items-center gap-1',
          paddingDaColunaEsquerda
        )}
      >
        <CelestialBrand />
        {!['lyra', 'iLyra', 'Lyra MetaCare'].includes(auth.brandText) ? (
          <span className="text-sm text-muted-foreground">
            {auth.brandText}
          </span>
        ) : null}
      </div>

      <h1 className="sr-only">Acesso à iLyra</h1>

      {/* Formulário: logo após o título no celular; coluna direita no desktop */}
      <section
        aria-labelledby="titulo-acesso"
        className="login-acesso flex min-w-0 items-start justify-center"
      >
        <div
          className="w-full"
          style={{ maxWidth: `${Math.round(400 * sizing.authCard)}px` }}
        >
          {/* Selo e descrição do bloco de acesso, editáveis no construtor de
              UI (login.auth.badgeText e login.auth.description). */}
          <p className="mb-1 text-base text-primary">{auth.badgeText}</p>
          <h2
            id="titulo-acesso"
            className="font-display font-semibold tracking-tight text-foreground"
            style={escalaFluida(3.25, typography.authTitle)}
          >
            {isRegistering ? auth.registerTabLabel : auth.loginTabLabel}
          </h2>
          <p
            className="mt-2 leading-relaxed text-muted-foreground"
            style={escalaFluida(1.0625, typography.authBody)}
          >
            {auth.title} <span>{auth.description}</span>
          </p>

          {erroSocial ? (
            <p
              role="alert"
              className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
            >
              {MENSAGENS_DO_LOGIN_SOCIAL[erroSocial]}
            </p>
          ) : null}

          <Tabs
            value={isRegistering ? 'register' : 'login'}
            onValueChange={(value) => setIsRegistering(value === 'register')}
            className="mt-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{auth.loginTabLabel}</TabsTrigger>
              <TabsTrigger value="register">
                {auth.registerTabLabel}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4">
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="login-email"
                    className="font-medium text-foreground"
                    style={labelStyle}
                  >
                    {auth.emailLabel}
                  </Label>
                  <div className="group relative">
                    <div className={fieldIconWrapperClass}>
                      <User
                        className={fieldIconClass}
                        style={iconStyle}
                        aria-hidden
                      />
                    </div>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder={auth.emailLabel}
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-11"
                      style={fieldStyle}
                      disabled={previewMode}
                    />
                  </div>
                </div>

                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel htmlFor="login-password" style={labelStyle}>
                      {auth.passwordLabel}
                    </FieldLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? 'Ocultar senha' : 'Mostrar senha'
                      }
                      aria-pressed={showPassword}
                      aria-controls="login-password"
                      disabled={previewMode}
                    >
                      {showPassword ? (
                        <EyeOff data-icon="inline-start" aria-hidden />
                      ) : (
                        <Eye data-icon="inline-start" aria-hidden />
                      )}
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </Button>
                  </div>
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    style={fieldStyle}
                    disabled={previewMode}
                  />
                </Field>

                <div className="flex min-h-11 items-center gap-2.5">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setRememberMe(checked === true)
                    }
                    disabled={previewMode}
                  />
                  <Label
                    htmlFor="remember"
                    className="flex min-h-11 cursor-pointer items-center text-sm font-normal text-foreground"
                  >
                    Lembrar-me por 7 dias
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={previewMode || submitMode === 'login'}
                  className="w-full rounded-md font-semibold"
                  style={buttonStyle}
                >
                  {submitMode === 'login'
                    ? 'Entrando...'
                    : auth.loginButtonLabel}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-4">
              <form onSubmit={handleRegister} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="min-w-0 flex flex-col gap-1.5">
                    <Label
                      htmlFor="reg-firstname"
                      className="font-medium text-foreground"
                      style={labelStyle}
                    >
                      {auth.firstNameLabel}
                    </Label>
                    <Input
                      id="reg-firstname"
                      autoComplete="given-name"
                      placeholder={auth.firstNameLabel}
                      required
                      value={registerFirstName}
                      onChange={(e) => setRegisterFirstName(e.target.value)}
                      style={fieldStyle}
                      disabled={previewMode}
                    />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1.5">
                    <Label
                      htmlFor="reg-lastname"
                      className="font-medium text-foreground"
                      style={labelStyle}
                    >
                      {auth.lastNameLabel}
                    </Label>
                    <Input
                      id="reg-lastname"
                      autoComplete="family-name"
                      placeholder={auth.lastNameLabel}
                      required
                      value={registerLastName}
                      onChange={(e) => setRegisterLastName(e.target.value)}
                      style={fieldStyle}
                      disabled={previewMode}
                    />
                  </div>
                </div>

                <FieldGroup>
                  <Field data-invalid={Boolean(nicknameError)}>
                    <FieldLabel htmlFor="reg-nickname">
                      Como Você Gostaria de Ser Chamado
                    </FieldLabel>
                    <Input
                      id="reg-nickname"
                      name="nickname"
                      autoComplete="nickname"
                      maxLength={80}
                      value={registerNickname}
                      disabled={previewMode}
                      aria-invalid={Boolean(nicknameError)}
                      aria-describedby="reg-nickname-description reg-nickname-error"
                      onChange={(e) => {
                        setRegisterNickname(e.target.value);
                        setNicknameError(null);
                      }}
                    />
                    <FieldDescription id="reg-nickname-description">
                      Opcional. A Lyra chama você de xuxu. Se preferir, peça no
                      chat para ela usar o nome informado aqui.
                    </FieldDescription>
                    <FieldError id="reg-nickname-error">
                      {nicknameError}
                    </FieldError>
                  </Field>
                </FieldGroup>

                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="reg-email"
                    className="font-medium text-foreground"
                    style={labelStyle}
                  >
                    {auth.emailLabel}
                  </Label>
                  <div className="group relative">
                    <div className={fieldIconWrapperClass}>
                      <Mail
                        className={fieldIconClass}
                        style={iconStyle}
                        aria-hidden
                      />
                    </div>
                    <Input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      placeholder={auth.emailLabel}
                      required
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="pl-11"
                      style={fieldStyle}
                      disabled={previewMode}
                    />
                  </div>
                </div>

                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel htmlFor="reg-password" style={labelStyle}>
                      {auth.passwordLabel}
                    </FieldLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? 'Ocultar senha' : 'Mostrar senha'
                      }
                      aria-pressed={showPassword}
                      aria-controls="reg-password"
                      disabled={previewMode}
                    >
                      {showPassword ? (
                        <EyeOff data-icon="inline-start" aria-hidden />
                      ) : (
                        <Eye data-icon="inline-start" aria-hidden />
                      )}
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </Button>
                  </div>
                  <Input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={registerPassword}
                    onChange={(event) =>
                      setRegisterPassword(event.target.value)
                    }
                    style={fieldStyle}
                    disabled={previewMode}
                  />
                  <FieldDescription>
                    Use pelo menos 8 caracteres.
                  </FieldDescription>
                </Field>

                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="aceite-termos"
                    checked={aceiteDosTermos}
                    onCheckedChange={(checked) =>
                      setAceiteDosTermos(checked === true)
                    }
                    disabled={previewMode}
                    className="mt-3"
                    aria-describedby="aceite-termos-ajuda"
                  />
                  <div className="min-w-0">
                    <Label
                      htmlFor="aceite-termos"
                      className="flex min-h-11 cursor-pointer items-center text-sm font-normal leading-snug text-foreground"
                    >
                      Li e aceito os termos de uso e a política de privacidade.
                    </Label>
                    <p
                      id="aceite-termos-ajuda"
                      className="text-xs leading-5 text-muted-foreground"
                    >
                      Leia os{' '}
                      <Link
                        href={ROTA_TERMOS_DE_USO}
                        target="_blank"
                        className="font-medium text-primary underline underline-offset-2"
                      >
                        termos de uso
                        <span className="sr-only"> (abre em nova aba)</span>
                      </Link>{' '}
                      e a{' '}
                      <Link
                        href={ROTA_POLITICA_DE_PRIVACIDADE}
                        target="_blank"
                        className="font-medium text-primary underline underline-offset-2"
                      >
                        política de privacidade
                        <span className="sr-only"> (abre em nova aba)</span>
                      </Link>
                      .
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={
                    previewMode || submitMode === 'register' || !aceiteDosTermos
                  }
                  className="w-full rounded-md font-semibold"
                  style={buttonStyle}
                >
                  {submitMode === 'register'
                    ? 'Criando...'
                    : auth.registerButtonLabel}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          {/* Chave de acesso (tarefa 167): só para quem já tem conta. */}
          {isRegistering ? null : (
            <BotaoDaChaveDeAcesso previewMode={previewMode} />
          )}
          <BotoesDeLoginSocial
            cadastro={isRegistering}
            aceiteDosTermos={aceiteDosTermos}
            retorno={retorno}
            previewMode={previewMode}
          />
        </div>
      </section>

      {intro.visible ? (
        <div className={cn('login-detalhes min-w-0', paddingDaColunaEsquerda)}>
          <div className="login-intro-conteudo">
            <Image
              src={ceuVedico}
              alt=""
              sizes="280px"
              className="login-arte"
              loading="eager"
            />
            <p
              className="font-display font-medium tracking-tight text-foreground/80"
              style={escalaFluida(1.125, typography.introTitle)}
            >
              {intro.accentTitle}
            </p>
            <p
              className="mt-3 leading-relaxed text-muted-foreground"
              style={escalaFluida(0.9375, typography.introBody)}
            >
              {intro.description}
            </p>

            {intro.highlights.length > 0 ? (
              <ul className="login-destaques mt-4 flex flex-col gap-3">
                {intro.highlights.map((highlight) => {
                  const HighlightIcon = getBuilderIcon(highlight.icon);
                  return (
                    <li
                      key={highlight.id}
                      className="flex items-start gap-3 leading-6"
                      style={escalaFluida(0.875, typography.highlightBody)}
                    >
                      {highlight.icon === 'bot' ? (
                        <MarcaLyra tamanho="20px" className="mt-0.5" />
                      ) : (
                        <HighlightIcon
                          className={cn(
                            'mt-0.5 h-5 w-5 shrink-0',
                            corDoIconeDestaque(highlight.tone)
                          )}
                          aria-hidden
                        />
                      )}
                      <span className="min-w-0">
                        <strong
                          className="font-semibold text-foreground"
                          style={escalaFluida(0.875, typography.highlightTitle)}
                        >
                          {highlight.title}
                        </strong>
                        <span className="sr-only">:</span>{' '}
                        <span className="text-muted-foreground">
                          {highlight.description}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={cn('login-rodape pt-3', paddingDaColunaEsquerda)}>
        <Link
          href="/"
          className="-mx-1 inline-flex min-h-11 w-fit items-center gap-2 rounded-sm px-1 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {auth.backToLandingLabel}
        </Link>
        <nav
          aria-label="Documentos legais"
          className="login-legais flex flex-wrap justify-center gap-x-4 text-sm text-muted-foreground"
        >
          <Link
            href={ROTA_POLITICA_DE_PRIVACIDADE}
            className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
          >
            Política de privacidade
          </Link>
          <Link
            href={ROTA_TERMOS_DE_USO}
            className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
          >
            Termos de uso
          </Link>
        </nav>
        <p
          className="login-lembrete text-muted-foreground"
          style={escalaFluida(0.75, typography.footerText)}
        >
          {auth.footerEyebrow} · {auth.footerText}
        </p>
      </div>
    </main>
  );
}
