'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { somarDias } from '@/lib/acontecimentos/analise';
import { ATIVIDADES } from '@/lib/lembretes/esquema';
import {
  periodoSchema,
  type CentralDoDescanso,
  type DadosDoPeriodo,
} from '@/lib/descanso/esquema';
import { dataBreve } from '@/components/acontecimentos/GraficoDosAcontecimentos';
export function EditorDoDescanso({
  central: o,
  editar,
  ocupada,
  salvar,
}: {
  central: CentralDoDescanso;
  editar: boolean;
  ocupada: boolean;
  salvar: (p: DadosDoPeriodo) => Promise<void>;
}) {
  const atual = editar ? o.atual : null,
    hoje = atual?.hoje ?? o.hoje,
    travarInicio = atual?.estado === 'ativa';
  const [p, setP] = useState<DadosDoPeriodo>(() => ({
      inicio: atual?.inicio ?? hoje,
      fim: atual?.fim ?? null,
      retornoDias: atual?.retornoDias ?? 0,
      atividade: atual?.atividade ?? null,
      metas: atual
        ? o.vinculos
            .filter((v) => v.periodoId === atual.id)
            .map((v) => v.metaId)
        : [],
    })),
    [erro, setErro] = useState('');
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        const r = periodoSchema.safeParse(p);
        if (!r.success) {
          setErro(r.error.issues[0].message);
          return;
        }
        setErro('');
        void salvar(r.data).catch((e) =>
          setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
        );
      }}
    >
      <fieldset disabled={ocupada} className="min-w-0">
        <legend className="sr-only">Período, metas e retorno</legend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="inicio-descanso">
              Início do descanso
            </FieldLabel>
            <Input
              id="inicio-descanso"
              type="date"
              min={hoje}
              max={somarDias(hoje, 365)}
              value={p.inicio}
              required
              disabled={travarInicio}
              onChange={(e) => setP({ ...p, inicio: e.target.value })}
            />
          </Field>
          <Field orientation="horizontal">
            <Checkbox
              className="size-6 after:-inset-1"
              id="fim-programado-descanso"
              checked={p.fim !== null}
              onCheckedChange={(v) =>
                setP({ ...p, fim: v === true ? somarDias(p.inicio, 6) : null })
              }
            />
            <FieldLabel htmlFor="fim-programado-descanso">
              Definir o último dia da pausa
            </FieldLabel>
          </Field>
          {p.fim !== null && (
            <Field>
              <FieldLabel htmlFor="fim-descanso">
                Último dia do descanso
              </FieldLabel>
              <Input
                id="fim-descanso"
                type="date"
                min={p.inicio > hoje ? p.inicio : hoje}
                max={somarDias(p.inicio, 365)}
                value={p.fim}
                required
                onChange={(e) => setP({ ...p, fim: e.target.value })}
              />
            </Field>
          )}
          <p className="text-sm text-muted-foreground">
            Fuso preservado: {atual?.fuso ?? o.fuso}.{' '}
            {p.fim === null
              ? 'A pausa fica ativa até você encerrá-la.'
              : 'O período programado termina ao final do último dia local.'}{' '}
            Os dias civis tocados pelo descanso ficam identificados, sem contar
            como dias cumpridos.
          </p>
          <Field>
            <FieldLabel htmlFor="dias-retorno">Como deseja retomar?</FieldLabel>
            <Select
              value={String(p.retornoDias)}
              onValueChange={(v) =>
                setP({
                  ...p,
                  retornoDias: Number(v) as DadosDoPeriodo['retornoDias'],
                  atividade: v === '0' ? null : p.atividade,
                })
              }
            >
              <SelectTrigger id="dias-retorno" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="0">
                    Retomar o ritmo habitual ao encerrar
                  </SelectItem>
                  <SelectItem value="3">Retorno gradual por 3 dias</SelectItem>
                  <SelectItem value="7">Retorno gradual por 7 dias</SelectItem>
                  <SelectItem value="14">
                    Retorno gradual por 14 dias
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          {p.retornoDias > 0 && (
            <>
              <Field>
                <FieldLabel htmlFor="atividade-retorno">
                  Um convite por dia, se desejar
                </FieldLabel>
                <Select
                  value={p.atividade ?? 'nenhuma'}
                  onValueChange={(v) =>
                    setP({
                      ...p,
                      atividade:
                        v === 'nenhuma'
                          ? null
                          : (v as DadosDoPeriodo['atividade']),
                    })
                  }
                >
                  <SelectTrigger id="atividade-retorno" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="nenhuma">
                        Retorno sem lembretes
                      </SelectItem>
                      {o.atividades.map((a) => (
                        <SelectItem key={a} value={a}>
                          {ATIVIDADES[a].nome}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <p className="text-sm text-muted-foreground">
                No retorno gradual, as sequências continuam com dias neutros e
                os prazos selecionados continuam sendo adaptados. No máximo um
                lembrete diário da atividade escolhida, usando seus horários
                existentes e respeitando o silêncio. Não criamos um lembrete
                automaticamente.
              </p>
            </>
          )}
          <fieldset
            className="flex min-w-0 flex-col gap-3"
            disabled={travarInicio}
          >
            <legend className="mb-3 font-medium">
              Adaptar prazos de metas escolhidas
            </legend>
            <p className="mb-3 text-sm text-muted-foreground">
              Cada dia neutro acrescenta um dia ao prazo efetivo. O prazo
              original e os alvos ficam preservados. Se você mudar o prazo
              original fora desta pausa, a adaptação deixa de ser aplicada.
              Depois de começar, a seleção fica preservada.
            </p>
            {o.metas.map((m) => (
              <Field key={m.id} orientation="horizontal">
                <Checkbox
                  className="size-6 after:-inset-1"
                  id={'descanso-meta-' + m.id}
                  checked={p.metas.includes(m.id)}
                  disabled={!p.metas.includes(m.id) && m.prazo < p.inicio}
                  onCheckedChange={(v) =>
                    setP({
                      ...p,
                      metas:
                        v === true
                          ? [...p.metas, m.id]
                          : p.metas.filter((id) => id !== m.id),
                    })
                  }
                />
                <FieldLabel htmlFor={'descanso-meta-' + m.id}>
                  {m.titulo} · prazo atual {dataBreve(m.prazo)}
                </FieldLabel>
              </Field>
            ))}
            {o.metas.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Não há metas autorizadas em andamento com prazo disponível. Você
                pode descansar sem vincular uma meta.
              </p>
            )}
            {p.metas
              .filter((id) => !o.metas.some((m) => m.id === id))
              .map((id) => (
                <p key={id} className="text-sm text-muted-foreground">
                  Vínculo já preservado com uma meta que não está disponível
                  para nova seleção.
                </p>
              ))}
          </fieldset>
        </FieldGroup>
      </fieldset>
      <p className="text-sm text-muted-foreground">
        Os convites do coach e os lembretes pessoais ficam pausados. Pendências
        são dispensadas e não voltam em lote. Consultas e avisos comerciais
        continuam disponíveis. Registros, hábitos, medições e assinatura não são
        apagados ou alterados pela pausa.
      </p>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      <Button type="submit" disabled={ocupada}>
        {ocupada
          ? 'Salvando…'
          : editar
            ? 'Salvar período'
            : 'Confirmar descanso'}
      </Button>
    </form>
  );
}
