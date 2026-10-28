'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { Moon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { requisitar, erroNaPagina } from '@/components/experiencias/transporte';
import { EVENTO_DESCANSO } from '@/lib/descanso/evento';
import type { ResumoDoDescanso } from '@/lib/descanso/esquema';
import { dataBreve } from '@/components/acontecimentos/GraficoDosAcontecimentos';
const carregar = () => requisitar<ResumoDoDescanso>('/api/descanso?resumo=1');
export function EstadoDoDescanso() {
  const { session } = useAuth(),
    { data, error, refresh } = useKeyedResource<ResumoDoDescanso | null>(
      session?.user.id ?? null,
      carregar,
      erroNaPagina,
      null
    );
  useEffect(() => {
    if (!session) return;
    const atualizar = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const timer = window.setInterval(atualizar, 60000);
    window.addEventListener('focus', atualizar);
    window.addEventListener(EVENTO_DESCANSO, atualizar);
    document.addEventListener('visibilitychange', atualizar);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', atualizar);
      window.removeEventListener(EVENTO_DESCANSO, atualizar);
      document.removeEventListener('visibilitychange', atualizar);
    };
  }, [session, refresh]);
  if (error)
    return (
      <Alert>
        <AlertTitle>Estado do descanso indisponível</AlertTitle>
        <AlertDescription>
          Não foi possível conferir sua pausa.{' '}
          <Button asChild variant="link">
            <Link href="/descanso">Verificar descanso</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  const p = data?.atual;
  if (!p) return null;
  return (
    <Alert>
      <Moon aria-hidden="true" />
      <AlertTitle>
        {p.estado === 'agendada'
          ? 'Descanso agendado'
          : p.estado === 'retorno'
            ? 'Retorno gradual ativo'
            : 'Modo descanso ativo'}
      </AlertTitle>
      <AlertDescription>
        <p>
          {p.estado === 'agendada'
            ? `Começa em ${dataBreve(p.inicio)} (${p.fuso}).`
            : p.estado === 'retorno'
              ? `Até ${dataBreve(p.fimRetorno!)} (${p.fuso}), ${p.atividade ? 'no máximo um lembrete diário da atividade escolhida' : 'retorno sem lembretes automáticos'}.`
              : 'Os convites de bem-estar estão pausados. Seus registros e a assinatura comercial continuam preservados.'}
        </p>
        <Button asChild variant="link">
          <Link href="/descanso">Ver período e efeitos</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
