'use client';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
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
  registroSchema,
  type Escala,
  type RegistroDoAcompanhamento,
} from '@/lib/acompanhamentos/esquema';
import { requisitar } from '@/components/experiencias/transporte';
import { EscalaDeResposta } from './EscalaDeResposta';

/**
 * Resposta de um período (dia ou semana). Uma resposta dada em escala
 * anterior aparece com seu rótulo original; ao salvar de novo, o novo valor
 * usa a escala atual e substitui aquela resposta.
 */
export function RespostaDoPeriodo({
  id,
  nome,
  data,
  rotuloDoPeriodo,
  escala,
  inicial,
  ocupada,
  ocupar,
  salvo,
}: {
  id: string;
  nome: string;
  data: string;
  rotuloDoPeriodo: string;
  escala: Escala;
  inicial: RegistroDoAcompanhamento | null;
  ocupada: boolean;
  ocupar: (v: boolean) => void;
  salvo: (mensagem: string) => Promise<void>;
}) {
  const ids = useId(),
    anterior = Boolean(inicial?.definicaoAnterior),
    [valor, setValor] = useState<number | null>(
      inicial && !anterior ? inicial.valor : null
    ),
    [nota, setNota] = useState(inicial?.nota ?? ''),
    [idRegistro] = useState(() => inicial?.idRegistro ?? crypto.randomUUID()),
    [erro, setErro] = useState('');
  const excluir = async () => {
    if (!inicial) return;
    ocupar(true);
    setErro('');
    try {
      await requisitar(
        `/api/acompanhamentos/${id}/registros/${data}`,
        'DELETE',
        { idRegistro: inicial.idRegistro, versao: inicial.versao }
      );
      await salvo(`Resposta de ${rotuloDoPeriodo} excluída.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir.');
    } finally {
      ocupar(false);
    }
  };
  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (ocupada) return;
        if (valor === null) {
          setErro('Escolha um ponto da escala para salvar.');
          return;
        }
        const r = registroSchema.safeParse({
          idRegistro,
          data,
          valor,
          nota,
          versao: inicial?.versao ?? 0,
        });
        if (!r.success) {
          setErro(r.error.issues[0].message);
          return;
        }
        ocupar(true);
        setErro('');
        void requisitar(
          `/api/acompanhamentos/${id}/registros/${data}`,
          'PUT',
          r.data
        )
          .then(() => salvo(`Resposta de ${rotuloDoPeriodo} salva.`))
          .catch((e) =>
            setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
          )
          .finally(() => ocupar(false));
      }}
    >
      {anterior && inicial && (
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          Resposta guardada com a escala anterior:{' '}
          <strong>{inicial.rotulo}</strong>. Para mantê-la, feche sem salvar.
          Uma nova escolha usará a escala atual.
        </p>
      )}
      <div className="flex flex-col gap-2">
        <p id={`${ids}-escala`} className="text-sm font-medium">
          {nome} em {rotuloDoPeriodo}
        </p>
        <EscalaDeResposta
          escala={escala}
          valor={valor}
          aoEscolher={setValor}
          rotuloId={`${ids}-escala`}
          desativada={ocupada}
        />
      </div>
      <Field>
        <FieldLabel htmlFor={`${ids}-nota`}>Nota (opcional)</FieldLabel>
        <Textarea
          id={`${ids}-nota`}
          value={nota}
          maxLength={500}
          rows={3}
          disabled={ocupada}
          onChange={(e) => setNota(e.target.value)}
        />
        <FieldDescription>{nota.length}/500 caracteres</FieldDescription>
      </Field>
      <p className="text-sm text-muted-foreground">
        Um período sem resposta fica como “sem registro”, nunca como zero. Sua
        resposta é um relato pessoal, não uma medição clínica.
      </p>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={ocupada}>
          {ocupada ? 'Salvando…' : 'Salvar resposta'}
        </Button>
        {inicial && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" disabled={ocupada}>
                Excluir resposta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Excluir a resposta de {rotuloDoPeriodo}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  O valor e a nota deste período serão removidos e ele voltará a
                  aparecer como sem registro. O acompanhamento e as demais
                  respostas permanecem.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Manter resposta</AlertDialogCancel>
                <AlertDialogAction onClick={() => void excluir()}>
                  Excluir resposta
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </form>
  );
}
