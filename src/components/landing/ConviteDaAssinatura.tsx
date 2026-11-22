'use client';

import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { guardarContribuicao } from '@/lib/auth/retorno';
import { marcarEtapa } from '@/lib/funil/cliente';
import { moedaPtBr } from '@/lib/formato/numero';
import type { PlanMatrixPlan } from '@/types/subscription';

interface Props {
  /** Mapa pago que a pessoa tentou abrir; `null` fecha o convite. */
  recurso: string | null;
  aoFechar: () => void;
  /** O plano com valores de colaboração, do catálogo público; `null` se indisponível. */
  plano: PlanMatrixPlan | null;
  /** Cadastro configurado no construtor (ex.: /login?modo=cadastro). */
  destinoDoCadastro: string;
  classeDoBotaoPrincipal: string;
  /** Conta as etapas no funil anônimo (tarefa 170); falso na prévia do editor. */
  medir?: boolean;
}

function comRetornoAosPlanos(destino: string) {
  if (!destino.startsWith('/login')) return destino;
  return `${destino}${destino.includes('?') ? '&' : '?'}destino=planos`;
}

/**
 * Convite "Uma Lyra para todos" (tarefa 161): ao clicar num mapa da
 * assinatura, o visitante vê os dois valores com o mesmo acesso e escolhe
 * com quanto colaborar. A escolha vai só como identificador da opção para a
 * aba e volta pré-selecionada em /planos depois do cadastro; o servidor
 * confere a opção de novo no checkout. Sem escassez, contagem regressiva
 * nem cartão antes da hora.
 */
export function ConviteDaAssinatura({
  recurso,
  aoFechar,
  plano,
  destinoDoCadastro,
  classeDoBotaoPrincipal,
  medir = false,
}: Props) {
  const router = useRouter();
  const destino = comRetornoAosPlanos(destinoDoCadastro);

  function escolher(chave: string) {
    if (medir) marcarEtapa('contribuicao_escolhida', chave);
    guardarContribuicao(chave);
    router.push(destino);
  }

  return (
    <Dialog
      open={recurso !== null}
      onOpenChange={(abrir) => {
        if (abrir) return;
        if (medir) marcarEtapa('modal_fechado');
        aoFechar();
      }}
    >
      <DialogContent className="max-w-[560px]">
        <DialogTitle className="pr-10 font-serif text-2xl">
          Uma Lyra para todos
        </DialogTitle>
        <DialogDescription>
          {recurso ? `O ${recurso} faz parte` : 'Este mapa faz parte'} do{' '}
          {plano?.name ?? 'plano da Lyra'}, com os mapas Védico, Lyra DM
          Samādhi, Quantum e Ocidental completo.
        </DialogDescription>
        <p className="leading-relaxed">
          O acesso é o mesmo nos dois valores. Você escolhe com quanto quer
          colaborar para manter e expandir a Lyra.
        </p>
        {plano && plano.contributionOptions.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {plano.contributionOptions.map((opcao) => (
              <button
                key={opcao.key}
                type="button"
                onClick={() => escolher(opcao.key)}
                className={classeDoBotaoPrincipal}
              >
                <Sparkles aria-hidden="true" className="size-4" />
                {moedaPtBr(opcao.monthlyPrice, plano.currencyCode)} por mês
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => router.push(destino)}
            className={classeDoBotaoPrincipal}
          >
            <Sparkles aria-hidden="true" className="size-4" />
            Ver os valores
          </button>
        )}
        <p className="text-sm text-muted-foreground">
          Depois de escolher, você cria a sua conta e confirma o valor. O
          pagamento só acontece na página segura de cobrança, e o mapa Ocidental
          continua gratuito no Experimente Grátis.
        </p>
      </DialogContent>
    </Dialog>
  );
}
