'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  experienciaSchema,
  type CentralDeExperiencias,
  type DadosDaExperiencia,
} from '@/lib/experiencias/esquema';
import { somarDias } from '@/lib/acontecimentos/analise';
import { dataBreve } from '@/components/acontecimentos/GraficoDosAcontecimentos';
import { requisitar } from './transporte';

export function CriarExperiencia({
  central,
  ocupada,
  ocupar,
  criada,
}: {
  central: CentralDeExperiencias;
  ocupada: boolean;
  ocupar: (v: boolean) => void;
  criada: (id: string) => void;
}) {
  const [p, setP] = useState<DadosDaExperiencia>(() => ({
      pedidoId: crypto.randomUUID(),
      titulo: '',
      objetivo: '',
      mudanca: '',
      inicio: central.hoje,
      dias: 7,
      inicioReferencia:
        central.corte && central.corte > somarDias(central.hoje, -7)
          ? central.corte
          : somarDias(central.hoje, -7),
      fimReferencia: somarDias(central.hoje, -1),
      alinhamentoSono: 1,
      metaId: null,
      habitoId: null,
    })),
    [erro, setErro] = useState('');
  const inicioValido = /^\d{4}-\d{2}-\d{2}$/.test(p.inicio),
    fim =
      inicioValido && Number.isInteger(p.dias) && p.dias >= 3 && p.dias <= 60
        ? somarDias(p.inicio, p.dias - 1)
        : null;
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (ocupada) return;
        const r = experienciaSchema.safeParse(p);
        if (!r.success) {
          setErro(r.error.issues[0].message);
          return;
        }
        ocupar(true);
        setErro('');
        void requisitar<{ id: string }>('/api/experiencias', 'POST', r.data)
          .then((r) => criada(r.id))
          .catch((e) =>
            setErro(
              e instanceof Error ? e.message : 'Não foi possível registrar.'
            )
          )
          .finally(() => ocupar(false));
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="titulo-experiencia">
            Nome da experiência
          </FieldLabel>
          <Input
            id="titulo-experiencia"
            value={p.titulo}
            maxLength={100}
            required
            disabled={ocupada}
            onChange={(e) => setP({ ...p, titulo: e.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="objetivo-experiencia">
            O que você deseja observar?
          </FieldLabel>
          <Textarea
            id="objetivo-experiencia"
            value={p.objetivo}
            maxLength={500}
            required
            disabled={ocupada}
            onChange={(e) => setP({ ...p, objetivo: e.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="mudanca-experiencia">
            Pequena mudança escolhida por você
          </FieldLabel>
          <Textarea
            id="mudanca-experiencia"
            value={p.mudanca}
            maxLength={500}
            required
            disabled={ocupada}
            onChange={(e) => setP({ ...p, mudanca: e.target.value })}
          />
        </Field>
        <div className="grid min-w-0 gap-4 @lg/proposta:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="inicio-experiencia">
              Data em que começou
            </FieldLabel>
            <Input
              id="inicio-experiencia"
              type="date"
              required
              min={somarDias(central.hoje, -29)}
              max={central.hoje}
              value={p.inicio}
              disabled={ocupada}
              onChange={(e) => setP({ ...p, inicio: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="duracao-experiencia">
              Duração prevista (dias)
            </FieldLabel>
            <Input
              id="duracao-experiencia"
              type="number"
              min={3}
              max={60}
              step={1}
              required
              value={p.dias}
              disabled={ocupada}
              onChange={(e) => setP({ ...p, dias: Number(e.target.value) })}
            />
          </Field>
        </div>
        {fim && (
          <p className="text-sm text-muted-foreground">
            Observação: {dataBreve(p.inicio)} a {dataBreve(fim)}. Se já começou,
            os dias anteriores não serão preenchidos automaticamente.
          </p>
        )}
        <div className="grid min-w-0 gap-4 @lg/proposta:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="referencia-inicio">
              Referência: início
            </FieldLabel>
            <Input
              id="referencia-inicio"
              type="date"
              required
              min={central.corte ?? undefined}
              max={inicioValido ? somarDias(p.inicio, -1) : central.hoje}
              value={p.inicioReferencia}
              disabled={ocupada}
              onChange={(e) => setP({ ...p, inicioReferencia: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="referencia-fim">Referência: fim</FieldLabel>
            <Input
              id="referencia-fim"
              type="date"
              required
              min={p.inicioReferencia}
              max={inicioValido ? somarDias(p.inicio, -1) : central.hoje}
              value={p.fimReferencia}
              disabled={ocupada}
              onChange={(e) => setP({ ...p, fimReferencia: e.target.value })}
            />
          </Field>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={ocupada || !inicioValido}
          onClick={() =>
            setP({
              ...p,
              inicioReferencia: somarDias(p.inicio, -7),
              fimReferencia: somarDias(p.inicio, -1),
            })
          }
        >
          Usar os sete dias anteriores como referência
        </Button>
        <Field>
          <FieldLabel htmlFor="sono-experiencia">
            Qual sono relacionar ao dia da mudança?
          </FieldLabel>
          <Select
            value={String(p.alinhamentoSono)}
            disabled={ocupada}
            onValueChange={(v) =>
              setP({ ...p, alinhamentoSono: Number(v) as 0 | 1 })
            }
          >
            <SelectTrigger id="sono-experiencia" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="1">
                  O registrado no dia seguinte (descanso posterior)
                </SelectItem>
                <SelectItem value="0">
                  O registrado no mesmo dia (última noite)
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        {central.metas.length > 0 && (
          <Field>
            <FieldLabel htmlFor="meta-experiencia">
              Relacionar uma meta ativa (opcional)
            </FieldLabel>
            <Select
              value={p.metaId ?? 'nenhuma'}
              disabled={ocupada}
              onValueChange={(v) =>
                setP({ ...p, metaId: v === 'nenhuma' ? null : v })
              }
            >
              <SelectTrigger id="meta-experiencia" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="nenhuma">Sem meta relacionada</SelectItem>
                  {central.metas.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.titulo}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {p.metaId && (
              <Button
                type="button"
                variant="ghost"
                disabled={ocupada}
                onClick={() =>
                  setP({
                    ...p,
                    objetivo: central.metas.find((m) => m.id === p.metaId)!
                      .titulo,
                  })
                }
              >
                Usar o nome da meta como objetivo
              </Button>
            )}
          </Field>
        )}
        {central.habitos.length > 0 && (
          <Field>
            <FieldLabel htmlFor="habito-experiencia">
              Relacionar um hábito ativo (opcional)
            </FieldLabel>
            <Select
              value={p.habitoId ?? 'nenhum'}
              disabled={ocupada}
              onValueChange={(v) =>
                setP({ ...p, habitoId: v === 'nenhum' ? null : v })
              }
            >
              <SelectTrigger id="habito-experiencia" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="nenhum">Sem hábito relacionado</SelectItem>
                  {central.habitos.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.nome}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {p.habitoId && (
              <Button
                type="button"
                variant="ghost"
                disabled={ocupada}
                onClick={() =>
                  setP({
                    ...p,
                    mudanca: central.habitos.find((h) => h.id === p.habitoId)!
                      .nome,
                  })
                }
              >
                Usar o nome do hábito como mudança
              </Button>
            )}
          </Field>
        )}
      </FieldGroup>
      <p className="text-sm text-muted-foreground">
        A revisão usa sono e energia existentes e seus relatos pessoais. A
        proposta e os períodos ficam preservados como foram definidos. O
        acompanhamento não altera metas, hábitos ou minutos registrados. Esta
        experiência pessoal não é ensaio clínico nem orientação para mudar
        tratamento.
      </p>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      <Button type="submit" disabled={ocupada}>
        {ocupada ? 'Registrando…' : 'Iniciar experiência'}
      </Button>
    </form>
  );
}
