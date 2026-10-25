'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { buscarJson } from '@/lib/http/transporte';
import { apelidoSchema } from '@/lib/perfil/apelido';
import { idadeDoNascimento } from '@/lib/perfil/conclusao-onboarding';
import { ROTA_POLITICA_DE_PRIVACIDADE } from '@/lib/lgpd/documentos';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { TimeInput } from '@/components/ui/time-input';
import { SeletorDeCidade } from '@/components/geo/SeletorDeCidade';
import { OnboardingNavigationDots } from './OnboardingNavigationDots';

const cidade = z.object({
  id: z.number().int().positive(),
  rotulo: z.string().max(255),
});
const genero = z.enum(['male', 'female', 'other', 'prefer_not-to-say']);
const schema = z.object({
  first_name: z.string().trim().min(2, 'Informe seu nome.').max(120),
  last_name: z.string().trim().min(2, 'Informe seu sobrenome.').max(120),
  nickname: apelidoSchema,
  birth_date: z
    .date({ error: 'Informe sua data de nascimento.' })
    .refine((v) => {
      const idade = idadeDoNascimento(format(v, 'yyyy-MM-dd'));
      return idade >= 13 && idade <= 120;
    }, 'Informe uma data correspondente a uma idade entre 13 e 120 anos.'),
  birth_time: z
    .string()
    .refine(
      (v) => !v || /^([01]\d|2[0-3]):[0-5]\d$/.test(v),
      'Use um horário entre 00:00 e 23:59.'
    ),
  birth_city: cidade
    .nullable()
    .refine((v) => v !== null, 'Escolha a cidade de nascimento na lista.'),
  residence_city: cidade.nullable(),
  gender: genero.optional(),
  activity_level: z.number().int().min(1).max(5).optional(),
  consent: z
    .boolean()
    .refine((v) => v, 'Confirme o consentimento para concluir.'),
});
type Valores = z.output<typeof schema>;
type Entrada = z.input<typeof schema>;
const grupos: Array<Array<keyof Valores>> = [
  [
    'first_name',
    'last_name',
    'nickname',
    'birth_date',
    'gender',
    'activity_level',
  ],
  ['birth_city', 'birth_time', 'residence_city'],
  ['consent'],
];
const rascunhoSchema = z.object({
  version: z.literal(1),
  expires: z.number(),
  step: z.number().int().min(0).max(2),
  data: z.object({
    first_name: z.string().max(120),
    last_name: z.string().max(120),
    nickname: z.string().max(80),
    birth_date: z.iso.date().nullable(),
    birth_time: z.string().max(5),
    birth_city: cidade.nullable(),
    residence_city: cidade.nullable(),
    gender: genero.nullable(),
    activity_level: z.number().int().min(1).max(5).nullable(),
  }),
});
const etapas = [
  {
    title: 'Vamos começar por você',
    description:
      'Só o essencial para preparar sua experiência. As preferências opcionais podem ficar para depois.',
    icon: UserRound,
  },
  {
    title: 'Seu lugar no mundo',
    description:
      'A cidade de nascimento dá contexto ao seu mapa. Informe o horário apenas se souber.',
    icon: MapPin,
  },
  {
    title: 'Tudo pronto para entrar',
    description:
      'Confira suas informações e escolha se autoriza o uso dos dados para personalizar seu cuidado.',
    icon: ShieldCheck,
  },
];

export function OnboardingForm() {
  const { db, session } = useAuth();
  const titular = session?.user.id;
  const [etapa, setEtapa] = React.useState(0),
    [loadedFor, setLoadedFor] = React.useState<string | null>(null),
    [falhaPerfil, setFalhaPerfil] = React.useState<string | null>(null),
    [tentativa, setTentativa] = React.useState(0);
  const [enviando, setEnviando] = React.useState(false),
    [concluido, setConcluido] = React.useState(false),
    [falhaEnvio, setFalhaEnvio] = React.useState<string | null>(null),
    [rascunhoSalvo, setRascunhoSalvo] = React.useState(false);
  const falhaRascunho = React.useRef(false);
  const valoresOriginais = React.useRef<{
    hora: string;
    moradia: number | null;
  }>({ hora: '', moradia: null });
  const inicializado = React.useRef<string | null>(null),
    stepRef = React.useRef(0),
    titulo = React.useRef<HTMLHeadingElement>(null);
  const form = useForm<Entrada, unknown, Valores>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: '',
      last_name: '',
      nickname: '',
      birth_time: '',
      birth_city: null,
      residence_city: null,
      consent: false,
    },
  });
  const chave = titular ? `lyra:onboarding:v1:${titular}` : null;
  const persistir = React.useCallback(() => {
    if (!chave || inicializado.current !== titular) return;
    const v = form.getValues();
    try {
      sessionStorage.setItem(
        chave,
        JSON.stringify({
          version: 1,
          expires: Date.now() + 86400000,
          step: stepRef.current,
          data: {
            first_name: v.first_name,
            last_name: v.last_name,
            nickname: v.nickname,
            birth_date:
              v.birth_date && Number.isFinite(v.birth_date.getTime())
                ? format(v.birth_date, 'yyyy-MM-dd')
                : null,
            birth_time: v.birth_time,
            birth_city: v.birth_city,
            residence_city: v.residence_city,
            gender: v.gender ?? null,
            activity_level: v.activity_level ?? null,
          },
        })
      );
    } catch {
      if (!falhaRascunho.current) {
        falhaRascunho.current = true;
        toast.info(
          'Não foi possível guardar o rascunho nesta aba. Mantenha a página aberta até concluir.'
        );
      }
    }
  }, [chave, form, titular]);
  React.useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: () => persistir(),
      }),
    [form, persistir]
  );
  React.useEffect(() => {
    if (!titular || !chave) return;
    let ativo = true;
    inicializado.current = null;
    async function carregar() {
      try {
        const { data, error } = await db
          .from('profiles')
          .select(
            'first_name,last_name,nickname,birth_date,birth_time,birth_city_id,birth_location,residence_city_id,residence_location,gender,activity_level'
          )
          .eq('id', titular!)
          .maybeSingle();
        if (!ativo) return;
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Não foi possível recuperar seu perfil.');
        setRascunhoSalvo(false);
        falhaRascunho.current = false;
        const perfil = data as {
          first_name: string | null;
          last_name: string | null;
          nickname: string | null;
          birth_date: string | null;
          birth_time: string | null;
          birth_city_id: number | null;
          birth_location: string | null;
          residence_city_id: number | null;
          residence_location: string | null;
          gender: string | null;
          activity_level: number | string | null;
        };
        valoresOriginais.current = {
          hora: perfil.birth_time?.slice(0, 5) ?? '',
          moradia: perfil.residence_city_id,
        };
        const base: Partial<Entrada> = {
          first_name:
            perfil.first_name ?? session?.user.user_metadata.first_name ?? '',
          last_name:
            perfil.last_name ?? session?.user.user_metadata.last_name ?? '',
          nickname: perfil.nickname ?? '',
          birth_date:
            perfil.birth_date &&
            Number.isFinite(parseISO(perfil.birth_date).getTime())
              ? parseISO(perfil.birth_date)
              : undefined,
          birth_time: perfil.birth_time?.slice(0, 5) ?? '',
          birth_city: perfil.birth_city_id
            ? { id: perfil.birth_city_id, rotulo: perfil.birth_location ?? '' }
            : null,
          residence_city: perfil.residence_city_id
            ? {
                id: perfil.residence_city_id,
                rotulo: perfil.residence_location ?? '',
              }
            : null,
          gender: genero.safeParse(perfil.gender).success
            ? genero.parse(perfil.gender)
            : undefined,
          activity_level:
            perfil.activity_level !== null &&
            Number(perfil.activity_level) >= 1 &&
            Number(perfil.activity_level) <= 5
              ? Number(perfil.activity_level)
              : undefined,
          consent: false,
        };
        let voltar = 0;
        try {
          const raw = sessionStorage.getItem(chave!);
          if (raw) {
            const draft = rascunhoSchema.safeParse(JSON.parse(raw));
            if (draft.success && draft.data.expires > Date.now()) {
              const d = draft.data.data;
              Object.assign(base, d, {
                birth_date: d.birth_date ? parseISO(d.birth_date) : undefined,
                gender: d.gender ?? undefined,
                activity_level: d.activity_level ?? undefined,
                consent: false,
              });
              voltar = draft.data.step;
              setRascunhoSalvo(true);
            } else sessionStorage.removeItem(chave!);
          }
        } catch {
          try {
            sessionStorage.removeItem(chave!);
          } catch {
            /* O formulário continua sem armazenamento local. */
          }
        }
        if (
          !schema
            .pick({
              first_name: true,
              last_name: true,
              nickname: true,
              birth_date: true,
              gender: true,
              activity_level: true,
            })
            .safeParse(base).success
        )
          voltar = 0;
        else if (
          !schema
            .pick({ birth_city: true, birth_time: true, residence_city: true })
            .safeParse(base).success
        )
          voltar = Math.min(voltar, 1);
        form.reset(base);
        stepRef.current = voltar;
        setEtapa(voltar);
        inicializado.current = titular!;
        setLoadedFor(titular!);
        setFalhaPerfil(null);
        // Preserva o estado do Next.js e permite retornar pelas etapas no navegador.
        if (window.history.state?.lyraOnboardingOwner !== titular) {
          window.history.replaceState(
            {
              ...window.history.state,
              lyraOnboardingOwner: titular,
              lyraOnboardingStep: 0,
            },
            ''
          );
          for (let i = 1; i <= voltar; i++)
            window.history.pushState(
              { ...window.history.state, lyraOnboardingStep: i },
              ''
            );
        } else
          window.history.replaceState(
            { ...window.history.state, lyraOnboardingStep: voltar },
            ''
          );
      } catch (e) {
        if (ativo)
          setFalhaPerfil(
            e instanceof Error
              ? e.message
              : 'Não foi possível carregar seu perfil.'
          );
      }
    }
    void carregar();
    return () => {
      ativo = false;
      inicializado.current = null;
    };
  }, [
    titular,
    chave,
    tentativa,
    db,
    form,
    session?.user.user_metadata.first_name,
    session?.user.user_metadata.last_name,
  ]);
  React.useEffect(() => {
    function voltar(e: PopStateEvent) {
      if (
        location.pathname !== '/onboarding' ||
        e.state?.lyraOnboardingOwner !== titular
      )
        return;
      const n = Number(e.state.lyraOnboardingStep);
      if (Number.isInteger(n) && n >= 0 && n <= 2) {
        stepRef.current = n;
        setEtapa(n);
        persistir();
      }
    }
    window.addEventListener('popstate', voltar);
    return () => window.removeEventListener('popstate', voltar);
  }, [titular, persistir]);
  React.useEffect(() => {
    titulo.current?.focus();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [etapa, loadedFor]);
  function mudar(n: number) {
    stepRef.current = n;
    setEtapa(n);
    window.history.pushState(
      {
        ...window.history.state,
        lyraOnboardingOwner: titular,
        lyraOnboardingStep: n,
      },
      ''
    );
    persistir();
  }
  function focarErro() {
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>('main [aria-invalid="true"]')?.focus()
    );
  }
  async function continuar() {
    if (await form.trigger(grupos[etapa], { shouldFocus: true }))
      mudar(etapa + 1);
    else {
      focarErro();
      toast.error('Confira o campo destacado para continuar.');
    }
  }
  async function gravar(v: Valores) {
    if (!v.birth_city || !titular) return;
    const moradiaId = v.residence_city?.id ?? null;
    setEnviando(true);
    setFalhaEnvio(null);
    try {
      if (!concluido) {
        const body = {
          first_name: v.first_name,
          last_name: v.last_name,
          nickname: v.nickname || null,
          birth_date: format(v.birth_date, 'yyyy-MM-dd'),
          birth_city_id: v.birth_city.id,
          ...(v.birth_time || v.birth_time !== valoresOriginais.current.hora
            ? { birth_time: v.birth_time || null }
            : {}),
          ...(v.residence_city || moradiaId !== valoresOriginais.current.moradia
            ? { residence_city_id: moradiaId }
            : {}),
          ...(v.gender !== undefined ? { gender: v.gender } : {}),
          ...(v.activity_level !== undefined
            ? { activity_level: v.activity_level }
            : {}),
          consent: v.consent,
        };
        const r = await buscarJson('/api/onboarding', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(r.falha.message);
        setConcluido(true);
        inicializado.current = null;
        if (chave)
          try {
            sessionStorage.removeItem(chave);
          } catch {
            /* Perfil já está salvo no servidor. */
          }
      }
      const result = await db.auth.refreshSession();
      if (result.error) throw new Error(result.error.message);
      if (!result.data.session)
        throw new Error('Entre novamente para continuar.');
      toast.success('Seu espaço está pronto. Bem-vindo(a)!');
    } catch (e) {
      setFalhaEnvio(
        e instanceof Error ? e.message : 'Não foi possível salvar agora.'
      );
    } finally {
      setEnviando(false);
    }
  }
  if (loadedFor !== titular)
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Preparando seu espaço</CardTitle>
          <CardDescription>
            Recuperando suas informações para você não precisar preenchê-las
            outra vez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {falhaPerfil ? (
            <div role="alert" className="space-y-4">
              <p>{falhaPerfil}</p>
              <Button onClick={() => setTentativa((v) => v + 1)}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <p role="status">Carregando seu perfil…</p>
          )}
        </CardContent>
      </Card>
    );
  const atual = etapas[etapa],
    Icone = atual.icon,
    v = form.getValues();
  return (
    <Form {...form}>
      <form
        className="w-full max-w-2xl space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (etapa < 2) void continuar();
          else
            void form.handleSubmit(gravar, (errors) => {
              const n = grupos.findIndex((g) => g.some((k) => errors[k]));
              if (n >= 0 && n !== etapa) mudar(n);
              focarErro();
            })(e);
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <OnboardingNavigationDots current={etapa} count={3} />
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {rascunhoSalvo
              ? 'Rascunho recuperado nesta aba'
              : 'Você pode revisar antes de concluir'}
          </p>
        </div>
        <Card className="overflow-hidden">
          <div className="h-1.5 bg-muted" aria-hidden="true">
            <div
              className="h-full bg-primary transition-[width] motion-reduce:transition-none"
              style={{ width: `${((etapa + 1) / 3) * 100}%` }}
            />
          </div>
          <CardHeader className="space-y-4 p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-primary">
                <Icone aria-hidden="true" className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-primary">
                {['Sobre você', 'Seu mapa', 'Conferir e entrar'][etapa]}
              </p>
            </div>
            <CardTitle
              as="h2"
              ref={titulo}
              tabIndex={-1}
              className="text-2xl font-display outline-none sm:text-3xl"
            >
              {atual.title}
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {atual.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-5 sm:px-7">
            {etapa === 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(['first_name', 'last_name'] as const).map((name) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {name === 'first_name' ? 'Nome' : 'Sobrenome'}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              maxLength={120}
                              autoComplete={
                                name === 'first_name'
                                  ? 'given-name'
                                  : 'family-name'
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Como Você Gostaria de Ser Chamado{' '}
                        <span className="font-normal text-muted-foreground">
                          (opcional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          autoComplete="nickname"
                          maxLength={80}
                        />
                      </FormControl>
                      <FormDescription>
                        Um nome que a Lyra pode usar ao conversar com você.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birth_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de nascimento</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          autoComplete="bday"
                          placeholder="DD/MM/AAAA"
                        />
                      </FormControl>
                      <FormDescription>
                        Usada para calcular sua idade e personalizar o cuidado.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <details className="rounded-md border border-border p-4">
                  <summary className="cursor-pointer text-sm font-medium text-primary">
                    Outras preferências (opcional)
                  </summary>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gênero (opcional)</FormLabel>
                          <Select
                            value={field.value ?? 'depois'}
                            onValueChange={(value) =>
                              field.onChange(
                                value === 'depois' ? undefined : value
                              )
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="depois">
                                Definir depois
                              </SelectItem>
                              <SelectItem value="male">Masculino</SelectItem>
                              <SelectItem value="female">Feminino</SelectItem>
                              <SelectItem value="other">Outro</SelectItem>
                              <SelectItem value="prefer_not-to-say">
                                Prefiro não dizer
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="activity_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Atividade física (opcional)</FormLabel>
                          <Select
                            value={
                              field.value === undefined
                                ? 'depois'
                                : String(field.value)
                            }
                            onValueChange={(value) =>
                              field.onChange(
                                value === 'depois' ? undefined : Number(value)
                              )
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="depois">
                                Definir depois
                              </SelectItem>
                              {[
                                'Sedentário',
                                'Pouco ativo',
                                'Moderadamente ativo',
                                'Ativo',
                                'Muito ativo',
                              ].map((label, i) => (
                                <SelectItem key={label} value={String(i + 1)}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Você também pode ajustar estas preferências no perfil.
                  </p>
                </details>
              </>
            )}
            {etapa === 1 && (
              <>
                <FormField
                  control={form.control}
                  name="birth_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade de nascimento</FormLabel>
                      <FormControl>
                        <SeletorDeCidade
                          valor={field.value}
                          aoEscolher={field.onChange}
                          textoVazio="Buscar cidade de nascimento"
                        />
                      </FormControl>
                      <FormDescription>
                        Escolha a cidade na lista. O fuso e as coordenadas são
                        encontrados para você.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birth_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de nascimento (opcional)</FormLabel>
                      <FormControl>
                        <TimeInput {...field} placeholder="HH:MM" />
                      </FormControl>
                      <FormDescription>
                        O horário ajuda a detalhar o mapa. Se não souber, você
                        pode definir depois no perfil.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="residence_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Onde você mora hoje (opcional)</FormLabel>
                      <FormControl>
                        <SeletorDeCidade
                          valor={field.value}
                          aoEscolher={field.onChange}
                          textoVazio="Definir depois"
                          permitirLimpar
                        />
                      </FormControl>
                      <FormDescription>
                        Ajuda a calcular o nascer do sol e os horários do seu
                        dia.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {etapa === 2 && (
              <>
                <dl className="grid gap-4 rounded-lg border border-border bg-background p-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Seu nome</dt>
                    <dd className="mt-1 break-words font-medium">
                      {v.first_name} {v.last_name}
                    </dd>
                  </div>
                  {v.nickname && (
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Como prefere ser chamado
                      </dt>
                      <dd className="mt-1 break-words font-medium">
                        {v.nickname}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Nascimento
                    </dt>
                    <dd className="mt-1 font-medium">
                      {v.birth_date ? format(v.birth_date, 'dd/MM/yyyy') : ''}
                      {v.birth_time ? ` · ${v.birth_time}` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Cidade de nascimento
                    </dt>
                    <dd className="mt-1 break-words font-medium">
                      {v.birth_city?.rotulo}
                    </dd>
                  </div>
                </dl>
                <FormField
                  control={form.control}
                  name="consent"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3 rounded-lg border border-border p-4">
                      <FormControl>
                        <Checkbox
                          ref={field.ref}
                          onBlur={field.onBlur}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-required="true"
                        />
                      </FormControl>
                      <div className="min-w-0 space-y-2">
                        <FormLabel className="cursor-pointer leading-relaxed">
                          Autorizo a Lyra a tratar meus dados de saúde e
                          bem-estar para calcular indicadores e gerar
                          orientações personalizadas.
                        </FormLabel>
                        <FormDescription>
                          Você pode baixar seus dados ou excluir sua conta no
                          perfil. Leia a{' '}
                          <Link
                            href={ROTA_POLITICA_DE_PRIVACIDADE}
                            target="_blank"
                            className="font-medium text-primary underline underline-offset-2"
                          >
                            política de privacidade
                            <span className="sr-only"> (abre em nova aba)</span>
                          </Link>
                          .
                        </FormDescription>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </>
            )}
            {falhaEnvio && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 p-4 text-sm text-destructive"
              >
                {concluido ? 'Seu perfil foi salvo. ' : ''}
                {falhaEnvio}{' '}
                {concluido
                  ? 'Tente abrir o app novamente.'
                  : 'Suas respostas continuam no formulário para tentar de novo.'}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-5 sm:px-7">
            <Button
              type="button"
              variant="ghost"
              disabled={etapa === 0 || enviando}
              onClick={() => window.history.back()}
            >
              <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando
                ? 'Salvando…'
                : etapa === 2
                  ? concluido
                    ? 'Abrir meu espaço'
                    : 'Entrar no app'
                  : 'Continuar'}
              {etapa === 2 ? (
                <Check aria-hidden="true" className="ml-2 h-4 w-4" />
              ) : (
                <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
              )}
            </Button>
          </CardFooter>
        </Card>
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Você pode revisar suas informações depois no perfil.
        </p>
      </form>
    </Form>
  );
}
