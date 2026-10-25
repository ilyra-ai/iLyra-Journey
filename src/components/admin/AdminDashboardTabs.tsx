'use client';
import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
/** Mesmos primitivos e disposição da Gestão de Conteúdo. Abas só entram com conteúdo implementado. */
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
  return (
    <Tabs defaultValue="visao-geral">
      <TabsList className="flex h-auto w-full flex-wrap justify-start">
        {todas.map((a) => (
          <TabsTrigger key={a.chave} value={a.chave}>
            {a.nome}
          </TabsTrigger>
        ))}
      </TabsList>
      {todas.map((a) => (
        <TabsContent key={a.chave} value={a.chave} className="mt-6">
          {a.conteudo}
        </TabsContent>
      ))}
    </Tabs>
  );
}
