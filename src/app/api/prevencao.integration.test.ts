import { describe, expect, it } from 'vitest';

import { executeStatement, queryRows } from '@/lib/mysql/pool';
import type { PlanoComDados } from '@/lib/prevencao/servico';

import {
  criarUsuario,
  definirDireito,
} from '../../../tests/integration/fixtures';
import { PLANO_DE_BASE } from '@/types/subscription';
import { chamar } from '../../../tests/integration/http';
import { GET as catalogo, PATCH as revisar } from './admin/prevencao/route';
import { GET, PATCH } from './prevencao/route';

async function mulherDe52(id: string) {
  await executeStatement(
    "UPDATE profiles SET birth_date='1974-05-10', gender='female' WHERE id=?",
    [id]
  );
}

describe('Prevenção do titular', () => {
  it('recusa acesso anônimo', async () => {
    expect((await chamar(GET, { usuario: null })).status).toBe(401);
    expect(
      (
        await chamar(PATCH, {
          usuario: null,
          method: 'PATCH',
          body: { tipo: 'vinculo', vinculoId: 'pai', pesa: 'sim' },
        })
      ).status
    ).toBe(401);
  });

  it('monta o plano pela idade e pelo corpo, com o catálogo da migration', async () => {
    const pessoa = await criarUsuario();
    await mulherDe52(pessoa.id);
    const resposta = await chamar(GET, { usuario: pessoa });
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get('Cache-Control')).toBe('private, no-store');
    const plano = resposta.json as PlanoComDados;
    expect(plano.idade).toBeGreaterThanOrEqual(52);
    expect(plano.itens.map((i) => i.id)).toEqual([
      'mamografia',
      'dna-hpv',
      'sangue-oculto-fezes',
      'glicemia',
      'pressao-arterial',
      'perfil-lipidico',
    ]);
    expect(plano.itens.find((i) => i.id === 'mamografia')!.fonte.url).toMatch(
      /^https:\/\/www\.gov\.br\/inca\//
    );
    expect(plano.estresse).toBeNull();
    expect(plano.historico).toEqual([]);
  });

  it('registra exame, histórico e vínculo e devolve o plano atualizado', async () => {
    const pessoa = await criarUsuario();
    await mulherDe52(pessoa.id);
    const alterar = (body: unknown) =>
      chamar(PATCH, { usuario: pessoa, method: 'PATCH', body });

    const exame = await alterar({
      tipo: 'exame',
      recomendacaoId: 'mamografia',
      realizadoEm: '2025-03-01',
    });
    expect(exame.status).toBe(200);
    expect(
      (exame.json as PlanoComDados).itens.find((i) => i.id === 'mamografia')
    ).toMatchObject({ situacao: 'em-dia', proximoEm: '2027-03-01' });

    const historico = await alterar({
      tipo: 'historico',
      parente: 'mae',
      condicao: 'cancer-mama',
      presente: true,
    });
    expect((historico.json as PlanoComDados).historico).toEqual([
      { parente: 'mae', condicao: 'cancer-mama' },
    ]);

    const vinculo = await alterar({
      tipo: 'vinculo',
      vinculoId: 'pai',
      pesa: 'sim',
    });
    const comVinculo = vinculo.json as PlanoComDados;
    expect(comVinculo.estresse?.vinculos).toEqual(['Pai']);
    expect(comVinculo.vinculosRespondidos).toEqual({ pai: 'sim' });

    // Desfazer: apagar exame, tirar histórico, vínculo que não pesa.
    await alterar({
      tipo: 'exame',
      recomendacaoId: 'mamografia',
      realizadoEm: null,
    });
    await alterar({
      tipo: 'historico',
      parente: 'mae',
      condicao: 'cancer-mama',
      presente: false,
    });
    const final = (
      await alterar({ tipo: 'vinculo', vinculoId: 'pai', pesa: 'nao' })
    ).json as PlanoComDados;
    expect(final.historico).toEqual([]);
    expect(final.estresse).toBeNull();
    expect(final.itens.find((i) => i.id === 'mamografia')!.situacao).toBe(
      'pendente'
    );
  });

  it('recusa data futura, exame inexistente e corpo inválido', async () => {
    const pessoa = await criarUsuario();
    await mulherDe52(pessoa.id);
    const alterar = (body: unknown) =>
      chamar(PATCH, { usuario: pessoa, method: 'PATCH', body });
    expect(
      (
        await alterar({
          tipo: 'exame',
          recomendacaoId: 'mamografia',
          realizadoEm: '2999-01-01',
        })
      ).status
    ).toBe(400);
    expect(
      (
        await alterar({
          tipo: 'exame',
          recomendacaoId: 'nao-existe',
          realizadoEm: '2025-01-01',
        })
      ).status
    ).toBe(404);
    expect(
      (
        await alterar({
          tipo: 'historico',
          parente: 'vizinho',
          condicao: 'diabetes',
          presente: true,
        })
      ).status
    ).toBe(400);
    expect(
      (await alterar({ tipo: 'vinculo', vinculoId: 'primos', pesa: 'sim' }))
        .status
    ).toBe(400);
    expect(
      (
        await alterar({
          tipo: 'vinculo',
          vinculoId: 'pai',
          pesa: 'sim',
          userId: 'outro',
        })
      ).status
    ).toBe(400);
  });

  it('com só o mapa liberado (registro de saúde desligado) a prevenção abre, mas o histórico da família não', async () => {
    // Tarefa 213: a prevenção vive no diálogo dos vínculos do mapa
    // (`vedic_insights`); o histórico de saúde da família é do registro de
    // saúde (`daily_checkin`).
    const restaurarRegistro = await definirDireito(
      PLANO_DE_BASE,
      'daily_checkin',
      { enabled: false }
    );
    const restaurarMapa = await definirDireito(
      PLANO_DE_BASE,
      'vedic_insights',
      {
        enabled: true,
      }
    );
    try {
      const pessoa = await criarUsuario();
      await mulherDe52(pessoa.id);
      expect((await chamar(GET, { usuario: pessoa })).status).toBe(200);
      const alterar = (body: unknown) =>
        chamar(PATCH, { usuario: pessoa, method: 'PATCH', body });
      expect(
        (await alterar({ tipo: 'vinculo', vinculoId: 'mae', pesa: 'sim' }))
          .status
      ).toBe(200);
      expect(
        (
          await alterar({
            tipo: 'exame',
            recomendacaoId: 'mamografia',
            realizadoEm: '2025-03-01',
          })
        ).status
      ).toBe(200);
      expect(
        (
          await alterar({
            tipo: 'historico',
            parente: 'mae',
            condicao: 'diabetes',
            presente: true,
          })
        ).status
      ).toBe(403);

      // Sem nenhum dos dois, a prevenção fecha.
      const restaurarMapaDesligado = await definirDireito(
        PLANO_DE_BASE,
        'vedic_insights',
        { enabled: false }
      );
      try {
        expect((await chamar(GET, { usuario: pessoa })).status).toBe(403);
      } finally {
        await restaurarMapaDesligado();
      }
    } finally {
      await restaurarMapa();
      await restaurarRegistro();
    }
  });

  it('os dados de um titular não aparecem para outro', async () => {
    const ana = await criarUsuario();
    const bia = await criarUsuario();
    await mulherDe52(ana.id);
    await mulherDe52(bia.id);
    await chamar(PATCH, {
      usuario: ana,
      method: 'PATCH',
      body: {
        tipo: 'historico',
        parente: 'pai',
        condicao: 'diabetes',
        presente: true,
      },
    });
    const daBia = (await chamar(GET, { usuario: bia })).json as PlanoComDados;
    expect(daBia.historico).toEqual([]);
    const linhas = await queryRows<{ user_id: string }>(
      'SELECT user_id FROM prevencao_historico_familiar WHERE user_id IN (?, ?)',
      [ana.id, bia.id]
    );
    expect(linhas.map((l) => l.user_id)).toEqual([ana.id]);
  });
});

describe('Revisão mensal do catálogo pela administração', () => {
  it('só administradores leem e alteram o catálogo', async () => {
    const paciente = await criarUsuario();
    expect((await chamar(catalogo, { usuario: null })).status).toBe(401);
    expect((await chamar(catalogo, { usuario: paciente })).status).toBe(403);
    expect(
      (
        await chamar(revisar, {
          usuario: paciente,
          method: 'PATCH',
          body: { acao: 'confirmar-revisao' },
        })
      ).status
    ).toBe(403);
  });

  it('mostra as não conferidas, altera uma e confirma a revisão de todas', async () => {
    const admin = await criarUsuario('admin');
    const inicial = (await chamar(catalogo, { usuario: admin })).json as {
      vencida: boolean;
      naoConferidas: string[];
      catalogo: Array<{ id: string; conferido: boolean }>;
    };
    expect(inicial.vencida).toBe(true);
    expect(inicial.naoConferidas).toEqual([
      'pressao-arterial',
      'perfil-lipidico',
    ]);

    const alterar = (body: unknown) =>
      chamar(revisar, { usuario: admin, method: 'PATCH', body });
    expect(
      (await alterar({ acao: 'alterar', id: 'nao-existe', nome: 'Exame' }))
        .status
    ).toBe(404);
    expect(
      (
        await alterar({
          acao: 'alterar',
          id: 'pressao-arterial',
          fonteUrl: 'http://inseguro.example',
        })
      ).status
    ).toBe(400);
    expect(
      (
        await alterar({
          acao: 'alterar',
          id: 'pressao-arterial',
          idadeMinima: 40,
          idadeMaxima: 30,
        })
      ).status
    ).toBe(400);

    const alterada = await alterar({
      acao: 'alterar',
      id: 'pressao-arterial',
      intervaloMeses: 12,
    });
    expect(alterada.status).toBe(200);
    expect(
      (alterada.json as { naoConferidas: string[] }).naoConferidas
    ).toEqual(['perfil-lipidico']);

    const revisada = await alterar({ acao: 'confirmar-revisao' });
    const corpo = revisada.json as {
      vencida: boolean;
      naoConferidas: string[];
      venceEm: string;
    };
    expect(corpo.vencida).toBe(false);
    expect(corpo.naoConferidas).toEqual([]);
    const dias = (new Date(corpo.venceEm).getTime() - Date.now()) / 86_400_000;
    // venceEm vem do relógio do MySQL e Date.now() do relógio do Node; o
    // contêiner pode estar alguns milissegundos à frente (falhou com
    // 30,0000000116 dias, 1 ms). A tolerância de 5 s cobre só essa diferença.
    const TOLERANCIA_DO_RELOGIO = 5 / 86_400;
    expect(dias).toBeGreaterThan(29);
    expect(dias).toBeLessThanOrEqual(30 + TOLERANCIA_DO_RELOGIO);
    const [linha] = await queryRows<{ revisado_por: string }>(
      "SELECT revisado_por FROM prevencao_recomendacoes WHERE id = 'mamografia'"
    );
    expect(linha.revisado_por).toBe(admin.id);
  });
});
