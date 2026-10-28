'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  notaSchema,
  type NotaDaExperiencia,
  type DadosDaNota,
} from '@/lib/experiencias/esquema';
import { requisitar } from './transporte';

export function RelatoDoDia({
  id,
  data,
  inicial,
  ocupada,
  ocupar,
  salvo,
}: {
  id: string;
  data: string;
  inicial: NotaDaExperiencia | null;
  ocupada: boolean;
  ocupar: (v: boolean) => void;
  salvo: () => Promise<void>;
}) {
  const [p, setP] = useState<DadosDaNota>(() => ({
      idRelato: inicial?.idRelato ?? crypto.randomUUID(),
      data,
      seguiu: inicial?.seguiu ?? null,
      percepcao: inicial?.percepcao ?? null,
      nota: inicial?.nota ?? '',
      versao: inicial?.versao ?? 0,
    })),
    [erro, setErro] = useState('');
  const excluir = async () => {
    ocupar(true);
    setErro('');
    try {
      await requisitar(`/api/experiencias/${id}/relatos/${data}`, 'DELETE', {
        idRelato: p.idRelato,
        versao: p.versao,
      });
      await salvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir.');
    } finally {
      ocupar(false);
    }
  };
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (ocupada) return;
        const r = notaSchema.safeParse(p);
        if (!r.success) {
          setErro(r.error.issues[0].message);
          return;
        }
        ocupar(true);
        setErro('');
        void requisitar(
          `/api/experiencias/${id}/relatos/${data}`,
          'PUT',
          r.data
        )
          .then(salvo)
          .catch((e) =>
            setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
          )
          .finally(() => ocupar(false));
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="seguiu-mudanca">
            Seguiu a mudança escolhida? (opcional)
          </FieldLabel>
          <Select
            value={p.seguiu ?? 'desconhecido'}
            disabled={ocupada}
            onValueChange={(v) =>
              setP({
                ...p,
                seguiu:
                  v === 'desconhecido' ? null : (v as DadosDaNota['seguiu']),
              })
            }
          >
            <SelectTrigger id="seguiu-mudanca" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="desconhecido">Não informar</SelectItem>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="parcial">Parcialmente</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="percepcao-mudanca">
            Como se sentiu em relação à mudança? (opcional)
          </FieldLabel>
          <Select
            value={p.percepcao === null ? 'desconhecido' : String(p.percepcao)}
            disabled={ocupada}
            onValueChange={(v) =>
              setP({ ...p, percepcao: v === 'desconhecido' ? null : Number(v) })
            }
          >
            <SelectTrigger id="percepcao-mudanca" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="desconhecido">Não informar</SelectItem>
                <SelectItem value="1">1 · Muito desconfortável</SelectItem>
                <SelectItem value="2">2 · Desconfortável</SelectItem>
                <SelectItem value="3">3 · Neutro</SelectItem>
                <SelectItem value="4">4 · Confortável</SelectItem>
                <SelectItem value="5">5 · Muito confortável</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="nota-experiencia">
            O que percebeu? Houve outras mudanças ou acontecimentos? (opcional)
          </FieldLabel>
          <Textarea
            id="nota-experiencia"
            value={p.nota}
            maxLength={1000}
            rows={5}
            disabled={ocupada}
            onChange={(e) => setP({ ...p, nota: e.target.value })}
          />
        </Field>
      </FieldGroup>
      <p className="text-sm text-muted-foreground">
        Um dia sem relato fica desconhecido. Sua percepção é um relato pessoal,
        não uma medição clínica ou registro automático de prática.
      </p>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      <Button type="submit" disabled={ocupada}>
        {ocupada ? 'Salvando…' : 'Salvar acompanhamento'}
      </Button>
      {inicial && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="ghost" disabled={ocupada}>
              Excluir relato
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir o relato deste dia?</AlertDialogTitle>
              <AlertDialogDescription>
                A nota e suas respostas serão removidas. A experiência, as
                métricas e as práticas permanecem guardadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Manter relato</AlertDialogCancel>
              <AlertDialogAction onClick={() => void excluir()}>
                Excluir relato
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </form>
  );
}
