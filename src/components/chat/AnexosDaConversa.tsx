'use client';
import { useId, useRef, useState } from 'react';
import Image from 'next/image';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import { buscarJson, mensagemDaFalha } from '@/lib/http/transporte';
import { MAX_BYTES_ANEXO, type AnexoPrivado } from '@/lib/anexos/tipos';
interface Props {
  obterConversa: () => string;
  conversaAtual: () => string | null;
  desabilitado: boolean;
  selecionados: string[];
  aoSelecionar: (ids: string[]) => void;
  consentimento: boolean;
  aoConsentir: (valor: boolean) => void;
}
export function AnexosDaConversa(p: Props) {
  const [aberto, setAberto] = useState(false),
    [arquivos, setArquivos] = useState<AnexoPrivado[]>([]),
    [ocupado, setOcupado] = useState(false),
    [erro, setErro] = useState<string | null>(null),
    [previa, setPrevia] = useState<{
      nome: string;
      texto: string | null;
      imagem: string | null;
    } | null>(null),
    [excluir, setExcluir] = useState<string | null>(null);
  const inputId = useId(),
    consentId = useId(),
    montado = useRef(0);
  async function carregar() {
    const id = p.conversaAtual();
    setErro(null);
    setPrevia(null);
    setExcluir(null);
    if (!id) {
      setArquivos([]);
      return;
    }
    setOcupado(true);
    const r = await buscarJson(
      '/api/chat/anexos?conversa=' + encodeURIComponent(id),
      { cache: 'no-store' }
    );
    if (r.ok) setArquivos(r.corpo as AnexoPrivado[]);
    else setErro(r.falha.message);
    setOcupado(false);
  }
  async function enviar(file: File) {
    if (file.size === 0 || file.size > MAX_BYTES_ANEXO) {
      setErro('Escolha um arquivo não vazio de até 3 MiB.');
      return;
    }
    setOcupado(true);
    setErro(null);
    const turno = ++montado.current;
    const busca = new URLSearchParams({
      conversa: p.obterConversa(),
      id: crypto.randomUUID(),
    });
    const r = await buscarJson('/api/chat/anexos?' + busca, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-Lyra-Nome': encodeURIComponent(file.name),
      },
      body: file,
      cache: 'no-store',
    });
    if (turno !== montado.current) return;
    if (r.ok) {
      const a = r.corpo as AnexoPrivado;
      setArquivos((v) => [...v, a]);
      if (p.selecionados.length < 3) p.aoSelecionar([...p.selecionados, a.id]);
      p.aoConsentir(false);
    } else setErro(r.falha.message);
    setOcupado(false);
  }
  async function abrir(a: AnexoPrivado) {
    setOcupado(true);
    setErro(null);
    setPrevia(null);
    try {
      const r = await fetch('/api/chat/anexos/' + a.id, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!r.ok)
        throw new Error('Não foi possível abrir o anexo. Atualize a lista.');
      if (a.tipo === 'text/plain')
        setPrevia({ nome: a.nome, texto: await r.text(), imagem: null });
      else {
        const blob = await r.blob();
        const reader = new FileReader();
        reader.onload = () => {
          setPrevia({
            nome: a.nome,
            texto: null,
            imagem: String(reader.result),
          });
        };
        reader.readAsDataURL(blob);
      }
    } catch (e) {
      setErro(
        e instanceof Error && e.name === 'Error'
          ? e.message
          : mensagemDaFalha(e).message
      );
    } finally {
      setOcupado(false);
    }
  }
  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (v) void carregar();
        else {
          setPrevia(null);
          setExcluir(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={p.desabilitado}
        >
          <Paperclip data-icon="inline-start" />
          Anexos{p.selecionados.length ? ` (${p.selecionados.length})` : ''}
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-modal="true"
        className="max-h-[calc(100%-2rem)] grid-cols-[minmax(0,1fr)]"
      >
        <DialogHeader>
          <DialogTitle>Anexos privados da conversa</DialogTitle>
          <DialogDescription>
            Guarde arquivos e escolha até três para a próxima pergunta. TXT em
            UTF-8 com até 8.000 caracteres; PNG, JPEG ou WebP estático com até
            16 milhões de pixels. Cada arquivo e sua cópia PNG podem ter até 3
            MiB. PDF e documentos de escritório não são aceitos.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          As fotos são guardadas como PNG sem metadados. Até 20 arquivos por
          conversa e 100 arquivos ou 30 MiB por conta, com até 100 uploads nas
          últimas 24 horas. Anexar não envia ao modelo. A leitura começa somente
          com sua pergunta e autorização.
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor={inputId}>Adicionar foto ou documento TXT</Label>
          <Input
            id={inputId}
            type="file"
            accept=".txt,.png,.jpg,.jpeg,.webp,text/plain,image/png,image/jpeg,image/webp"
            disabled={ocupado || p.desabilitado}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void enviar(f);
            }}
          />
        </div>
        {ocupado ? <p role="status">Processando arquivo…</p> : null}
        {erro ? (
          <Alert variant="destructive">
            <AlertDescription>{erro}</AlertDescription>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void carregar()}
              disabled={ocupado}
            >
              Atualizar lista
            </Button>
          </Alert>
        ) : null}
        {!arquivos.length && !ocupado ? (
          <p>Nenhum anexo guardado nesta conversa.</p>
        ) : null}
        <ul className="flex flex-col gap-4" aria-label="Arquivos da conversa">
          {arquivos.map((a) => (
            <li
              key={a.id}
              className="flex min-w-0 flex-col gap-2 rounded-lg border p-3"
            >
              <label className="flex min-w-0 items-start gap-3">
                <Checkbox
                  checked={p.selecionados.includes(a.id)}
                  disabled={
                    ocupado ||
                    (!p.selecionados.includes(a.id) &&
                      p.selecionados.length >= 3)
                  }
                  onCheckedChange={(v) => {
                    p.aoSelecionar(
                      v === true
                        ? [...p.selecionados, a.id]
                        : p.selecionados.filter((id) => id !== a.id)
                    );
                    p.aoConsentir(false);
                  }}
                />
                <span className="min-w-0 [overflow-wrap:anywhere] text-sm">
                  {a.nome}
                  <span className="block text-xs text-muted-foreground">
                    {(a.bytes / 1024).toLocaleString('pt-BR', {
                      maximumFractionDigits: 1,
                    })}{' '}
                    KiB · {a.tipo}
                  </span>
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={ocupado}
                  aria-label={'Pré-visualizar ' + a.nome}
                  onClick={() => void abrir(a)}
                >
                  Pré-visualizar
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a
                    href={'/api/chat/anexos/' + a.id + '?baixar=1'}
                    download
                    aria-label={'Baixar ' + a.nome}
                  >
                    Baixar
                  </a>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={ocupado}
                  aria-label={'Excluir ' + a.nome}
                  onClick={() => {
                    setExcluir(a.id);
                    setPrevia(null);
                  }}
                >
                  Excluir
                </Button>
              </div>
              {excluir === a.id ? (
                <Alert>
                  <AlertDescription>
                    Excluir definitivamente este arquivo? Respostas anteriores
                    podem conter trechos já citados. Para apagá-las, exclua
                    também a conversa. O arquivo deixa de estar disponível para
                    novas leituras.
                  </AlertDescription>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={ocupado}
                      onClick={async () => {
                        setOcupado(true);
                        const r = await buscarJson('/api/chat/anexos/' + a.id, {
                          method: 'DELETE',
                        });
                        if (r.ok) {
                          setArquivos((v) => v.filter((x) => x.id !== a.id));
                          p.aoSelecionar(
                            p.selecionados.filter((id) => id !== a.id)
                          );
                          p.aoConsentir(false);
                          setExcluir(null);
                        } else setErro(r.falha.message);
                        setOcupado(false);
                      }}
                    >
                      Confirmar exclusão
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setExcluir(null)}
                    >
                      Cancelar exclusão
                    </Button>
                  </div>
                </Alert>
              ) : null}
            </li>
          ))}
        </ul>
        {previa ? (
          <section aria-label={'Prévia de ' + previa.nome} className="min-w-0">
            <h3 className="break-words font-semibold">{previa.nome}</h3>
            {previa.texto !== null ? (
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-sm">
                {previa.texto
                  .split(/\r?\n/)
                  .map((l, i) => `${i + 1}: ${l}`)
                  .join('\n')}
              </pre>
            ) : (
              <Image
                unoptimized
                width={1024}
                height={1024}
                src={previa.imagem ?? ''}
                alt={'Prévia do arquivo ' + previa.nome}
                className="mt-2 h-auto max-w-full rounded-lg"
              />
            )}
          </section>
        ) : null}
        <label htmlFor={consentId} className="flex items-start gap-3 text-sm">
          <Checkbox
            id={consentId}
            checked={p.consentimento}
            disabled={!p.selecionados.length || ocupado}
            onCheckedChange={(v) => p.aoConsentir(v === true)}
          />
          <span>
            Autorizo a leitura dos arquivos selecionados nesta pergunta pelos
            modelos permitidos nas minhas preferências. Se eu uso minha chave
            Gemini, os arquivos serão enviados ao Google. Sei que a leitura pode
            errar e não substitui avaliação profissional.
          </span>
        </label>
        <p className="text-xs text-muted-foreground">
          O Modo Privacidade impede a leitura por modelos. A autorização é
          renovada a cada pergunta ou nova tentativa. Sem modelo compatível,
          você recebe um erro, sem uma análise inventada.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setAberto(false)}
        >
          Voltar à pergunta
        </Button>
      </DialogContent>
    </Dialog>
  );
}
