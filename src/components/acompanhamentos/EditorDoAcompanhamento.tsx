'use client';
import { useId, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FREQUENCIAS,
  MODELOS_DE_ESCALA,
  acompanhamentoSchema,
  edicaoSchema,
  escalaNormalizada,
  mesmaEscala,
  pontosDaEscala,
  type Acompanhamento,
  type Escala,
  type Frequencia,
} from '@/lib/acompanhamentos/esquema';
import { requisitar } from '@/components/experiencias/transporte';
import { EscalaDeResposta } from './EscalaDeResposta';

type Rascunho = {
  nome: string;
  descricao: string;
  frequencia: Frequencia;
  minimo: 0 | 1;
  maximo: number;
  rotulos: Record<number, string>;
};
function rascunhoDe(
  e: Escala
): Pick<Rascunho, 'minimo' | 'maximo' | 'rotulos'> {
  return {
    minimo: e.minimo,
    maximo: e.maximo,
    rotulos: Object.fromEntries(e.rotulos.map((r) => [r.valor, r.rotulo])),
  };
}
function escalaDo(r: Rascunho): Escala {
  return {
    minimo: r.minimo,
    maximo: r.maximo,
    rotulos: pontosDaEscala({ minimo: r.minimo, maximo: r.maximo, rotulos: [] })
      .map((valor) => ({ valor, rotulo: (r.rotulos[valor] ?? '').trim() }))
      .filter((x) => x.rotulo.length > 0),
  };
}
/**
 * O Radix Select, dentro de um formulário, sincroniza um `<select>` nativo
 * oculto. Quando mínimo e máximo mudam juntos (troca de modelo), o novo valor
 * pode chegar antes da opção correspondente; o `<select>` nativo fica vazio e
 * dispara `onValueChange('')`. Valores fora das opções válidas são ignorados
 * para não transformar o vazio em ponto 0.
 */
function pontoValido(v: string, minimo: number, maximo: number) {
  if (!/^\d{1,2}$/.test(v)) return false;
  const n = Number(v);
  return n >= minimo && n <= maximo;
}
function modeloDe(e: Escala) {
  return MODELOS_DE_ESCALA.find((m) => mesmaEscala(m.escala, e))?.id ?? 'livre';
}

/**
 * Cria ou edita um acompanhamento. Mudar escala ou frequência de um
 * acompanhamento existente cria nova definição no servidor; as respostas
 * anteriores mantêm a escala com que foram dadas.
 */
export function EditorDoAcompanhamento({
  atual,
  ocupada,
  ocupar,
  concluido,
}: {
  atual: Acompanhamento | null;
  ocupada: boolean;
  ocupar: (v: boolean) => void;
  concluido: (id: string) => void;
}) {
  const ids = useId(),
    [pedidoId] = useState(() => crypto.randomUUID()),
    [r, setR] = useState<Rascunho>(() => ({
      nome: atual?.nome ?? '',
      descricao: atual?.descricao ?? '',
      frequencia: atual?.definicao.frequencia ?? 'diaria',
      ...rascunhoDe(atual?.definicao.escala ?? MODELOS_DE_ESCALA[0].escala),
    })),
    [erro, setErro] = useState(''),
    escala = escalaDo(r),
    modelo = modeloDe(escala),
    mudaDefinicao = Boolean(
      atual &&
      (atual.definicao.frequencia !== r.frequencia ||
        !mesmaEscala(atual.definicao.escala, escala))
    );
  const aplicarModelo = (id: string) => {
    const m = MODELOS_DE_ESCALA.find((x) => x.id === id);
    if (m) setR((atual) => ({ ...atual, ...rascunhoDe(m.escala) }));
  };
  const enviar = async () => {
    const corpo = {
        nome: r.nome,
        descricao: r.descricao,
        frequencia: r.frequencia,
        escala: escalaNormalizada(escala),
      },
      v = atual
        ? edicaoSchema.safeParse({ ...corpo, versao: atual.versao })
        : acompanhamentoSchema.safeParse({ ...corpo, pedidoId });
    if (!v.success) {
      setErro(v.error.issues[0].message);
      return;
    }
    ocupar(true);
    setErro('');
    try {
      if (atual) {
        await requisitar(`/api/acompanhamentos/${atual.id}`, 'PATCH', v.data);
        concluido(atual.id);
      } else {
        const res = await requisitar<{ id: string }>(
          '/api/acompanhamentos',
          'POST',
          v.data
        );
        concluido(res.id);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      ocupar(false);
    }
  };
  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!ocupada) void enviar();
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${ids}-nome`}>Nome</FieldLabel>
          <Input
            id={`${ids}-nome`}
            value={r.nome}
            maxLength={60}
            required
            autoComplete="off"
            disabled={ocupada}
            onChange={(e) => setR({ ...r, nome: e.target.value })}
          />
          <FieldDescription>
            Algo que você queira acompanhar, como concentração ou motivação.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${ids}-descricao`}>
            O que você quer observar? (opcional)
          </FieldLabel>
          <Textarea
            id={`${ids}-descricao`}
            value={r.descricao}
            maxLength={300}
            rows={2}
            disabled={ocupada}
            onChange={(e) => setR({ ...r, descricao: e.target.value })}
          />
          <FieldDescription>
            {r.descricao.length}/300 caracteres
          </FieldDescription>
        </Field>
        <FieldSet>
          <FieldLegend id={`${ids}-frequencia`} variant="label">
            Com que frequência responder?
          </FieldLegend>
          <RadioGroup
            aria-labelledby={`${ids}-frequencia`}
            value={r.frequencia}
            disabled={ocupada}
            onValueChange={(v) => setR({ ...r, frequencia: v as Frequencia })}
            className="grid gap-2 sm:grid-cols-2"
          >
            {(Object.keys(FREQUENCIAS) as Frequencia[]).map((f) => (
              <Label
                key={f}
                htmlFor={`${ids}-freq-${f}`}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/8"
              >
                <RadioGroupItem id={`${ids}-freq-${f}`} value={f} />
                <span className="flex flex-col gap-1">
                  <span className="font-medium">{FREQUENCIAS[f].nome}</span>
                  <span className="text-sm text-muted-foreground">
                    {FREQUENCIAS[f].descricao}
                  </span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        </FieldSet>
        <FieldSet>
          <FieldLegend variant="label">Escala de resposta</FieldLegend>
          <FieldDescription>
            Escolha um modelo pronto ou ajuste os pontos. O menor e o maior
            ponto precisam de um rótulo; os demais podem ficar só com o número.
          </FieldDescription>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor={`${ids}-modelo`}>Modelo</FieldLabel>
              <Select
                value={modelo}
                disabled={ocupada}
                onValueChange={aplicarModelo}
              >
                <SelectTrigger id={`${ids}-modelo`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {MODELOS_DE_ESCALA.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome}
                      </SelectItem>
                    ))}
                    <SelectItem value="livre" disabled={modelo !== 'livre'}>
                      Personalizada
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${ids}-minimo`}>Menor ponto</FieldLabel>
              <Select
                value={String(r.minimo)}
                disabled={ocupada}
                onValueChange={(v) => {
                  if (!pontoValido(v, 0, 1)) return;
                  const minimo = Number(v) as 0 | 1;
                  setR((atual) => ({
                    ...atual,
                    minimo,
                    maximo: Math.max(atual.maximo, minimo + 1),
                  }));
                }}
              >
                <SelectTrigger id={`${ids}-minimo`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${ids}-maximo`}>Maior ponto</FieldLabel>
              <Select
                value={String(r.maximo)}
                disabled={ocupada}
                onValueChange={(v) => {
                  if (!pontoValido(v, r.minimo + 1, 10)) return;
                  setR((atual) => ({ ...atual, maximo: Number(v) }));
                }}
              >
                <SelectTrigger id={`${ids}-maximo`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Array.from({ length: 10 - r.minimo }, (_, i) =>
                      String(r.minimo + 1 + i)
                    ).map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pontosDaEscala(escala).map((v) => {
              const extremo = v === r.minimo || v === r.maximo;
              return (
                <Field key={v}>
                  <FieldLabel htmlFor={`${ids}-rotulo-${v}`}>
                    Rótulo do ponto {v}
                    {extremo ? ' (obrigatório)' : ' (opcional)'}
                  </FieldLabel>
                  <Input
                    id={`${ids}-rotulo-${v}`}
                    value={r.rotulos[v] ?? ''}
                    maxLength={40}
                    required={extremo}
                    disabled={ocupada}
                    autoComplete="off"
                    onChange={(e) =>
                      setR({
                        ...r,
                        rotulos: { ...r.rotulos, [v]: e.target.value },
                      })
                    }
                  />
                </Field>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-4">
            <p id={`${ids}-previa`} className="text-sm font-medium">
              Prévia de como você vai responder
            </p>
            <EscalaDeResposta
              escala={escala}
              valor={null}
              rotuloId={`${ids}-previa`}
              previa
            />
          </div>
        </FieldSet>
      </FieldGroup>
      {mudaDefinicao && (
        <Alert>
          <AlertTitle>A escala ou a frequência vai mudar</AlertTitle>
          <AlertDescription>
            As respostas anteriores continuam com a escala em que foram dadas,
            sem conversão de valores. As novas respostas usarão esta definição.
          </AlertDescription>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">
        Suas respostas são relatos pessoais, não medições clínicas.
      </p>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      <Button type="submit" disabled={ocupada}>
        {ocupada
          ? 'Salvando…'
          : atual
            ? 'Salvar alterações'
            : 'Criar acompanhamento'}
      </Button>
    </form>
  );
}
