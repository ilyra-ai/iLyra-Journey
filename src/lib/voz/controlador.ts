'use client';
import { trechosParaLeitura } from './texto';
import { ouvirBloqueio } from '@/lib/offline/cofre';
export type EstadoDaLeitura = {
  id: string | null;
  estado: 'parada' | 'preparando' | 'lendo' | 'pausada' | 'concluida' | 'erro';
  erro: string | null;
  voz: string | null;
  idioma: string | null;
  disponivel: boolean;
  sessaoAlterada: boolean;
  velocidade: number;
  trecho: number;
  total: number;
};
export const LEITURA_INICIAL: EstadoDaLeitura = {
  id: null,
  estado: 'parada',
  erro: null,
  voz: null,
  idioma: null,
  disponivel: false,
  sessaoAlterada: false,
  velocidade: 1,
  trecho: 0,
  total: 0,
};
class LeituraLocal {
  estado: EstadoDaLeitura = LEITURA_INICIAL;
  ouvintes = new Set<() => void>();
  voz: SpeechSynthesisVoice | null = null;
  partes: string[] = [];
  indice = 0;
  geracao = 0;
  fala: SpeechSynthesisUtterance | null = null;
  tempo: ReturnType<typeof setTimeout> | null = null;
  canal: BroadcastChannel | null = null;
  origem = crypto.randomUUID();
  constructor() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.addEventListener(
        'voiceschanged',
        this.atualizarVoz
      );
      this.atualizarVoz();
    }
    ouvirBloqueio(() => this.parar());
    window.addEventListener('pagehide', () => this.parar());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.pausar();
    });
    if (typeof BroadcastChannel !== 'undefined') {
      this.canal = new BroadcastChannel('lyra-leitura-local');
      this.canal.onmessage = (e) => {
        if (e.data?.origem === this.origem) return;
        if (e.data?.tipo === 'parar') this.parar();
        if (e.data?.tipo === 'sessao') {
          this.parar();
          this.publicar({ sessaoAlterada: true, disponivel: false });
        }
      };
    }
  }
  atualizarVoz = () => {
    const vozes = (
      'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []
    ).filter((v) => v.localService && /^pt(?:[-_]|$)/i.test(v.lang));
    this.voz =
      vozes.find((v) => /^pt[-_]BR$/i.test(v.lang)) ?? vozes[0] ?? null;
    if (!this.voz && this.estado.id) this.parar();
    this.publicar({
      voz: this.voz?.name ?? null,
      idioma: this.voz?.lang ?? null,
      disponivel: !!this.voz && !this.estado.sessaoAlterada,
    });
  };
  publicar(p: Partial<EstadoDaLeitura>) {
    this.estado = { ...this.estado, ...p };
    for (const f of this.ouvintes) f();
  }
  cancelarAudio() {
    this.geracao++;
    if (this.tempo) clearTimeout(this.tempo);
    this.tempo = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.fala = null;
  }
  parar = () => {
    this.cancelarAudio();
    this.partes = [];
    this.indice = 0;
    this.publicar({
      id: null,
      estado: 'parada',
      erro: null,
      trecho: 0,
      total: 0,
    });
  };
  pararSeFor = (id: string) => {
    if (this.estado.id === id) this.parar();
  };
  iniciar = (id: string, texto: string) => {
    this.parar();
    if (this.estado.sessaoAlterada) {
      this.publicar({
        id,
        estado: 'erro',
        erro: 'Sua conta foi alterada em outra aba. Atualize esta página antes de ouvir.',
      });
      return;
    }
    this.atualizarVoz();
    if (!this.voz) {
      this.publicar({
        id,
        estado: 'erro',
        erro: 'Nenhuma voz local em português está disponível neste navegador. Verifique as vozes instaladas no dispositivo.',
      });
      return;
    }
    try {
      this.partes = trechosParaLeitura(texto);
      if (!this.partes.length)
        throw new Error('Não há texto legível nesta resposta.');
    } catch (e) {
      this.publicar({
        id,
        estado: 'erro',
        erro:
          e instanceof Error
            ? e.message
            : 'Não foi possível preparar a leitura.',
      });
      return;
    }
    this.indice = 0;
    this.canal?.postMessage({ tipo: 'parar', origem: this.origem });
    this.publicar({
      id,
      estado: 'preparando',
      erro: null,
      trecho: 1,
      total: this.partes.length,
    });
    this.falar();
  };
  falar() {
    if (!this.voz || !this.estado.id) return;
    const token = ++this.geracao,
      fala = new SpeechSynthesisUtterance(this.partes[this.indice]);
    this.fala = fala;
    fala.voice = this.voz;
    fala.lang = this.voz.lang;
    fala.rate = this.estado.velocidade;
    this.publicar({ estado: 'preparando', trecho: this.indice + 1 });
    this.tempo = setTimeout(() => {
      if (token !== this.geracao) return;
      this.cancelarAudio();
      this.publicar({
        estado: 'erro',
        erro: 'A voz não iniciou. Confira o áudio do dispositivo e tente novamente.',
      });
    }, 10000);
    fala.onstart = () => {
      if (token !== this.geracao) return;
      if (this.tempo) clearTimeout(this.tempo);
      this.tempo = null;
      this.publicar({ estado: 'lendo' });
    };
    fala.onend = () => {
      if (token !== this.geracao) return;
      if (this.tempo) clearTimeout(this.tempo);
      this.tempo = null;
      this.fala = null;
      this.indice++;
      if (this.indice < this.partes.length) this.falar();
      else {
        this.partes = [];
        this.geracao++;
        this.publicar({ estado: 'concluida', trecho: this.estado.total });
      }
    };
    fala.onerror = () => {
      if (token !== this.geracao) return;
      this.cancelarAudio();
      this.publicar({
        estado: 'erro',
        erro: 'O navegador interrompeu a leitura. Confira a voz e o áudio e inicie novamente.',
      });
    };
    // Cancela qualquer fila anterior e remove pausa nativa antes de falar.
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(fala);
  }
  pausar = () => {
    if (this.estado.estado !== 'lendo' && this.estado.estado !== 'preparando')
      return;
    this.cancelarAudio();
    this.publicar({ estado: 'pausada' });
  };
  retomar = () => {
    if (
      this.estado.estado !== 'pausada' ||
      document.visibilityState === 'hidden'
    )
      return;
    this.canal?.postMessage({ tipo: 'parar', origem: this.origem });
    this.falar();
  };
  velocidade = (v: number) => {
    if (![0.75, 1, 1.25, 1.5, 2].includes(v)) return;
    const lendo =
      this.estado.estado === 'lendo' || this.estado.estado === 'preparando';
    if (lendo) this.pausar();
    this.publicar({ velocidade: v });
    if (lendo) this.retomar();
  };
}
// Instância somente na janela: nenhum texto é guardado no servidor ou disco.
type JanelaComLeitura = Window & { __lyraLeituraLocal?: LeituraLocal };
function obter(criar = false) {
  if (typeof window === 'undefined') return null;
  const w = window as JanelaComLeitura;
  if (criar) w.__lyraLeituraLocal ??= new LeituraLocal();
  return w.__lyraLeituraLocal ?? null;
}
export function assinarLeitura(f: () => void) {
  const c = obter(true)!;
  c.ouvintes.add(f);
  return () => {
    c.ouvintes.delete(f);
    if (!c.ouvintes.size) c.parar();
  };
}
export function estadoDaLeitura() {
  return obter()?.estado ?? LEITURA_INICIAL;
}
export function interromperLeituraDoChat(avisarSessao = false) {
  const c = obter();
  c?.parar();
  if (avisarSessao && typeof window !== 'undefined') {
    if (c) {
      c.publicar({ sessaoAlterada: false });
      c.atualizarVoz();
    }
    if (typeof BroadcastChannel !== 'undefined') {
      const canal = new BroadcastChannel('lyra-leitura-local');
      canal.postMessage({
        tipo: 'sessao',
        origem: c?.origem ?? crypto.randomUUID(),
      });
      canal.close();
    }
  }
}
export function pararLeituraDaResposta(id: string) {
  obter()?.pararSeFor(id);
}
export function iniciarLeituraDaResposta(id: string, texto: string) {
  obter(true)?.iniciar(id, texto);
}
export function pausarLeitura() {
  obter()?.pausar();
}
export function retomarLeitura() {
  obter()?.retomar();
}
export function mudarVelocidade(v: number) {
  obter(true)?.velocidade(v);
}
