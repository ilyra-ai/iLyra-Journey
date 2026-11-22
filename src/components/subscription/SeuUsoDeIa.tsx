'use client';

import { useCallback } from 'react';
import { Sparkles } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { buscarJson } from '@/lib/http/transporte';

interface Uso {
  mes: string;
  chamadas: number;
  tokensEntrada: number;
  tokensSaida: number;
  chamadasLocais: number;
}

const inteiro = new Intl.NumberFormat('pt-BR');

/**
 * Uso de IA da própria conta no mês (tarefa 163). Os dois valores de
 * contribuição têm o mesmo limite; aqui a pessoa vê quanto já usou.
 */
export function SeuUsoDeIa() {
  const { session } = useAuth();
  const pedir = useCallback(async () => {
    const resposta = await buscarJson('/api/account/uso-de-ia', {
      cache: 'no-store',
    });
    if (!resposta.ok) throw new Error(resposta.falha.message);
    return resposta.corpo as Uso;
  }, []);
  const { data } = useKeyedResource<Uso | null>(
    session ? `meu-uso-ia:${session.user.id}` : null,
    pedir,
    () => undefined,
    null
  );
  if (!data) return null;
  const [ano, mes] = data.mes.split('-');
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles aria-hidden="true" className="size-5" />
          Seu uso de IA em {mes}/{ano}
        </CardTitle>
        <CardDescription>
          O limite é o mesmo nos dois valores de contribuição. Respostas da Lyra
          sem modelo de IA não entram nesta conta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-muted-foreground">
              Respostas de modelos
            </dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {inteiro.format(data.chamadas)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Tokens lidos</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {inteiro.format(data.tokensEntrada)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Tokens escritos</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {inteiro.format(data.tokensSaida)}
            </dd>
          </div>
        </dl>
        {data.chamadasLocais ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {inteiro.format(data.chamadasLocais)} dessas respostas vieram de
            modelos que rodam no servidor da Lyra, sem enviar seus dados para
            fora.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
