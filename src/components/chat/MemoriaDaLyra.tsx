'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Brain, Download, RefreshCw, Trash2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { usePrivacyMode } from '@/hooks/use-privacy-mode';
import { buscarJson } from '@/lib/http/transporte';
import {
  estadoDaMemoriaSchema,
  type EstadoDaMemoria,
  type FatoDaMemoria,
} from '@/lib/memoria/tipos';

const data = (valor: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(
    new Date(valor)
  );

export function MemoriaDaLyra() {
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<EstadoDaMemoria | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const [texto, setTexto] = useState('');
  const [correcao, setCorrecao] = useState<FatoDaMemoria | null>(null);
  const versao = useRef(0);
  const trava = useRef(false);
  const leitura = useRef<AbortController | null>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const { privacyMode } = usePrivacyMode();

  const carregar = useCallback(async (inicio = 0) => {
    leitura.current?.abort();
    const controle = new AbortController();
    leitura.current = controle;
    const atual = ++versao.current;
    setCarregando(true);
    const resposta = await buscarJson(`/api/memoria?inicio=${inicio}`, {
      cache: 'no-store',
      signal: controle.signal,
    });
    if (atual !== versao.current || controle.signal.aborted) return;
    if (resposta.ok) {
      const conferido = estadoDaMemoriaSchema.safeParse(resposta.corpo);
      if (conferido.success) {
        setEstado((anterior) => ({
          ...conferido.data,
          fatos:
            inicio && anterior
              ? [
                  ...new Map(
                    [...anterior.fatos, ...conferido.data.fatos].map((fato) => [
                      fato.uuid,
                      fato,
                    ])
                  ).values(),
                ]
              : conferido.data.fatos,
        }));
        setErro(null);
      } else
        setErro(
          'Não foi possível conferir os dados da memória. Tente atualizar.'
        );
    } else setErro(resposta.falha.message);
    setCarregando(false);
  }, []);

  useEffect(
    () => () => {
      ++versao.current;
      leitura.current?.abort();
    },
    []
  );

  const temPendencias = Boolean(
    estado?.fila || estado?.erros || estado?.apagando
  );
  const listaExpandida = (estado?.fatos.length ?? 0) > 40;
  useEffect(() => {
    if (!aberto || ocupado || listaExpandida || !temPendencias) return;
    const timer = setInterval(() => void carregar(), 10_000);
    return () => clearInterval(timer);
  }, [aberto, ocupado, listaExpandida, temPendencias, carregar]);

  useEffect(() => {
    if (correcao) campo.current?.focus();
  }, [correcao]);

  const executar = async (metodo: string, corpo: unknown, mensagem: string) => {
    if (trava.current) return false;
    trava.current = true;
    setOcupado(true);
    setErro(null);
    setAviso('');
    ++versao.current;
    leitura.current?.abort();
    setCarregando(false);
    try {
      const resposta = await buscarJson('/api/memoria', {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
      });
      if (!resposta.ok) {
        setErro(resposta.falha.message);
        return false;
      }
      setAviso(
        metodo === 'DELETE' && resposta.status === 202
          ? 'Memória desativada. A exclusão está pendente e será concluída automaticamente.'
          : mensagem
      );
      await carregar();
      return true;
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  };

  const salvarRelato = async () => {
    if (!texto.trim()) return;
    const salvo = await executar(
      'POST',
      {
        acao: 'relato',
        texto: texto.trim(),
        ...(correcao ? { corrige: correcao.uuid } : {}),
      },
      'Relato enviado para processamento. As lembranças aparecem quando a extração terminar.'
    );
    if (salvo) {
      setTexto('');
      setCorrecao(null);
    }
  };
  const bloqueado = ocupado || Boolean(estado?.apagando);

  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        setAberto(valor);
        if (valor) void carregar();
        else {
          ++versao.current;
          leitura.current?.abort();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Memória da Lyra">
          <Brain data-icon="inline-start" aria-hidden="true" />
          <span className="hidden sm:inline">Memória</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-5">
        <DialogHeader>
          <DialogTitle>O que a Lyra lembra de você</DialogTitle>
          <DialogDescription>
            Você decide o que pode acompanhar suas próximas conversas.
          </DialogDescription>
        </DialogHeader>
        {erro ? (
          <Alert variant="destructive">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        ) : null}
        {aviso ? (
          <p role="status" className="text-sm leading-6 text-muted-foreground">
            {aviso}
          </p>
        ) : null}
        {privacyMode ? (
          <Alert>
            <AlertDescription>
              Modo privado ativo: esta conversa não consulta nem acrescenta
              lembranças. As mensagens continuam no seu histórico.
            </AlertDescription>
          </Alert>
        ) : null}
        {!estado ? (
          <p role="status">
            {carregando
              ? 'Carregando memória…'
              : 'Use Atualizar para tentar novamente.'}
          </p>
        ) : (
          <>
            <FieldSet disabled={bloqueado}>
              <FieldLegend>Suas escolhas</FieldLegend>
              <FieldGroup>
                <Field orientation="horizontal" data-disabled={bloqueado}>
                  <FieldContent className="min-w-0">
                    <FieldLabel htmlFor="memoria-ativa">
                      Lembrar entre conversas
                    </FieldLabel>
                    <FieldDescription id="descricao-memoria">
                      Permito organizar relatos das próximas mensagens em
                      lembranças. Eles podem incluir informações pessoais ou de
                      saúde que eu escrever.
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="memoria-ativa"
                    aria-describedby="descricao-memoria"
                    checked={estado.ativa}
                    disabled={bloqueado}
                    onCheckedChange={(ativa) =>
                      void executar(
                        'POST',
                        { acao: 'configurar', ativa, nuvem: estado.nuvem },
                        ativa
                          ? 'Memória ativada para as próximas mensagens.'
                          : 'Memória pausada. Suas lembranças foram preservadas.'
                      )
                    }
                  />
                </Field>
                <Field orientation="horizontal" data-disabled={bloqueado}>
                  <FieldContent className="min-w-0">
                    <FieldLabel htmlFor="memoria-nuvem">
                      Autorizar provedores em nuvem
                    </FieldLabel>
                    <FieldDescription id="descricao-nuvem">
                      Permito enviar mensagens, lembranças e contexto do meu
                      perfil aos provedores externos configurados para gerar
                      respostas e organizar a memória. Desligado: processamento
                      local.
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="memoria-nuvem"
                    aria-describedby="descricao-nuvem"
                    checked={estado.nuvem}
                    disabled={bloqueado}
                    onCheckedChange={(nuvem) =>
                      void executar(
                        'POST',
                        { acao: 'configurar', ativa: estado.ativa, nuvem },
                        nuvem
                          ? 'Uso de provedores em nuvem autorizado.'
                          : 'Uso de nuvem desativado para as próximas solicitações.'
                      )
                    }
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
            {!estado.disponivel ? (
              <Alert>
                <AlertDescription>
                  A memória está temporariamente indisponível. Você pode
                  continuar conversando; relatos pendentes serão tentados
                  novamente.
                </AlertDescription>
              </Alert>
            ) : null}
            {estado.erros > 0 && !estado.apagando ? (
              <Alert>
                <AlertDescription>
                  Alguns relatos ainda não puderam ser organizados. Confira se
                  há um modelo autorizado em funcionamento nas configurações de
                  IA. O aplicativo tentará novamente automaticamente.
                </AlertDescription>
              </Alert>
            ) : null}
            <Separator />
            <section
              aria-labelledby="lembrancas-titulo"
              className="flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3
                  id="lembrancas-titulo"
                  className="font-display font-semibold"
                >
                  Suas lembranças
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={carregando || ocupado}
                  onClick={() => void carregar()}
                >
                  <RefreshCw data-icon="inline-start" aria-hidden="true" />
                  Atualizar
                </Button>
              </div>
              <p role="status" className="text-sm text-muted-foreground">
                {estado.apagando
                  ? 'Exclusão em andamento…'
                  : `${estado.prontos} relato(s) processado(s) · ${estado.fila} aguardando · ${estado.erros} com nova tentativa programada.`}
              </p>
              {estado.fatos.length ? (
                <ul className="flex flex-col gap-3">
                  {estado.fatos.map((fato) => (
                    <li
                      key={fato.uuid}
                      className="flex min-w-0 flex-col gap-3 rounded-md border border-border p-4"
                    >
                      <p className="break-words text-sm leading-6">
                        {fato.fact}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          Relato pessoal ·{' '}
                          {data(fato.valid_at ?? fato.created_at)}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!estado.ativa || bloqueado || privacyMode}
                          onClick={() => {
                            setCorrecao(fato);
                            setTexto('');
                          }}
                        >
                          Corrigir lembrança
                        </Button>
                      </div>
                      {fato.origens.length ? (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-primary">
                            Ver relatos de origem
                          </summary>
                          <ul className="mt-3 flex flex-col gap-3">
                            {fato.origens.map((origem, indice) => (
                              <li
                                key={`${origem.data}:${indice}`}
                                className="flex flex-col gap-1"
                              >
                                <blockquote className="break-words border-l-2 border-border pl-3 text-muted-foreground">
                                  {origem.texto}
                                </blockquote>
                                <p className="text-xs text-muted-foreground">
                                  {data(origem.data)}
                                  {origem.conversaId ? (
                                    <>
                                      {' '}
                                      ·{' '}
                                      <Link
                                        href={`/chat?conversa=${encodeURIComponent(origem.conversaId)}`}
                                        onClick={() => setAberto(false)}
                                        className="text-primary underline underline-offset-2"
                                      >
                                        Abrir conversa
                                      </Link>
                                    </>
                                  ) : (
                                    ' · Relato acrescentado nos controles de memória'
                                  )}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  {estado.apagando
                    ? 'As lembranças deixaram de ser usadas nas respostas.'
                    : estado.disponivel
                      ? estado.ativa
                        ? 'Nenhuma lembrança para mostrar. Conte algo que gostaria de preservar; os relatos pendentes aparecem após o processamento.'
                        : 'Nenhuma lembrança para mostrar. Ative a memória e conte algo que gostaria de preservar.'
                      : 'As lembranças serão exibidas quando o serviço voltar.'}
                </p>
              )}
              {estado.proximo !== null ? (
                <Button
                  variant="outline"
                  disabled={carregando || ocupado}
                  onClick={() => void carregar(estado.proximo ?? 0)}
                >
                  Ver mais lembranças
                </Button>
              ) : null}
            </section>
            <Separator />
            <form
              onSubmit={(evento) => {
                evento.preventDefault();
                void salvarRelato();
              }}
            >
              <FieldGroup>
                <Field
                  data-disabled={!estado.ativa || bloqueado || privacyMode}
                >
                  <FieldLabel htmlFor="novo-relato">
                    {correcao
                      ? 'Como esta lembrança deve ficar?'
                      : 'Algo que você quer que a Lyra lembre'}
                  </FieldLabel>
                  <FieldDescription id="ajuda-relato">
                    {correcao
                      ? `Substituindo: ${correcao.fact}`
                      : 'Conte uma preferência, um objetivo ou uma mudança na sua vida. A lembrança é extraída do seu relato, sem diagnóstico automático.'}
                  </FieldDescription>
                  <Textarea
                    ref={campo}
                    id="novo-relato"
                    aria-describedby="ajuda-relato"
                    value={texto}
                    maxLength={2000}
                    required
                    disabled={!estado.ativa || bloqueado || privacyMode}
                    onChange={(evento) => setTexto(evento.target.value)}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={
                      !estado.ativa || bloqueado || privacyMode || !texto.trim()
                    }
                  >
                    {ocupado
                      ? 'Salvando…'
                      : correcao
                        ? 'Enviar correção'
                        : 'Acrescentar relato'}
                  </Button>
                  {correcao ? (
                    <Button
                      variant="outline"
                      disabled={ocupado}
                      onClick={() => {
                        setCorrecao(null);
                        setTexto('');
                      }}
                    >
                      Cancelar correção
                    </Button>
                  ) : null}
                </div>
              </FieldGroup>
            </form>
            <Button
              variant="outline"
              className="h-auto min-h-10 whitespace-normal"
              disabled={!estado.ativa || bloqueado || privacyMode}
              onClick={() =>
                void executar(
                  'POST',
                  { acao: 'importar' },
                  'Conversas salvas enviadas para processamento, sem duplicar relatos já incluídos.'
                )
              }
            >
              Aprender com minhas conversas salvas
            </Button>
            <p className="text-xs leading-5 text-muted-foreground">
              A importação é opcional. Mensagens privadas ficam de fora. Pausar
              preserva lembranças; apagar a memória preserva o histórico de
              conversas.
            </p>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <a href="/api/account/export">
                  <Download data-icon="inline-start" aria-hidden="true" />
                  Exportar meus dados
                </a>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={bloqueado}>
                    <Trash2 data-icon="inline-start" aria-hidden="true" />
                    Apagar toda a memória
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apagar suas lembranças?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Os relatos e o grafo da memória serão apagados e a memória
                      ficará desativada. Seu histórico de conversas será
                      preservado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Manter lembranças</AlertDialogCancel>
                    <AlertDialogAction
                      className={buttonVariants({ variant: 'destructive' })}
                      onClick={() =>
                        void executar(
                          'DELETE',
                          undefined,
                          'Memória apagada e desativada.'
                        )
                      }
                    >
                      Apagar memória
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
        {!estado && !carregando ? (
          <Button variant="outline" onClick={() => void carregar()}>
            Atualizar memória
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
