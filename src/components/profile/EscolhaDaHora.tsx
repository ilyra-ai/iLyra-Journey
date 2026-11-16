'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { avisarMapaAtualizado } from '@/lib/astrology/evento-do-mapa';
import type {
  OpcaoDeHora,
  OpcoesDeHora,
} from '@/lib/perfil/hora-de-nascimento';

const ROTA = '/api/perfil/hora-de-nascimento';

async function pedir<T>(
  caminho: string,
  metodo: 'GET' | 'POST' | 'DELETE',
  corpo?: unknown
): Promise<T> {
  const resposta = await fetch(caminho, {
    method: metodo,
    credentials: 'include',
    cache: 'no-store',
    headers:
      corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const dados = (await resposta.json().catch(() => null)) as
    (T & { error?: string }) | null;
  if (!resposta.ok || !dados) {
    throw new Error(dados?.error ?? `HTTP ${resposta.status}`);
  }
  return dados;
}

type Estado =
  | { fase: 'carregando' }
  | { fase: 'erro'; mensagem: string }
  | { fase: 'pronto'; opcoes: OpcaoDeHora[]; motivo: string | null };

/** Motivo, em linguagem simples, de não haver horários para mostrar. */
function motivoSemOpcoes(dados: OpcoesDeHora): string | null {
  if (dados.faltando.length > 0) {
    const itens = dados.faltando
      .map((item) =>
        item === 'data' ? 'a data de nascimento' : 'a cidade de nascimento'
      )
      .join(' e ');
    return `Falta ${itens} no seu perfil. Preencha, salve o perfil e volte aqui.`;
  }
  if (dados.indisponivel !== null || dados.opcoes.length === 0) {
    return 'Para a cidade em que você nasceu, muito próxima de um dos polos, os horários não podem ser calculados.';
  }
  return null;
}

/** Grade de horários: só horário e uma palavra, sem termos técnicos. */
function GradeDeHorarios({
  opcoes,
  escolha,
  aoMudar,
}: {
  opcoes: OpcaoDeHora[];
  escolha: string;
  aoMudar: (id: string) => void;
}) {
  return (
    <RadioGroup
      value={escolha}
      onValueChange={aoMudar}
      aria-label="Horários do dia em que você nasceu"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {opcoes.map((opcao) => {
        const id = `hora-${opcao.id}`;
        return (
          <label
            key={opcao.id}
            htmlFor={id}
            className="flex min-h-20 cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3 transition-colors duration-(--duracao-rapida) hover:border-primary/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/8"
          >
            <RadioGroupItem
              id={id}
              value={opcao.id}
              className="mt-1 shrink-0"
            />
            <span className="min-w-0">
              <span className="block font-display text-base font-semibold wrap-break-word text-foreground">
                {opcao.palavra}
              </span>
              <span className="block text-xs text-muted-foreground tabular-nums">
                {opcao.inicio} às {opcao.fim}
              </span>
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}

function Dialogo({
  aberto,
  aoAbrirOuFechar,
  rotuloDoBotao,
  estado,
  escolha,
  aoMudar,
  aoTentarDeNovo,
  aoConfirmar,
  aoRecusar,
  enviando,
  rodape,
}: {
  aberto: boolean;
  aoAbrirOuFechar: (aberto: boolean) => void;
  rotuloDoBotao: string;
  estado: Estado;
  escolha: string;
  aoMudar: (id: string) => void;
  aoTentarDeNovo: () => void;
  aoConfirmar: () => void;
  aoRecusar: () => void;
  enviando: boolean;
  rodape: string;
}) {
  const comOpcoes =
    estado.fase === 'pronto' &&
    estado.motivo === null &&
    estado.opcoes.length > 0;
  return (
    <Dialog open={aberto} onOpenChange={aoAbrirOuFechar}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {rotuloDoBotao}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Qual palavra mais se parece com você?</DialogTitle>
          <DialogDescription>
            Cada horário do dia em que você nasceu tem uma palavra. Escolha a
            que melhor descreve o seu jeito de ser.
          </DialogDescription>
        </DialogHeader>

        {estado.fase === 'carregando' ? (
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            aria-busy="true"
            aria-label="Carregando os horários"
          >
            {Array.from({ length: 12 }, (_, indice) => (
              <Skeleton key={indice} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : null}

        {estado.fase === 'erro' ? (
          <Alert variant="destructive">
            <AlertTitle>Não foi possível carregar os horários</AlertTitle>
            <AlertDescription className="space-y-3">
              {estado.mensagem ? <p>{estado.mensagem}</p> : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={aoTentarDeNovo}
              >
                Tentar de novo
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {estado.fase === 'pronto' && !comOpcoes ? (
          <Alert>
            <AlertTitle>Ainda não dá para mostrar os horários</AlertTitle>
            <AlertDescription>
              {estado.motivo ??
                'Não há horários para a data e a cidade informadas.'}
            </AlertDescription>
          </Alert>
        ) : null}

        {estado.fase === 'pronto' && comOpcoes ? (
          <>
            <GradeDeHorarios
              opcoes={estado.opcoes}
              escolha={escolha}
              aoMudar={aoMudar}
            />
            <p className="text-xs leading-5 text-muted-foreground">{rodape}</p>
          </>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={enviando}
            onClick={aoRecusar}
          >
            Nenhuma se parece comigo
          </Button>
          <Button
            type="button"
            disabled={enviando || !escolha || !comOpcoes}
            onClick={aoConfirmar}
          >
            {enviando ? 'Gravando…' : 'Confirmar horário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function mensagemDaFalha(falha: unknown) {
  return falha instanceof Error
    ? falha.message
    : 'Não foi possível carregar os horários.';
}

/**
 * Perfil: para quem não sabe a hora em que nasceu. Mostra os horários do dia
 * de nascimento, cada um com uma única palavra, e grava o escolhido como hora
 * estimada. As opções são calculadas no servidor com a data e a cidade já
 * salvas; o navegador envia apenas qual horário foi escolhido.
 */
export function EscolhaDaHora({
  horaNoFormulario,
  aoGravar,
}: {
  /** Valor atual do campo de hora do formulário ("" quando vazio). */
  horaNoFormulario: string;
  /** Hora gravada no perfil pela escolha (`null`: voltou a ser desconhecida). */
  aoGravar: (hora: string | null) => void;
}) {
  const [aberto, setAberto] = React.useState(false);
  const [estado, setEstado] = React.useState<Estado>({ fase: 'carregando' });
  const [escolha, setEscolha] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);
  // Hora estimada gravada no perfil, para o texto fora do diálogo.
  const [estimadaNoPerfil, setEstimadaNoPerfil] = React.useState<string | null>(
    null
  );

  const receber = React.useCallback((dados: OpcoesDeHora) => {
    setEstado({
      fase: 'pronto',
      opcoes: dados.opcoes,
      motivo: motivoSemOpcoes(dados),
    });
    setEscolha(dados.opcoes.find((opcao) => opcao.escolhida)?.id ?? '');
    setEstimadaNoPerfil(dados.situacao === 'estimada' ? dados.hora : null);
    return dados;
  }, []);

  const carregar = React.useCallback(async () => {
    setEstado({ fase: 'carregando' });
    try {
      receber(await pedir<OpcoesDeHora>(ROTA, 'GET'));
    } catch (falha: unknown) {
      setEstado({ fase: 'erro', mensagem: mensagemDaFalha(falha) });
    }
  }, [receber]);

  // Situação inicial: diz se a hora do perfil é uma estimativa.
  React.useEffect(() => {
    let ativo = true;
    pedir<OpcoesDeHora>(ROTA, 'GET')
      .then((dados) => {
        if (ativo) receber(dados);
      })
      .catch(() => {
        // O botão continua disponível; o erro aparece ao abrir o diálogo,
        // com a opção de tentar de novo.
        if (ativo) setEstado({ fase: 'erro', mensagem: '' });
      });
    return () => {
      ativo = false;
    };
  }, [receber]);

  async function confirmar() {
    if (!escolha) return;
    setEnviando(true);
    try {
      const dados = receber(
        await pedir<OpcoesDeHora>(ROTA, 'POST', { janela: escolha })
      );
      aoGravar(dados.hora);
      avisarMapaAtualizado();
      toast.success('Horário escolhido. O seu mapa foi recalculado.', {
        description:
          'Ele fica marcado como estimado até você informar a hora da certidão.',
      });
      setAberto(false);
    } catch (falha: unknown) {
      toast.error('Não foi possível gravar o horário.', {
        description: falha instanceof Error ? falha.message : undefined,
      });
    } finally {
      setEnviando(false);
    }
  }

  async function nenhuma() {
    if (estimadaNoPerfil === null) {
      setAberto(false);
      return;
    }
    setEnviando(true);
    try {
      receber(await pedir<OpcoesDeHora>(ROTA, 'DELETE'));
      aoGravar(null);
      avisarMapaAtualizado();
      toast.success('Tudo bem: a hora volta a ficar em branco.', {
        description:
          'O seu mapa segue sem a parte que depende da hora de nascimento.',
      });
      setAberto(false);
    } catch (falha: unknown) {
      toast.error('Não foi possível desfazer a escolha.', {
        description: falha instanceof Error ? falha.message : undefined,
      });
    } finally {
      setEnviando(false);
    }
  }

  const horaEstimadaVisivel =
    estimadaNoPerfil !== null && horaNoFormulario === estimadaNoPerfil;
  // Com uma hora digitada pela pessoa não há o que estimar.
  if (horaNoFormulario !== '' && !horaEstimadaVisivel) return null;

  return (
    <div className="space-y-2">
      {horaEstimadaVisivel ? (
        <p className="rounded-md border border-warning/30 bg-warning-light px-3 py-2 text-xs leading-5 text-warning">
          Este horário foi escolhido por você como o mais parecido com o seu
          jeito. Se encontrar a hora na certidão de nascimento, digite-a aqui.
        </p>
      ) : null}
      <Dialogo
        aberto={aberto}
        aoAbrirOuFechar={(valor) => {
          setAberto(valor);
          if (valor) void carregar();
        }}
        rotuloDoBotao={
          horaEstimadaVisivel
            ? 'Escolher outro horário'
            : 'Não sei a hora em que nasci'
        }
        estado={estado}
        escolha={escolha}
        aoMudar={setEscolha}
        aoTentarDeNovo={() => void carregar()}
        aoConfirmar={() => void confirmar()}
        aoRecusar={() => void nenhuma()}
        enviando={enviando}
        rodape="Os horários usam a data e a cidade de nascimento salvas no seu perfil. A escolha fica marcada como estimada: ela ajuda, mas não substitui a hora da certidão de nascimento."
      />
    </div>
  );
}

/**
 * Configuração inicial: a data e a cidade ainda não estão salvas, então as
 * opções vêm de uma prévia calculada no servidor para esses dados. Nada é
 * gravado aqui; a escolha segue com o envio do formulário e o servidor
 * calcula a hora.
 */
export function EscolhaDaHoraNaConfiguracao({
  data,
  cidadeId,
  horaNoFormulario,
  escolhida,
  aoEscolher,
}: {
  /** "AAAA-MM-DD" já informada, ou `null`. */
  data: string | null;
  cidadeId: number | null;
  horaNoFormulario: string;
  escolhida: OpcaoDeHora | null;
  aoEscolher: (opcao: OpcaoDeHora | null) => void;
}) {
  const [aberto, setAberto] = React.useState(false);
  const [estado, setEstado] = React.useState<Estado>({ fase: 'carregando' });
  const [escolha, setEscolha] = React.useState('');

  const carregar = React.useCallback(async () => {
    if (!data || !cidadeId) {
      setEstado({
        fase: 'pronto',
        opcoes: [],
        motivo: `Informe ${[
          data ? null : 'a data de nascimento',
          cidadeId ? null : 'a cidade de nascimento',
        ]
          .filter(Boolean)
          .join(' e ')} para ver os horários.`,
      });
      return;
    }
    setEstado({ fase: 'carregando' });
    try {
      const { opcoes } = await pedir<{ opcoes: OpcaoDeHora[] }>(
        `${ROTA}?data=${data}&cidadeId=${cidadeId}`,
        'GET'
      );
      setEstado({
        fase: 'pronto',
        opcoes,
        motivo:
          opcoes.length === 0
            ? 'Não há horários para a data e a cidade informadas.'
            : null,
      });
    } catch (falha: unknown) {
      setEstado({ fase: 'erro', mensagem: mensagemDaFalha(falha) });
    }
  }, [data, cidadeId]);

  // Com uma hora digitada pela pessoa não há o que estimar.
  if (horaNoFormulario !== '') return null;

  return (
    <div className="space-y-2">
      {escolhida ? (
        <p className="rounded-md border border-border bg-background px-3 py-2 text-sm leading-6 text-foreground">
          Horário escolhido:{' '}
          <span className="font-semibold">{escolhida.palavra}</span>,{' '}
          <span className="tabular-nums">
            {escolhida.inicio} às {escolhida.fim}
          </span>
          . Fica marcado como estimado.
        </p>
      ) : null}
      <Dialogo
        aberto={aberto}
        aoAbrirOuFechar={(valor) => {
          setAberto(valor);
          if (valor) {
            setEscolha(escolhida?.id ?? '');
            void carregar();
          }
        }}
        rotuloDoBotao={
          escolhida ? 'Escolher outro horário' : 'Não sei a hora em que nasci'
        }
        estado={estado}
        escolha={escolha}
        aoMudar={setEscolha}
        aoTentarDeNovo={() => void carregar()}
        aoConfirmar={() => {
          const opcao =
            estado.fase === 'pronto'
              ? estado.opcoes.find((item) => item.id === escolha)
              : undefined;
          if (!opcao) return;
          aoEscolher(opcao);
          setAberto(false);
        }}
        aoRecusar={() => {
          aoEscolher(null);
          setAberto(false);
        }}
        enviando={false}
        rodape="Os horários usam a data e a cidade de nascimento que você informou. A escolha fica marcada como estimada: ela ajuda, mas não substitui a hora da certidão de nascimento."
      />
    </div>
  );
}
