'use client';
import { useAccountSubscription } from '@/hooks/use-account-subscription';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface AbaDoDia {
  chave: string;
  rotulo: string;
  icone: LucideIcon;
  conteudo: ReactNode;
  /** Âncoras (ids) que moram nesta aba, para links antigos como /dia#reflexao. */
  ancoras?: string[];
}

function abaDaUrl(abas: AbaDoDia[]) {
  if (typeof window === 'undefined') return abas[0].chave;
  const url = new URL(window.location.href),
    pedida = url.searchParams.get('aba'),
    ancora = url.hash.slice(1);
  if (pedida && abas.some((a) => a.chave === pedida)) return pedida;
  return (
    abas.find((a) => ancora && a.ancoras?.includes(ancora))?.chave ??
    abas[0].chave
  );
}

function rolarPara(id: string) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const alvo = document.getElementById(id);
      if (!alvo) return;
      const reduzir = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      alvo.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth' });
    })
  );
}

/**
 * Abas de /dia (tarefa 136). A aba ativa fica em `?aba=` (recarregar mantém a
 * aba) e as âncoras antigas abrem a aba onde a seção mora. Todas as abas
 * ficam montadas e só as inativas são ocultadas: dados, formulários em
 * andamento e âncoras continuam vivos ao alternar.
 */
export function AbasDoDia({ abas }: { abas: AbaDoDia[] }) {
  const { data } = useAccountSubscription();
  const permitidas = abas.filter(
    (aba) =>
      (aba.chave !== 'diario' || data?.gruposFuncionais?.diario_reflexao) &&
      (aba.chave !== 'horarios' || data?.gruposFuncionais?.calendario_agenda)
  );
  if (!permitidas.length) return null;
  return (
    <AbasAtivas
      key={permitidas.map((aba) => aba.chave).join(':')}
      abas={permitidas}
    />
  );
}

function AbasAtivas({ abas }: { abas: AbaDoDia[] }) {
  const [ativa, setAtiva] = useState(() => abaDaUrl(abas));

  // Mapa âncora → aba como texto: estável entre renderizações.
  const mapa = JSON.stringify(
    abas.flatMap((a) => (a.ancoras ?? []).map((id) => [id, a.chave]))
  );

  useEffect(() => {
    const ancora = window.location.hash.slice(1);
    if (ancora) rolarPara(ancora);
  }, []);

  useEffect(() => {
    const dono = new Map<string, string>(JSON.parse(mapa));
    const aoMudarHash = () => {
      const id = window.location.hash.slice(1),
        chave = dono.get(id);
      if (!chave) return;
      setAtiva(chave);
      rolarPara(id);
    };
    window.addEventListener('hashchange', aoMudarHash);
    return () => window.removeEventListener('hashchange', aoMudarHash);
  }, [mapa]);

  function escolher(chave: string) {
    setAtiva(chave);
    const url = new URL(window.location.href);
    url.searchParams.set('aba', chave);
    url.hash = '';
    window.history.replaceState(window.history.state, '', url);
  }

  return (
    <Tabs
      value={ativa}
      onValueChange={escolher}
      className="flex flex-col gap-6"
    >
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList aria-label="Seções do seu dia" className="w-max">
          {abas.map(({ chave, rotulo, icone: Icone }) => (
            <TabsTrigger key={chave} value={chave} className="gap-1.5">
              <Icone className="h-4 w-4" aria-hidden="true" />
              {rotulo}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {abas.map(({ chave, conteudo }) => (
        <TabsContent
          key={chave}
          value={chave}
          forceMount
          className="mt-0 flex flex-col gap-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring data-[state=inactive]:hidden"
        >
          {conteudo}
        </TabsContent>
      ))}
    </Tabs>
  );
}
