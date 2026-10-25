'use client';
import { useState, type ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
/** Mesmos primitivos da Gestão de Conteúdo; mantém estados das abas visitadas. */
export function AdminDashboardTabs({
  visaoGeral,
  abas = [],
}: {
  visaoGeral: ReactNode;
  abas?: { chave: string; nome: string; conteudo: ReactNode }[];
}) {
  const todas = [
    { chave: 'visao-geral', nome: 'Visão geral', conteudo: visaoGeral },
    ...abas,
  ];
  const router = useRouter(),
    params = useSearchParams(),
    pathname = usePathname();
  const pedida = params.get('aba') ?? 'visao-geral',
    selecionada = todas.some((a) => a.chave === pedida)
      ? pedida
      : 'visao-geral';
  const [visitadas, setVisitadas] = useState<string[]>([]);
  function mudar(value: string) {
    setVisitadas((v) => [...new Set([...v, selecionada, value])]);
    const q = new URLSearchParams(params);
    q.set('aba', value);
    router.replace(pathname + '?' + q.toString(), { scroll: false });
  }
  return (
    <Tabs value={selecionada} onValueChange={mudar}>
      <TabsList className="flex h-auto w-full flex-wrap justify-start">
        {todas.map((a) => (
          <TabsTrigger key={a.chave} value={a.chave}>
            {a.nome}
          </TabsTrigger>
        ))}
      </TabsList>
      {todas.map((a) => (
        <TabsContent
          key={a.chave}
          value={a.chave}
          forceMount={visitadas.includes(a.chave) ? true : undefined}
          hidden={a.chave !== selecionada}
          className={a.chave === selecionada ? 'mt-6' : 'hidden'}
        >
          {a.conteudo}
        </TabsContent>
      ))}
    </Tabs>
  );
}
