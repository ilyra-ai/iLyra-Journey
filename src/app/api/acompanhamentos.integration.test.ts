import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  criarUsuario,
  contar,
  definirDireito,
} from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { executeStatement } from '@/lib/mysql/pool';
import {
  agirNoAcompanhamento,
  criarAcompanhamento,
  editarAcompanhamento,
  excluirAcompanhamento,
  excluirRegistro,
  lerAcompanhamento,
  listarAcompanhamentos,
  reordenarAcompanhamentos,
  salvarRegistro,
} from '@/lib/acompanhamentos/servico';
import {
  LIMITE_DE_ACOMPANHAMENTOS,
  type DadosDoAcompanhamento,
  type DadosDoRegistro,
} from '@/lib/acompanhamentos/esquema';
import { exportarDadosDoTitular, excluirConta } from '@/lib/lgpd/conta';
import { dataLocal } from '@/lib/astrology/tempo';
import { somarDias } from '@/lib/acontecimentos/analise';
import * as central from './acompanhamentos/route';
import * as ordem from './acompanhamentos/ordem/route';
import * as individual from './acompanhamentos/[id]/route';
import * as registros from './acompanhamentos/[id]/registros/[data]/route';
import * as relatorio from './relatorio-pessoal/route';
import * as relatorioPdf from './relatorio-pessoal/pdf/route';
import {
  montarRelatorio,
  opcoesDoRelatorio,
} from '@/lib/relatorio-pessoal/servico';
import { gerarPdfPessoal } from '@/lib/relatorio-pessoal/pdf';
import type { Selecao } from '@/lib/relatorio-pessoal/esquema';

// Quinta-feira, 29/10/2026, meio-dia UTC (o perfil de teste não tem local e usa UTC).
const agora = new Date('2026-10-29T12:00:00Z');
const escala15 = {
  minimo: 1 as const,
  maximo: 5,
  rotulos: [
    { valor: 1, rotulo: 'Muito baixa' },
    { valor: 5, rotulo: 'Muito alta' },
  ],
};
const novo = (
  extra: Partial<DadosDoAcompanhamento> = {}
): DadosDoAcompanhamento => ({
  pedidoId: randomUUID(),
  nome: 'Concentração',
  descricao: 'Como percebi meu foco',
  frequencia: 'diaria',
  escala: escala15,
  ...extra,
});
const resposta = (
  data: string,
  valor: number,
  extra: Partial<DadosDoRegistro> = {}
): DadosDoRegistro => ({
  idRegistro: randomUUID(),
  data,
  valor,
  nota: '',
  versao: 0,
  ...extra,
});
async function recurso(habilitado: boolean, chave: string, quota?: number) {
  await executeStatement(
    `UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=?${quota === undefined ? '' : ',e.quota_value=?'} WHERE p.plan_key='free' AND f.feature_key=?`,
    quota === undefined ? [habilitado, chave] : [habilitado, quota, chave]
  );
}

describe('acompanhamentos pessoais persistidos com MySQL real', () => {
  // Os testes de janela usam o histórico de 30 dias do Free; desde a tarefa
  // 224 a matriz parte do acesso do Care, então o limite é declarado aqui.
  let restaurarJanela: () => Promise<void>;
  beforeAll(async () => {
    restaurarJanela = await definirDireito('free', 'metrics_history_days', {
      enabled: true,
      quota: 30,
      reset: 'rolling',
    });
  });
  afterAll(async () => {
    await restaurarJanela();
  });
  it('exige sessão em todas as leituras e mutações', async () => {
    for (const [h, m] of [
      [central.GET, 'GET'],
      [central.POST, 'POST'],
      [ordem.PUT, 'PUT'],
      [individual.GET, 'GET'],
      [individual.PATCH, 'PATCH'],
      [individual.POST, 'POST'],
      [individual.DELETE, 'DELETE'],
      [registros.PUT, 'PUT'],
      [registros.DELETE, 'DELETE'],
    ] as const)
      expect(
        (
          await chamar(h, {
            usuario: null,
            method: m,
            params: { id: randomUUID(), data: '2026-10-29' },
            ...(m === 'GET' ? {} : { body: {} }),
          })
        ).status
      ).toBe(401);
  });

  it('cria com idempotência, inclusive simultânea, e valida a escala no servidor', async () => {
    const u = await criarUsuario(),
      p = novo();
    const rs = await Promise.all(
      Array.from({ length: 5 }, () => criarAcompanhamento(u.session, p, agora))
    );
    expect(new Set(rs.map((r) => r.id)).size).toBe(1);
    expect(rs.filter((r) => r.criado)).toHaveLength(1);
    await expect(
      criarAcompanhamento(u.session, { ...p, nome: 'Outro' }, agora)
    ).rejects.toMatchObject({ statusCode: 409 });
    const c = await listarAcompanhamentos(u.session, agora);
    expect(c.acompanhamentos).toHaveLength(1);
    expect(c.acompanhamentos[0]).toMatchObject({
      nome: 'Concentração',
      descricao: 'Como percebi meu foco',
      arquivado: false,
      versao: 1,
      registros: 0,
      ultimoRegistro: null,
      periodoAtual: '2026-10-29',
      respondidoNoPeriodoAtual: false,
      definicao: { sequencia: 1, frequencia: 'diaria', escala: escala15 },
    });
    for (const escala of [
      { minimo: 1, maximo: 1, rotulos: [{ valor: 1, rotulo: 'Só' }] },
      { minimo: 0, maximo: 11, rotulos: [] },
      { minimo: 1, maximo: 5, rotulos: [{ valor: 1, rotulo: 'Baixa' }] },
      {
        minimo: 1,
        maximo: 3,
        rotulos: [
          { valor: 1, rotulo: 'a' },
          { valor: 3, rotulo: 'b' },
          { valor: 4, rotulo: 'fora' },
        ],
      },
    ])
      expect(
        (
          await chamar(central.POST, {
            usuario: u,
            method: 'POST',
            body: { ...novo(), escala },
          })
        ).status
      ).toBe(400);
    const ok = await chamar(central.POST, {
      usuario: u,
      method: 'POST',
      body: novo({
        nome: 'Motivação',
        frequencia: 'semanal',
        escala: {
          minimo: 0,
          maximo: 1,
          rotulos: [
            { valor: 0, rotulo: 'Não' },
            { valor: 1, rotulo: 'Sim' },
          ],
        },
      }),
    });
    expect(ok.status).toBe(201);
    const lista = await chamar(central.GET, { usuario: u });
    expect(lista.status).toBe(200);
    expect(lista.headers.get('cache-control')).toBe('private, no-store');
  });

  it('registra, edita, preserva a escala antiga e representa ausências', async () => {
    const u = await criarUsuario(),
      { id } = await criarAcompanhamento(u.session, novo(), agora);
    const r1 = resposta('2026-10-27', 4, { nota: 'Manhã tranquila' });
    expect(await salvarRegistro(u.id, id, r1, agora)).toEqual({
      salvo: true,
      versao: 1,
    });
    // Repetição idêntica não cria outra versão.
    expect(await salvarRegistro(u.id, id, r1, agora)).toEqual({
      salvo: false,
      versao: 1,
    });
    // Versão desatualizada e outra identidade para o mesmo dia são recusadas.
    await expect(
      salvarRegistro(u.id, id, { ...r1, valor: 5, versao: 0 }, agora)
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      salvarRegistro(u.id, id, resposta('2026-10-27', 2), agora)
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(
      await salvarRegistro(u.id, id, { ...r1, valor: 5, versao: 1 }, agora)
    ).toEqual({ salvo: true, versao: 2 });
    // Fora da escala, data futura e fora do histórico do plano (30 dias).
    await expect(
      salvarRegistro(u.id, id, resposta('2026-10-28', 6), agora)
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      salvarRegistro(u.id, id, resposta('2026-10-30', 3), agora)
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      salvarRegistro(u.id, id, resposta('2026-09-01', 3), agora)
    ).rejects.toMatchObject({ statusCode: 403 });
    await salvarRegistro(u.id, id, resposta('2026-10-29', 1), agora);

    // Mudar a escala cria nova definição e não converte respostas antigas.
    const e = await editarAcompanhamento(
      u.id,
      id,
      {
        versao: 1,
        nome: 'Concentração no trabalho',
        descricao: '',
        frequencia: 'diaria',
        escala: {
          minimo: 0,
          maximo: 10,
          rotulos: [
            { valor: 0, rotulo: 'Nada' },
            { valor: 10, rotulo: 'Total' },
          ],
        },
      },
      agora
    );
    expect(e).toEqual({ novaDefinicao: true, versao: 2 });
    await expect(
      editarAcompanhamento(
        u.id,
        id,
        {
          versao: 1,
          nome: 'x',
          descricao: '',
          frequencia: 'diaria',
          escala: escala15,
        },
        agora
      )
    ).rejects.toMatchObject({ statusCode: 409 });
    await salvarRegistro(u.id, id, resposta('2026-10-28', 8), agora);
    const d = await lerAcompanhamento(u.id, id, null, agora);
    expect(d.definicoes.map((x) => x.sequencia)).toEqual([1, 2]);
    expect(d.acompanhamento).toMatchObject({
      nome: 'Concentração no trabalho',
      descricao: '',
      registros: 3,
      respondidoNoPeriodoAtual: true,
      ultimoRegistro: {
        data: '2026-10-29',
        valor: 1,
        rotulo: '1 · Muito baixa',
      },
    });
    expect(
      d.registros.map((r) => [r.data, r.valor, r.rotulo, r.definicaoAnterior])
    ).toEqual([
      ['2026-10-27', 5, '5 · Muito alta', true],
      ['2026-10-28', 8, '8', false],
      ['2026-10-29', 1, '1 · Muito baixa', true],
    ]);
    expect(d.registros[0].nota).toBe('Manhã tranquila');
    // Ausência: dias desde a criação (29/10) ou primeira resposta (27/10) sem registro.
    expect(d.periodos).toEqual(['2026-10-27', '2026-10-28', '2026-10-29']);
    expect(d.semRegistro).toBe(0);
    expect(d.resumos).toEqual([
      expect.objectContaining({ sequencia: 1, respostas: 2, mediana: 3 }),
      expect.objectContaining({
        sequencia: 2,
        respostas: 1,
        minimo: 8,
        maximo: 8,
      }),
    ]);
    const janela = await lerAcompanhamento(
      u.id,
      id,
      { inicio: '2026-10-20', fim: '2026-10-29' },
      agora
    );
    expect(janela.periodos[0]).toBe('2026-10-27');
    await expect(
      lerAcompanhamento(
        u.id,
        id,
        { inicio: '2026-09-01', fim: '2026-10-01' },
        agora
      )
    ).rejects.toMatchObject({ statusCode: 403 });

    // Responder de novo um dia antigo usa a escala atual.
    const antigo = d.registros[0];
    await salvarRegistro(
      u.id,
      id,
      {
        ...resposta('2026-10-27', 9),
        idRegistro: antigo.idRegistro,
        versao: 2,
      },
      agora
    );
    const d2 = await lerAcompanhamento(u.id, id, null, agora);
    expect(d2.registros[0]).toMatchObject({
      valor: 9,
      definicaoAnterior: false,
      versao: 3,
    });

    // Excluir resposta exige identidade e versão; a ausência volta a aparecer.
    await expect(
      excluirRegistro(u.id, id, '2026-10-28', randomUUID(), 1, agora)
    ).rejects.toMatchObject({ statusCode: 409 });
    await excluirRegistro(
      u.id,
      id,
      '2026-10-28',
      d2.registros[1].idRegistro,
      1,
      agora
    );
    const d3 = await lerAcompanhamento(u.id, id, null, agora);
    expect(d3.semRegistro).toBe(1);
    await expect(
      excluirRegistro(
        u.id,
        id,
        '2026-10-28',
        d2.registros[1].idRegistro,
        1,
        agora
      )
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('usa a segunda-feira nos semanais e preserva respostas diárias ao trocar a frequência', async () => {
    const u = await criarUsuario(),
      { id } = await criarAcompanhamento(
        u.session,
        novo({ frequencia: 'semanal' }),
        agora
      );
    await expect(
      salvarRegistro(u.id, id, resposta('2026-10-28', 3), agora)
    ).rejects.toMatchObject({ statusCode: 400 });
    await salvarRegistro(u.id, id, resposta('2026-10-26', 3), agora);
    await salvarRegistro(u.id, id, resposta('2026-10-19', 2), agora);
    let d = await lerAcompanhamento(u.id, id, null, agora);
    expect(d.acompanhamento.periodoAtual).toBe('2026-10-26');
    expect(d.acompanhamento.respondidoNoPeriodoAtual).toBe(true);
    expect(d.periodos).toEqual(['2026-10-19', '2026-10-26']);
    await editarAcompanhamento(
      u.id,
      id,
      {
        versao: 1,
        nome: 'Concentração',
        descricao: '',
        frequencia: 'diaria',
        escala: escala15,
      },
      agora
    );
    await salvarRegistro(u.id, id, resposta('2026-10-28', 4), agora);
    d = await lerAcompanhamento(u.id, id, null, agora);
    expect(d.definicoes.map((x) => x.frequencia)).toEqual([
      'semanal',
      'diaria',
    ]);
    expect(d.registros.map((r) => [r.data, r.definicaoAnterior])).toEqual([
      ['2026-10-19', true],
      ['2026-10-26', true],
      ['2026-10-28', false],
    ]);
  });

  it('arquiva, restaura, reorganiza e respeita o limite da conta', async () => {
    const u = await criarUsuario(),
      a = await criarAcompanhamento(u.session, novo({ nome: 'A' }), agora),
      b = await criarAcompanhamento(u.session, novo({ nome: 'B' }), agora),
      c = await criarAcompanhamento(u.session, novo({ nome: 'C' }), agora);
    await reordenarAcompanhamentos(u.id, [c.id, a.id, b.id], agora);
    expect(
      (await listarAcompanhamentos(u.session, agora)).acompanhamentos.map(
        (x) => x.nome
      )
    ).toEqual(['C', 'A', 'B']);
    await expect(
      reordenarAcompanhamentos(u.id, [c.id, a.id], agora)
    ).rejects.toMatchObject({ statusCode: 409 });
    await agirNoAcompanhamento(u.id, c.id, 'arquivar', 1, agora);
    await expect(
      agirNoAcompanhamento(u.id, c.id, 'arquivar', 2, agora)
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      salvarRegistro(u.id, c.id, resposta('2026-10-29', 3), agora)
    ).rejects.toMatchObject({ statusCode: 409 });
    let lista = (await listarAcompanhamentos(u.session, agora)).acompanhamentos;
    expect(lista.map((x) => [x.nome, x.arquivado])).toEqual([
      ['A', false],
      ['B', false],
      ['C', true],
    ]);
    // A ordem ativa enviada não inclui arquivados.
    await reordenarAcompanhamentos(u.id, [b.id, a.id], agora);
    await agirNoAcompanhamento(u.id, c.id, 'restaurar', 2, agora);
    lista = (await listarAcompanhamentos(u.session, agora)).acompanhamentos;
    expect(lista.map((x) => x.nome)).toEqual(['B', 'A', 'C']);
    const pelaRota = await chamar(ordem.PUT, {
      usuario: u,
      method: 'PUT',
      body: { ids: [a.id, b.id, c.id] },
    });
    expect(pelaRota.status).toBe(200);
    for (let i = 3; i < LIMITE_DE_ACOMPANHAMENTOS; i++)
      await criarAcompanhamento(u.session, novo({ nome: `N${i}` }), agora);
    await expect(
      criarAcompanhamento(u.session, novo(), agora)
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('isola cada titular nas rotas e nas consultas', async () => {
    const dono = await criarUsuario(),
      outro = await criarUsuario(),
      { id } = await criarAcompanhamento(dono.session, novo(), agora);
    const hoje = dataLocal(new Date(), 'UTC');
    const r = resposta(hoje, 3);
    expect(
      (
        await chamar(registros.PUT, {
          usuario: dono,
          method: 'PUT',
          params: { id, data: hoje },
          body: r,
        })
      ).status
    ).toBe(200);
    for (const [h, m, body] of [
      [individual.GET, 'GET', undefined],
      [
        individual.PATCH,
        'PATCH',
        {
          versao: 1,
          nome: 'x',
          descricao: '',
          frequencia: 'diaria',
          escala: escala15,
        },
      ],
      [individual.POST, 'POST', { acao: 'arquivar', versao: 1 }],
      [individual.DELETE, 'DELETE', { versao: 1 }],
      [registros.PUT, 'PUT', resposta(hoje, 2)],
      [registros.DELETE, 'DELETE', { idRegistro: r.idRegistro, versao: 1 }],
    ] as const)
      expect(
        (
          await chamar(h, {
            usuario: outro,
            method: m,
            params: { id, data: hoje },
            ...(body ? { body } : {}),
          })
        ).status
      ).toBe(404);
    expect(
      (
        await chamar(ordem.PUT, {
          usuario: outro,
          method: 'PUT',
          body: { ids: [id] },
        })
      ).status
    ).toBe(409);
    // Reusar o identificador de outra conta como pedido de criação é recusado.
    expect(
      (
        await chamar(central.POST, {
          usuario: outro,
          method: 'POST',
          body: novo({ pedidoId: id }),
        })
      ).status
    ).toBe(404);
    const lista = await chamar(central.GET, { usuario: outro });
    expect(
      (lista.json as { acompanhamentos: unknown[] }).acompanhamentos
    ).toHaveLength(0);
    const leitura = await chamar(individual.GET, {
      usuario: dono,
      params: { id },
      path: `/api/acompanhamentos/${id}?inicio=${somarDias(hoje, -6)}&fim=${hoje}`,
    });
    expect(leitura.status).toBe(200);
    expect(leitura.headers.get('cache-control')).toBe('private, no-store');
    expect(
      (
        await chamar(individual.GET, {
          usuario: dono,
          params: { id },
          path: `/api/acompanhamentos/${id}?inicio=${hoje}`,
        })
      ).status
    ).toBe(400);
    expect(
      (
        await chamar(registros.PUT, {
          usuario: dono,
          method: 'PUT',
          params: { id, data: hoje },
          body: { ...resposta(somarDias(hoje, -1), 2) },
        })
      ).status
    ).toBe(400);
  });

  it('respeita os recursos do plano, a exportação e a exclusão', async () => {
    const u = await criarUsuario(),
      { id } = await criarAcompanhamento(u.session, novo(), agora);
    await salvarRegistro(u.id, id, resposta('2026-10-29', 2), agora);
    const ex = await exportarDadosDoTitular(u.id);
    expect(ex.personal_trackers).toHaveLength(1);
    expect(ex.personal_tracker_definitions).toHaveLength(1);
    expect(ex.personal_tracker_entries).toHaveLength(1);
    for (const chave of ['wellbeing_assessments', 'metrics_history_days']) {
      await recurso(false, chave);
      try {
        expect((await chamar(central.GET, { usuario: u })).status).toBe(403);
        expect(
          (await chamar(individual.GET, { usuario: u, params: { id } })).status
        ).toBe(403);
      } finally {
        await recurso(true, chave);
      }
    }
    await executeStatement(
      'INSERT INTO daily_metrics(id,user_id,date,energy_level) VALUES(?,?,?,?)',
      [randomUUID(), u.id, '2026-10-29', 3]
    );
    await excluirAcompanhamento(u.id, id, 1);
    for (const tabela of [
      'personal_trackers',
      'personal_tracker_definitions',
      'personal_tracker_entries',
    ])
      expect(
        await contar(`SELECT COUNT(*) total FROM ${tabela} WHERE user_id=?`, [
          u.id,
        ])
      ).toBe(0);
    expect(
      await contar('SELECT COUNT(*) total FROM daily_metrics WHERE user_id=?', [
        u.id,
      ])
    ).toBe(1);
    const outro = await criarAcompanhamento(u.session, novo(), agora);
    await salvarRegistro(u.id, outro.id, resposta('2026-10-29', 3), agora);
    await excluirConta(u.id);
    for (const tabela of [
      'personal_trackers',
      'personal_tracker_definitions',
      'personal_tracker_entries',
    ])
      expect(
        await contar(`SELECT COUNT(*) total FROM ${tabela} WHERE user_id=?`, [
          u.id,
        ])
      ).toBe(0);
  });
  it('entra no relatório pessoal só por seleção explícita, com escala original e posse conferida', async () => {
    const u = await criarUsuario(),
      outro = await criarUsuario(),
      a = await criarAcompanhamento(u.session, novo(), agora),
      b = await criarAcompanhamento(
        u.session,
        novo({ nome: 'Motivação', frequencia: 'semanal' }),
        agora
      ),
      alheio = await criarAcompanhamento(outro.session, novo(), agora);
    await salvarRegistro(
      u.id,
      a.id,
      resposta('2026-10-27', 4, { nota: 'Foco bom' }),
      agora
    );
    await editarAcompanhamento(
      u.id,
      a.id,
      {
        versao: 1,
        nome: 'Concentração',
        descricao: '',
        frequencia: 'diaria',
        escala: {
          minimo: 0,
          maximo: 10,
          rotulos: [
            { valor: 0, rotulo: 'Nada' },
            { valor: 10, rotulo: 'Total' },
          ],
        },
      },
      agora
    );
    await salvarRegistro(u.id, a.id, resposta('2026-10-28', 7), agora);
    await salvarRegistro(u.id, b.id, resposta('2026-10-26', 1), agora);
    await agirNoAcompanhamento(u.id, b.id, 'arquivar', 1, agora);
    const o = await opcoesDoRelatorio(u.session, agora);
    expect(o.acompanhamentos).toEqual([
      { id: a.id, nome: 'Concentração', arquivado: false },
      { id: b.id, nome: 'Motivação', arquivado: true },
    ]);
    const base: Omit<Selecao, 'acompanhamentos'> = {
      alimentacao: false,
      inicio: '2026-10-20',
      fim: '2026-10-29',
      metricas: [],
      reflexoes: false,
      acontecimentos: false,
      notas: false,
    };
    const sem = await montarRelatorio(
      u.session,
      { ...base, metricas: ['sono'], acompanhamentos: [] },
      agora
    );
    expect(sem.acompanhamentos).toEqual([]);
    const r = await montarRelatorio(
      u.session,
      { ...base, acompanhamentos: [b.id, a.id] },
      agora
    );
    expect(r.acompanhamentos.map((x) => x.nome)).toEqual([
      'Concentração',
      'Motivação',
    ]);
    expect(r.acompanhamentos[0].respostas).toEqual([
      {
        data: '2026-10-27',
        frequencia: 'diaria',
        valor: 4,
        rotulo: '4',
        escala: '1 a 5',
      },
      {
        data: '2026-10-28',
        frequencia: 'diaria',
        valor: 7,
        rotulo: '7',
        escala: '0 a 10',
      },
    ]);
    expect(r.acompanhamentos[1].respostas[0]).toMatchObject({
      frequencia: 'semanal',
      rotulo: '1 · Muito baixa',
    });
    // A ordem da seleção não muda o digest; notas só entram por escolha.
    const invertida = await montarRelatorio(
      u.session,
      { ...base, acompanhamentos: [a.id, b.id] },
      agora
    );
    expect(invertida.revisao).toBe(r.revisao);
    const comNotas = await montarRelatorio(
      u.session,
      { ...base, notas: true, acompanhamentos: [a.id] },
      agora
    );
    expect(comNotas.acompanhamentos[0].respostas[0].nota).toBe('Foco bom');
    const pdf = await gerarPdfPessoal(comNotas);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    await expect(
      montarRelatorio(
        u.session,
        { ...base, acompanhamentos: [a.id, alheio.id] },
        agora
      )
    ).rejects.toMatchObject({ statusCode: 404 });
    // Seleção vazia de categorias continua recusada pela rota.
    expect(
      (
        await chamar(relatorio.POST, {
          usuario: u,
          method: 'POST',
          body: { ...base, inicio: '2026-10-25', fim: '2026-10-29' },
        })
      ).status
    ).toBe(400);
    await recurso(false, 'wellbeing_assessments');
    try {
      expect(
        (await opcoesDoRelatorio(u.session, agora)).acompanhamentos
      ).toEqual([]);
      await expect(
        montarRelatorio(u.session, { ...base, acompanhamentos: [a.id] }, agora)
      ).rejects.toMatchObject({ statusCode: 403 });
    } finally {
      await recurso(true, 'wellbeing_assessments');
    }
    // Alterar uma resposta selecionada invalida a prévia antes do PDF.
    const hoje = dataLocal(new Date(), 'UTC'),
      c = await criarAcompanhamento(u.session, novo({ nome: 'Hoje' })),
      reg = resposta(hoje, 2);
    await salvarRegistro(u.id, c.id, reg);
    const selecao = {
      ...base,
      inicio: somarDias(hoje, -6),
      fim: hoje,
      acompanhamentos: [c.id],
    };
    const previa = await chamar(relatorio.POST, {
      usuario: u,
      method: 'POST',
      body: selecao,
    });
    expect(previa.status).toBe(200);
    const corpo = previa.json as { selecao: unknown; revisao: string };
    const ok = await chamar(relatorioPdf.POST, {
      usuario: u,
      method: 'POST',
      body: { selecao: corpo.selecao, revisao: corpo.revisao },
    });
    expect(ok.status).toBe(200);
    await salvarRegistro(u.id, c.id, { ...reg, valor: 5, versao: 1 });
    expect(
      (
        await chamar(relatorioPdf.POST, {
          usuario: u,
          method: 'POST',
          body: { selecao: corpo.selecao, revisao: corpo.revisao },
        })
      ).status
    ).toBe(409);
  });
});
