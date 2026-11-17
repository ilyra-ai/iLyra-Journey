import { describe, expect, it } from 'vitest';

import {
  assinaturaDaProposta,
  conferirPropostas,
  type DadosDaRecomendacao,
  type Decisao,
  idDoNome,
  INSTRUCOES_DA_ATUALIZACAO,
  recomendacaoSchema,
  resultadoDaAtualizacaoSchema,
  tarefaDaAtualizacao,
} from './atualizacao';
import type { Recomendacao } from './plano';

const PAGINA = 'https://www.gov.br/inca/pt-br/mama';

const MAMOGRAFIA: Recomendacao & { ativo: boolean } = {
  id: 'mamografia',
  nome: 'Mamografia',
  procura: 'câncer de mama em fase inicial',
  publico: 'mamas',
  idadeMinima: 50,
  idadeMaxima: 74,
  intervaloMeses: 24,
  tipo: 'rotina',
  orientacao: 'Recomendada a cada dois anos dos 50 aos 74 anos.',
  historicoRelevante: ['cancer-mama', 'cancer-ovario'],
  fonteNome: 'INCA, detecção precoce',
  fonteUrl: PAGINA,
  conferido: true,
  revisadoEm: '2026-11-01T00:00:00.000Z',
  ordem: 10,
  ativo: true,
};
const PSA: Recomendacao & { ativo: boolean } = {
  ...MAMOGRAFIA,
  id: 'psa',
  nome: 'PSA (câncer de próstata)',
  publico: 'prostata',
  tipo: 'conversa',
  ativo: false,
};

function dadosDe(
  r: Recomendacao,
  mudancas: Partial<DadosDaRecomendacao> = {}
): DadosDaRecomendacao {
  return {
    nome: r.nome,
    procura: r.procura,
    publico: r.publico,
    idadeMinima: r.idadeMinima,
    idadeMaxima: r.idadeMaxima,
    intervaloMeses: r.intervaloMeses,
    tipo: r.tipo,
    orientacao: r.orientacao,
    historicoRelevante: [...r.historicoRelevante],
    fonteNome: r.fonteNome,
    fonteUrl: r.fonteUrl,
    ...mudancas,
  };
}

const NOVO_EXAME = dadosDe(MAMOGRAFIA, {
  nome: 'Exame de vista (acuidade visual)',
  procura: 'dificuldade de enxergar que pode ser corrigida',
  publico: 'todos',
  idadeMinima: 40,
  idadeMaxima: null,
  intervaloMeses: 24,
  historicoRelevante: [],
});

function conferir(
  propostas: unknown[],
  opcoes: {
    lidas?: string[];
    existentes?: string[];
    decisoes?: Decisao[];
  } = {}
) {
  return conferirPropostas(resultadoDaAtualizacaoSchema.parse({ propostas }), {
    catalogo: [MAMOGRAFIA, PSA],
    fontesLidas: (opcoes.lidas ?? [PAGINA]).map((url) => ({ url })),
    assinaturasExistentes: new Set(opcoes.existentes ?? []),
    decisoes: opcoes.decisoes ?? [],
  });
}

describe('Formato do resultado do modelo', () => {
  it('aceita a recomendação completa e recusa faixa invertida ou http', () => {
    expect(recomendacaoSchema.safeParse(dadosDe(MAMOGRAFIA)).success).toBe(
      true
    );
    expect(
      recomendacaoSchema.safeParse(
        dadosDe(MAMOGRAFIA, { idadeMinima: 80, idadeMaxima: 74 })
      ).success
    ).toBe(false);
    expect(
      recomendacaoSchema.safeParse(
        dadosDe(MAMOGRAFIA, { fonteUrl: 'http://www.gov.br/inca' })
      ).success
    ).toBe(false);
    expect(
      resultadoDaAtualizacaoSchema.safeParse({
        propostas: [
          { tipo: 'apagar', id: 'mamografia', motivo: 'x'.repeat(20) },
        ],
      }).success
    ).toBe(false);
  });

  it('a instrução manda ler primeiro o catálogo e proíbe excluir', () => {
    expect(INSTRUCOES_DA_ATUALIZACAO).toMatch(/Etapa 1 — leia o catálogo/);
    expect(INSTRUCOES_DA_ATUALIZACAO).toMatch(/Você não exclui exames/);
    expect(INSTRUCOES_DA_ATUALIZACAO).toContain('cancer-colorretal');
  });

  it('a tarefa leva o catálogo e as decisões já tomadas', () => {
    const tarefa = tarefaDaAtualizacao(
      [MAMOGRAFIA],
      [
        {
          tipo: 'novo',
          recomendacaoId: 'exame-de-vista',
          nome: 'Exame de vista',
          situacao: 'reprovada',
          assinatura: 'a'.repeat(64),
        },
      ]
    );
    expect(tarefa).toContain('"id": "mamografia"');
    expect(tarefa).toContain(
      '- novo "Exame de vista" (exame-de-vista): reprovada pelo administrador'
    );
  });
});

describe('Conferência das propostas', () => {
  it('aceita atualização, exame novo e retirada comprovados por página lida', () => {
    const { aceitas, descartadas } = conferir([
      {
        tipo: 'atualizar',
        id: 'mamografia',
        motivo: 'O INCA ampliou a faixa etária em 2025.',
        dados: dadosDe(MAMOGRAFIA, { idadeMinima: 40 }),
      },
      {
        tipo: 'novo',
        motivo: 'Recomendação oficial que falta no catálogo.',
        dados: NOVO_EXAME,
      },
    ]);
    expect(descartadas).toEqual([]);
    expect(aceitas.map((a) => [a.tipo, a.recomendacaoId])).toEqual([
      ['atualizar', 'mamografia'],
      ['novo', 'exame-de-vista-acuidade-visual'],
    ]);
    expect(aceitas[0].fonteUrl).toBe(PAGINA);
  });

  it('descarta página não lida, exame inexistente, nada mudado e duplicatas', () => {
    const { aceitas, descartadas } = conferir(
      [
        {
          tipo: 'atualizar',
          id: 'mamografia',
          motivo: 'Fonte inventada pelo modelo.',
          dados: dadosDe(MAMOGRAFIA, {
            idadeMinima: 45,
            fonteUrl: 'https://www.gov.br/inca/nunca-lida',
          }),
        },
        {
          tipo: 'atualizar',
          id: 'nao-existe',
          motivo: 'Exame que não está no catálogo.',
          dados: dadosDe(MAMOGRAFIA),
        },
        {
          tipo: 'atualizar',
          id: 'mamografia',
          motivo: 'Mesmo conteúdo do catálogo, em outra ordem.',
          dados: dadosDe(MAMOGRAFIA, {
            historicoRelevante: ['cancer-ovario', 'cancer-mama'],
          }),
        },
        {
          tipo: 'novo',
          motivo: 'Mamografia de novo, como se fosse nova.',
          dados: dadosDe(MAMOGRAFIA, { nome: 'MAMOGRAFIA' }),
        },
        {
          tipo: 'retirar',
          id: 'psa',
          motivo: 'Já está retirado do catálogo.',
          fonteNome: 'INCA, câncer de próstata',
          fonteUrl: PAGINA,
        },
        {
          tipo: 'novo',
          motivo: 'Recomendação oficial que falta no catálogo.',
          dados: NOVO_EXAME,
        },
        {
          tipo: 'novo',
          motivo: 'A mesma proposta repetida pelo modelo.',
          dados: NOVO_EXAME,
        },
      ],
      { lidas: [`${PAGINA}/`, 'https://gov.br/inca/pt-br/mama#topo'] }
    );
    expect(descartadas.map((d) => d.motivo)).toEqual([
      'cita uma página que não foi lida na pesquisa',
      'o exame não existe no catálogo',
      'não muda nada no exame',
      'o exame já está no catálogo',
      'o exame já está retirado',
      'já foi apresentada ao administrador',
    ]);
    expect(aceitas).toHaveLength(1);
  });

  it('proposta decidida pelo administrador não volta', () => {
    const atualizacao = dadosDe(MAMOGRAFIA, { idadeMinima: 40 });
    const assinatura = assinaturaDaProposta(
      'atualizar',
      'mamografia',
      atualizacao
    );
    const { aceitas, descartadas } = conferir(
      [
        {
          tipo: 'atualizar',
          id: 'mamografia',
          motivo: 'A mesma atualização já decidida.',
          dados: {
            ...atualizacao,
            historicoRelevante: [...atualizacao.historicoRelevante].reverse(),
          },
        },
        {
          tipo: 'novo',
          motivo: 'Exame reprovado antes, agora com outro texto.',
          dados: { ...NOVO_EXAME, procura: 'outra explicação do mesmo exame' },
        },
        {
          tipo: 'retirar',
          id: 'mamografia',
          motivo: 'Retirada já reprovada antes.',
          fonteNome: 'INCA, câncer de próstata',
          fonteUrl: PAGINA,
        },
      ],
      {
        existentes: [assinatura],
        decisoes: [
          {
            tipo: 'novo',
            recomendacaoId: 'exame-de-vista-acuidade-visual',
            nome: NOVO_EXAME.nome,
            situacao: 'reprovada',
            assinatura: 'b'.repeat(64),
          },
          {
            tipo: 'retirar',
            recomendacaoId: 'mamografia',
            nome: 'Mamografia',
            situacao: 'reprovada',
            assinatura: 'c'.repeat(64),
          },
        ],
      }
    );
    expect(aceitas).toEqual([]);
    expect(descartadas.map((d) => d.motivo)).toEqual([
      'já foi apresentada ao administrador',
      'já foi decidido pelo administrador',
      'já foi decidido pelo administrador',
    ]);
  });

  it('cria identificadores curtos a partir do nome', () => {
    expect(idDoNome('Teste de DNA-HPV (ou Papanicolau)')).toBe(
      'teste-de-dna-hpv-ou-papanicolau'
    );
    expect(idDoNome('Glicemia de jejum e hemoglobina glicada (HbA1c)')).toBe(
      'glicemia-de-jejum-e-hemoglobina-glicada'
    );
    expect(
      idDoNome('Glicemia de jejum e hemoglobina glicada (HbA1c)').length
    ).toBeLessThanOrEqual(40);
  });
});

describe('Esquema imposto na conclusão', () => {
  it('fonteUrl só aceita as páginas lidas; sem página lida, nenhuma proposta', async () => {
    const { esquemaDoResultado } = await import('./atualizacao-servico');
    const esquema = JSON.stringify(
      esquemaDoResultado([{ url: PAGINA }, { url: PAGINA }])
    );
    const fontes = [...esquema.matchAll(/"fonteUrl":(\{[^}]*\})/g)].map(
      (m) => m[1]
    );
    // atualizar e novo (em dados) e retirar.
    expect(fontes).toHaveLength(3);
    for (const fonte of fontes) {
      expect(JSON.parse(fonte)).toEqual({ type: 'string', enum: [PAGINA] });
    }
    const vazio = esquemaDoResultado([]) as {
      properties: { propostas: unknown };
    };
    expect(vazio.properties.propostas).toEqual({ type: 'array', maxItems: 0 });
  });
});

describe('Mensagem da atualização', () => {
  it('encurta sem partir palavra e marca o corte', async () => {
    const { caber } = await import('./atualizacao-servico');
    expect(caber('curta', 600)).toBe('curta');
    const longa = `${'palavra '.repeat(80)}fim`;
    const curta = caber(longa, 600);
    expect(curta.length).toBeLessThanOrEqual(600);
    expect(curta.endsWith('palavra…')).toBe(true);
    expect(caber('a reforça início do rastreamento', 20)).toBe(
      'a reforça início…'
    );
  });
});
