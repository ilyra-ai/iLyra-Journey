'use client';
import { useAccountSubscription } from '@/hooks/use-account-subscription';
import { isPlanFeatureEnabled } from '@/lib/plans/access';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { apelidoSchema } from '@/lib/perfil/apelido';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { TrendingUp, Calendar, Clock, LogOut } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartFigure,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { resumoDoGrafico } from '@/lib/graficos/resumo';
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DatePicker } from '@/components/ui/date-picker';
import { differenceInYears, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TimeInput } from '@/components/ui/time-input';
import { AvatarUploader } from './AvatarUploader';
import { HabitList } from './HabitList';
import { GradeDeCartoesDoPerfil } from './GradeDeCartoesDoPerfil';
import { DailyMetric } from '@/hooks/use-daily-metrics';
import { db as databaseClient } from '@/integrations/mysql/client';
import { AccountSubscriptionCard } from '@/components/subscription/AccountSubscriptionCard';
import { MenstrualCycleSettings } from './MenstrualCycleSettings';
import { AccountEmailCard } from './AccountEmailCard';
import { ChavesDeAcessoCard } from './ChavesDeAcessoCard';
import { PrivacyDataCard } from './PrivacyDataCard';
import { PurchaseHistoryCard } from './PurchaseHistoryCard';
import { LocaisDoPerfil } from './LocaisDoPerfil';
import { avisarMapaAtualizado } from '@/lib/astrology/evento-do-mapa';
import { EscolhaDaHora } from '@/components/profile/EscolhaDaHora';
import type { CidadeEscolhida } from '@/components/geo/SeletorDeCidade';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  IDS_DE_METAS,
  METAS_DO_PERFIL,
  NIVEL_DE_ATIVIDADE,
} from '@/components/onboarding/opcoes-de-perfil';
import { paginaSaindo } from '@/lib/navegador/saida-da-pagina';

// --- Data Definitions ---
// --- Zod Schema ---
export const profileSchema = z.object({
  first_name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  last_name: z.string().min(2, 'O sobrenome deve ter pelo menos 2 caracteres.'),
  nickname: apelidoSchema.optional(),

  birth_date: z.date().optional().nullable(),
  birth_time: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (val === '' || val === undefined) return true;
      return /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(val);
    }, 'Formato de hora inválido (HH:MM).'),

  age: z.coerce
    // Com coerção, um campo vazio vira NaN e cai no erro de tipo numérico.
    .number<number | string>({ error: 'Idade é obrigatória.' })
    .min(13, 'Você deve ter pelo menos 13 anos.')
    .max(120, 'Idade inválida.'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not-to-say'], {
    error: (issue) =>
      issue.input === undefined ? 'Por favor, selecione um gênero.' : undefined,
  }),
  // Campos do onboarding que antes não podiam ser revistos no perfil.
  activity_level: z
    .number()
    .int()
    .min(NIVEL_DE_ATIVIDADE.minimo)
    .max(NIVEL_DE_ATIVIDADE.maximo)
    .nullable()
    .optional(),
  goals: z
    .array(
      z
        .string()
        .refine((meta) => IDS_DE_METAS.includes(meta), 'Meta desconhecida.')
    )
    .optional(),
});

export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileValues = z.output<typeof profileSchema>;

/**
 * O MySQL devolve TIME como HH:MM:SS, e o campo (e a validação) do perfil
 * usam HH:MM. Sem esta conversão, quem informou a hora no onboarding via
 * "06:45:00" no campo e não conseguia salvar mais nada no perfil (a
 * validação recusava a hora em silêncio).
 */
export function horaParaCampo(valor: string | null | undefined): string {
  if (!valor) {
    return '';
  }
  const hhmm = /^(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(valor);
  return hhmm ? hhmm[1] : valor;
}

export function buildProfileUpdatePayload(data: ProfileValues) {
  const formattedBirthDate = data.birth_date
    ? format(data.birth_date, 'yyyy-MM-dd')
    : null;
  const formattedBirthTime = data.birth_time === '' ? null : data.birth_time;

  // O local de nascimento não vai neste payload: muda pela rota de
  // localização (LocaisDoPerfil), com coordenadas e fuso.
  return {
    ...data,
    nickname: data.nickname?.trim() || null,
    birth_date: formattedBirthDate,
    birth_time: formattedBirthTime,
    activity_level: data.activity_level ?? null,
    // Mesma regra do onboarding: nenhuma meta escolhida é gravada como nulo.
    goals: data.goals && data.goals.length > 0 ? data.goals : null,
  };
}

// --- Progress Chart Component ---
const chartConfig = {
  weight: {
    label: 'Peso (kg)',
    color: 'hsl(var(--primary))',
  },
};

function ProgressChart({
  userId,
  db,
}: {
  userId: string;
  db: typeof databaseClient;
}) {
  const [data, setData] = React.useState<
    { date: string; dia: string; weight: number }[]
  >([]);
  const [loading, setLoading] = React.useState(true);
  // Falha de leitura é diferente de "sem dados" (tarefa 57).
  const [falhou, setFalhou] = React.useState(false);

  // Carrega o peso dos últimos 6 meses (o estado inicial já é "carregando").
  React.useEffect(() => {
    let active = true;

    const fetchWeightData = async () => {
      const sixMonthsAgo = format(
        new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        'yyyy-MM-dd'
      );

      const { data: metrics, error } = await db
        .from('daily_metrics')
        .select('date, weight_kg')
        .eq('user_id', userId)
        .gte('date', sixMonthsAgo)
        .not('weight_kg', 'is', null)
        .order('date', { ascending: true });

      // Página saindo: o navegador cancelou a busca (não é falha).
      if (!active || paginaSaindo()) return;

      if (error) {
        console.error('Erro ao carregar o histórico de peso:', error);
        setData([]);
        setFalhou(true);
      } else {
        // Dia e mês no eixo (antes só o mês, repetido em vários pontos).
        const chartData = (metrics as Pick<DailyMetric, 'date' | 'weight_kg'>[])
          .filter((m) => m.weight_kg !== null)
          .map((m) => ({
            date: m.date,
            dia: format(parseISO(m.date), 'dd/MM', { locale: ptBR }),
            weight: m.weight_kg as number,
          }));
        setData(chartData);
        setFalhou(false);
      }
      setLoading(false);
    };

    void fetchWeightData();

    return () => {
      active = false;
    };
  }, [userId, db]);

  if (loading) {
    return <Skeleton className="h-[250px] w-full rounded-xl" />;
  }

  if (data.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Progresso Longitudinal</CardTitle>
          <TrendingUp
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
        </CardHeader>
        <CardContent>
          {falhou ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/20 bg-destructive-light p-4 text-sm text-destructive"
            >
              Não foi possível carregar o histórico de peso agora. Recarregue a
              página para tentar de novo.
            </p>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-background p-6 text-center">
              <p className="text-muted-foreground">
                Nenhum dado de peso encontrado nos últimos 6 meses.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Registre seu peso para visualizar o progresso.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Progresso Longitudinal (Peso)</CardTitle>
        <TrendingUp
          className="h-5 w-5 text-muted-foreground"
          aria-hidden="true"
        />
      </CardHeader>
      <CardContent>
        <ChartFigure
          resumo={resumoDoGrafico('Peso nos últimos 6 meses', [
            {
              nome: 'Peso',
              valores: data.map((ponto) => ponto.weight),
              unidade: 'kg',
            },
          ])}
        >
          <ChartContainer
            config={chartConfig}
            className="min-h-[200px] w-full border-0 p-0"
          >
            <LineChart
              data={data}
              margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="dia"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <YAxis
                domain={['dataMin - 5', 'dataMax + 5']}
                axisLine={false}
                tickLine={false}
                width={56}
                unit=" kg"
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                dataKey="weight"
                type="monotone"
                stroke="var(--color-weight)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
              />
            </LineChart>
          </ChartContainer>
        </ChartFigure>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Exibindo dados de peso dos últimos 6 meses.
        </p>
      </CardContent>
    </Card>
  );
}

// --- Main Component ---
export function ProfileForm() {
  const { data: subscription } = useAccountSubscription();
  const { db, session } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [locais, setLocais] = React.useState<{
    nascimento: CidadeEscolhida | null;
    moradia: CidadeEscolhida | null;
    localAntigo: string | null;
  }>({ nascimento: null, moradia: null, localAntigo: null });

  const form = useForm<ProfileInput, unknown, ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      nickname: '',
      age: '',
      gender: 'prefer_not-to-say',
      birth_date: null,
      birth_time: '',
      activity_level: NIVEL_DE_ATIVIDADE.padrao,
      goals: [],
    },
    mode: 'onChange',
  });

  // useWatch assina apenas este campo e é compatível com o React Compiler
  // (form.watch() retorna funções que não podem ser memoizadas com segurança).
  const birthDateWatch = useWatch({
    control: form.control,
    name: 'birth_date',
  });
  const genderWatch = useWatch({ control: form.control, name: 'gender' });

  React.useEffect(() => {
    if (birthDateWatch) {
      const calculatedAge = differenceInYears(new Date(), birthDateWatch);
      form.setValue('age', calculatedAge, { shouldValidate: true });
    }
  }, [birthDateWatch, form]);

  const profileUserId = session?.user?.id ?? null;

  // Carrega o perfil do usuário (o estado inicial já é "carregando").
  React.useEffect(() => {
    if (!profileUserId) return;
    let active = true;

    const fetchProfile = async () => {
      const { data, error } = await db
        .from('profiles')
        .select(
          'first_name, last_name, nickname, age, gender, birth_date, birth_time, birth_location, birth_city_id, residence_location, residence_city_id, avatar_url, activity_level, goals'
        )
        .eq('id', profileUserId)
        .maybeSingle();

      if (!active) return;

      if (error) {
        toast.error('Erro ao carregar perfil.', { description: error.message });
      } else if (data) {
        const parsedBirthDate = data.birth_date
          ? parseISO(data.birth_date)
          : null;
        const validBirthDate =
          parsedBirthDate && !isNaN(parsedBirthDate.getTime())
            ? parsedBirthDate
            : undefined;

        setAvatarUrl(data.avatar_url);
        setLocais({
          nascimento:
            data.birth_city_id && data.birth_location
              ? { id: data.birth_city_id, rotulo: data.birth_location }
              : null,
          moradia:
            data.residence_city_id && data.residence_location
              ? { id: data.residence_city_id, rotulo: data.residence_location }
              : null,
          localAntigo: data.birth_city_id ? null : data.birth_location,
        });

        form.reset({
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          nickname: data.nickname ?? '',
          // Sem idade gravada, a idade vem da data de nascimento; sem as
          // duas, o campo fica vazio (antes, 18 inventado era gravado).
          age:
            data.age ??
            (validBirthDate
              ? differenceInYears(new Date(), validBirthDate)
              : ''),
          gender:
            (data.gender as ProfileValues['gender']) ?? 'prefer_not-to-say',
          birth_date: validBirthDate,
          birth_time: horaParaCampo(data.birth_time),
          activity_level: data.activity_level ?? NIVEL_DE_ATIVIDADE.padrao,
          // Metas gravadas que não existem mais na lista são descartadas
          // para não travar a validação do formulário.
          goals: (data.goals ?? []).filter((meta) =>
            IDS_DE_METAS.includes(meta)
          ),
        });
      }
      setIsLoading(false);
    };

    void fetchProfile();

    return () => {
      active = false;
    };
  }, [profileUserId, db, form]);

  const onSubmit = async (data: ProfileValues) => {
    if (!session?.user) return;
    const { goals, ...perfil } = buildProfileUpdatePayload(data);

    const { error } = await db
      .from('profiles')
      .update({
        ...perfil,
        ...(subscription?.gruposFuncionais?.metas_habitos_plano
          ? { goals }
          : {}),
      })
      .eq('id', session.user.id);

    if (error) {
      toast.error('Ocorreu um erro ao atualizar o perfil.', {
        description: error.message,
      });
    } else {
      toast.success('Perfil atualizado com sucesso!');
      // Data e hora de nascimento mudam o mapa natal.
      avisarMapaAtualizado();
    }
  };

  const handleSignOut = async () => {
    const { error } = await db.auth.signOut();
    if (error) {
      toast.error('Não foi possível sair agora.', {
        description: error.message,
      });
      return;
    }
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <div className="min-w-0 space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const firstName = form.getValues('first_name') || 'Usuário';

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <nav aria-label="Seções do perfil" className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="min-h-11">
          <a href="#perfil-pessoal">Dados e rotina</a>
        </Button>
        <Button asChild variant="outline" className="min-h-11">
          <a href="#perfil-conta">Conta e privacidade</a>
        </Button>
        {isPlanFeatureEnabled(subscription, 'vedic_insights') ? (
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/">Meu mapa no Painel</Link>
          </Button>
        ) : null}
      </nav>
      <GradeDeCartoesDoPerfil>
        <section
          id="perfil-pessoal"
          aria-label="Dados e rotina"
          className="min-w-0 scroll-mt-24"
        >
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, () =>
                // Sem este aviso, um campo inválido fora da tela (no celular)
                // fazia o botão "Salvar" parecer não funcionar.
                toast.error('Revise os campos destacados antes de salvar.')
              )}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Dados Pessoais e Cronobiologia</CardTitle>
                  <CardDescription>
                    Informações essenciais para a análise de IA.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Seu nome"
                            autoComplete="given-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sobrenome</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Seu sobrenome"
                            autoComplete="family-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FieldGroup className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="nickname"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={Boolean(fieldState.error)}>
                          <FieldLabel htmlFor="profile-nickname">
                            Como Você Gostaria de Ser Chamado
                          </FieldLabel>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            id="profile-nickname"
                            autoComplete="nickname"
                            maxLength={80}
                            aria-invalid={Boolean(fieldState.error)}
                            aria-describedby="profile-nickname-description profile-nickname-error"
                          />
                          <FieldDescription id="profile-nickname-description">
                            Opcional. Se não quiser ser chamado de xuxu, peça à
                            Lyra para usar este nome. Para removê-lo, deixe
                            vazio e salve.
                          </FieldDescription>
                          <FieldError
                            id="profile-nickname-error"
                            errors={[fieldState.error]}
                          />
                        </Field>
                      )}
                    />
                  </FieldGroup>
                  <FormField
                    control={form.control}
                    name="birth_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="mb-2">
                          <Calendar
                            className="mr-1 inline-block h-4 w-4 align-text-bottom text-muted-foreground"
                            aria-hidden="true"
                          />{' '}
                          Data de Nascimento
                        </FormLabel>
                        <FormControl>
                          {/* Sem `id` próprio: o FormControl injeta o id do
                            rótulo e o `aria-describedby` (tarefa 61). */}
                          <DatePicker
                            value={field.value || undefined}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            placeholder="DD/MM/AAAA"
                            autoComplete="bday"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Idade (Calculada)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Idade"
                            {...field}
                            disabled={!!birthDateWatch}
                            className={cn(
                              !!birthDateWatch &&
                                'cursor-not-allowed border-border bg-muted'
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gênero</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                    name="birth_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Clock
                            className="mr-1 inline-block h-4 w-4 align-text-bottom text-muted-foreground"
                            aria-hidden="true"
                          />{' '}
                          Hora Exata (HH:MM)
                        </FormLabel>
                        <FormControl>
                          <TimeInput placeholder="Ex.: 14:35" {...field} />
                        </FormControl>
                        <FormDescription>
                          Define o ascendente (Lagna) e as casas do mapa védico.
                        </FormDescription>
                        <FormMessage />
                        <EscolhaDaHora
                          horaNoFormulario={field.value ?? ''}
                          aoGravar={(hora) =>
                            form.setValue('birth_time', hora ?? '', {
                              shouldDirty: false,
                              shouldValidate: true,
                            })
                          }
                        />
                      </FormItem>
                    )}
                  />
                  {/* Remonta quando o perfil carrega para receber os valores. */}
                  <LocaisDoPerfil
                    key={`${locais.nascimento?.id ?? 'sem'}-${locais.moradia?.id ?? 'sem'}`}
                    nascimentoInicial={locais.nascimento}
                    moradiaInicial={locais.moradia}
                    localAntigo={locais.localAntigo}
                  />
                  <FormField
                    control={form.control}
                    name="activity_level"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>
                          Nível de atividade:{' '}
                          <span className="text-primary">
                            {field.value ?? NIVEL_DE_ATIVIDADE.padrao}
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Slider
                            aria-label={`Nível de atividade, de ${NIVEL_DE_ATIVIDADE.minimo} (sedentário) a ${NIVEL_DE_ATIVIDADE.maximo} (muito ativo)`}
                            min={NIVEL_DE_ATIVIDADE.minimo}
                            max={NIVEL_DE_ATIVIDADE.maximo}
                            step={1}
                            value={[field.value ?? NIVEL_DE_ATIVIDADE.padrao]}
                            onValueChange={(valores) =>
                              field.onChange(valores[0])
                            }
                            className="py-2"
                          />
                        </FormControl>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{NIVEL_DE_ATIVIDADE.rotuloMinimo}</span>
                          <span>{NIVEL_DE_ATIVIDADE.rotuloMaximo}</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {subscription?.gruposFuncionais?.metas_habitos_plano && (
                    <FormField
                      control={form.control}
                      name="goals"
                      render={() => (
                        <FormItem className="md:col-span-2">
                          <p
                            id="perfil-objetivos-titulo"
                            className="text-sm font-medium leading-none text-foreground"
                          >
                            Objetivos
                          </p>
                          <FormDescription>
                            Os mesmos do onboarding; marque quantos quiser.
                          </FormDescription>
                          <div
                            role="group"
                            aria-labelledby="perfil-objetivos-titulo"
                            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                          >
                            {METAS_DO_PERFIL.map((meta) => {
                              const IconeDaMeta = meta.icon;
                              return (
                                <FormField
                                  key={meta.id}
                                  control={form.control}
                                  name="goals"
                                  render={({ field }) => (
                                    <FormItem className="flex min-w-0 flex-row items-center gap-3 space-y-0 rounded-md border border-border bg-card px-3 transition-colors hover:bg-muted has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                                      <FormControl>
                                        <Checkbox
                                          checked={
                                            field.value?.includes(meta.id) ??
                                            false
                                          }
                                          onCheckedChange={(marcado) =>
                                            field.onChange(
                                              marcado
                                                ? [
                                                    ...(field.value ?? []),
                                                    meta.id,
                                                  ]
                                                : (field.value ?? []).filter(
                                                    (id) => id !== meta.id
                                                  )
                                            )
                                          }
                                        />
                                      </FormControl>
                                      <FormLabel className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-2 text-sm font-medium">
                                        <IconeDaMeta
                                          className="h-4 w-4 shrink-0 text-primary"
                                          aria-hidden
                                        />
                                        <span className="min-w-0">
                                          {meta.label}
                                        </span>
                                      </FormLabel>
                                    </FormItem>
                                  )}
                                />
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="min-h-11 w-full sm:w-auto"
                  >
                    {form.formState.isSubmitting
                      ? 'Salvando...'
                      : 'Salvar Alterações'}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </section>

        <section aria-label="Ações da Conta" className="min-w-0 scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle>Ações da Conta</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <AvatarUploader
                currentAvatarUrl={avatarUrl}
                firstName={firstName}
                onUploadSuccess={setAvatarUrl}
              />
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="min-h-11 w-full"
              >
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Sair do App
              </Button>
            </CardContent>
          </Card>
        </section>
        {isPlanFeatureEnabled(subscription, 'personal_habits') ? (
          <HabitList />
        ) : null}
        {genderWatch === 'female' ? <MenstrualCycleSettings /> : null}
        <AccountSubscriptionCard />
        <section
          id="perfil-conta"
          aria-label="E-mail de login"
          className="min-w-0 scroll-mt-24"
        >
          <AccountEmailCard />
        </section>
        <section
          id="perfil-chaves"
          aria-label="Chaves de acesso"
          className="min-w-0 scroll-mt-24"
        >
          <ChavesDeAcessoCard />
        </section>
        <PrivacyDataCard />
        <PurchaseHistoryCard />
        {session?.user &&
          isPlanFeatureEnabled(subscription, 'metrics_history_days') && (
            <ProgressChart userId={session.user.id} db={db} />
          )}
      </GradeDeCartoesDoPerfil>
    </div>
  );
}
