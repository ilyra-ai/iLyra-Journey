import { beforeAll, describe, expect, it } from 'vitest';

import { GET as mapaNatal } from '@/app/api/astrologia/mapa/route';
import { calcularMapaNatal } from '@/lib/astrology/mapa-natal';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { SIGNOS_INFO } from '@/lib/lyra/conhecimento/jyotish';
import type { OpcoesDeHora } from '@/lib/perfil/hora-de-nascimento';

import {
  criarUsuario,
  type UsuarioDeTeste,
} from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { DELETE, GET, POST } from './hora-de-nascimento/route';

const SAO_PAULO = {
  latitude: -23.5505,
  longitude: -46.6333,
  fuso: 'America/Sao_Paulo',
};

async function definirNascimento(
  usuario: UsuarioDeTeste,
  hora: string | null,
  latitude = SAO_PAULO.latitude,
  fuso = SAO_PAULO.fuso
) {
  await executeStatement(
    `UPDATE profiles SET birth_date='1990-12-01', birth_time=?,
       birth_time_estimate=NULL, birth_location='Local de teste',
       birth_latitude=?, birth_longitude=?, birth_timezone=? WHERE id=?`,
    [hora, latitude, SAO_PAULO.longitude, fuso, usuario.id]
  );
}

async function horasDoPerfil(usuario: UsuarioDeTeste) {
  const [linha] = await queryRows<{
    birth_time: string | null;
    birth_time_estimate: string | null;
  }>('SELECT birth_time, birth_time_estimate FROM profiles WHERE id=?', [
    usuario.id,
  ]);
  return linha;
}

describe('Hora de nascimento estimada pelo titular', () => {
  let titular: UsuarioDeTeste;
  beforeAll(async () => {
    titular = await criarUsuario();
    await definirNascimento(titular, null);
  });

  it('recusa acesso anônimo nos três métodos', async () => {
    expect((await chamar(GET, { usuario: null })).status).toBe(401);
    expect(
      (
        await chamar(POST, {
          usuario: null,
          method: 'POST',
          body: { janela: '1990-12-01T03:00:00.000Z' },
        })
      ).status
    ).toBe(401);
    expect(
      (await chamar(DELETE, { usuario: null, method: 'DELETE' })).status
    ).toBe(401);
  });

  it('oferece horário e uma palavra por janela, sem termos técnicos', async () => {
    const resposta = await chamar(GET, { usuario: titular });
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get('Cache-Control')).toBe('private, no-store');
    const corpo = resposta.json as OpcoesDeHora;

    expect(corpo.situacao).toBe('desconhecida');
    expect(corpo.hora).toBeNull();
    expect(corpo.faltando).toEqual([]);
    expect(corpo.indisponivel).toBeNull();
    expect(corpo.opcoes.length).toBeGreaterThanOrEqual(12);
    expect(new Set(corpo.opcoes.map((o) => o.palavra))).toEqual(
      new Set(SIGNOS_INFO.map((s) => s.essencia))
    );
    for (const opcao of corpo.opcoes) {
      // Somente estes campos chegam ao navegador.
      expect(Object.keys(opcao).toSorted()).toEqual([
        'escolhida',
        'fim',
        'id',
        'inicio',
        'palavra',
      ]);
      expect(opcao.inicio).toMatch(/^\d{2}:\d{2}$/);
      expect(opcao.fim).toMatch(/^\d{2}:\d{2}$/);
      expect(opcao.palavra).toMatch(/^\p{Lu}\p{Ll}+$/u);
      expect(opcao.escolhida).toBe(false);
    }
  });

  it('grava a hora da janela escolhida, marca como estimada e o mapa natal a usa', async () => {
    const antes = (await chamar(GET, { usuario: titular }))
      .json as OpcoesDeHora;
    const escolhida = antes.opcoes[5];

    const resposta = await chamar(POST, {
      usuario: titular,
      method: 'POST',
      body: { janela: escolhida.id },
    });
    expect(resposta.status).toBe(200);
    const depois = resposta.json as OpcoesDeHora;
    expect(depois.situacao).toBe('estimada');
    expect(depois.opcoes.filter((o) => o.escolhida).map((o) => o.id)).toEqual([
      escolhida.id,
    ]);

    const gravado = await horasDoPerfil(titular);
    expect(gravado.birth_time).toBe(gravado.birth_time_estimate);
    expect(gravado.birth_time!.slice(0, 5)).toBe(depois.hora);
    expect(
      escolhida.inicio <= depois.hora! && depois.hora! < escolhida.fim
    ).toBe(true);

    // O mapa natal real do titular passa a ter Lagna e declara a estimativa.
    const esperado = calcularMapaNatal({
      data: '1990-12-01',
      hora: depois.hora,
      horaEstimada: true,
      ...SAO_PAULO,
    });
    const mapa = await chamar(mapaNatal, { usuario: titular });
    expect(mapa.status).toBe(200);
    expect(mapa.json).toMatchObject({
      mapa: {
        horaConhecida: true,
        precisaoDaHora: 'estimada',
        lagna: { signo: esperado.lagna!.nomeDoSigno },
      },
    });
    expect(SIGNOS_INFO[esperado.lagna!.signo].essencia).toBe(escolhida.palavra);
  });

  it('troca de janela, desfaz a estimativa e volta a hora desconhecida', async () => {
    const atual = (await chamar(GET, { usuario: titular }))
      .json as OpcoesDeHora;
    const outra = atual.opcoes.find((o) => !o.escolhida)!;
    const trocada = await chamar(POST, {
      usuario: titular,
      method: 'POST',
      body: { janela: outra.id },
    });
    expect(trocada.status).toBe(200);
    expect(
      (trocada.json as OpcoesDeHora).opcoes.find((o) => o.escolhida)?.id
    ).toBe(outra.id);

    const desfeita = await chamar(DELETE, {
      usuario: titular,
      method: 'DELETE',
    });
    expect(desfeita.status).toBe(200);
    expect(desfeita.json).toMatchObject({
      situacao: 'desconhecida',
      hora: null,
    });
    expect(await horasDoPerfil(titular)).toEqual({
      birth_time: null,
      birth_time_estimate: null,
    });
    const mapa = await chamar(mapaNatal, { usuario: titular });
    expect(mapa.json).toMatchObject({
      mapa: {
        horaConhecida: false,
        precisaoDaHora: 'desconhecida',
        lagna: null,
      },
    });
  });

  it('a hora digitada no perfil deixa de ser tratada como estimada', async () => {
    const pessoa = await criarUsuario();
    await definirNascimento(pessoa, null);
    const opcoes = (await chamar(GET, { usuario: pessoa }))
      .json as OpcoesDeHora;
    await chamar(POST, {
      usuario: pessoa,
      method: 'POST',
      body: { janela: opcoes.opcoes[2].id },
    });
    // Edição do perfil: outra hora, com a estimativa antiga ainda gravada.
    await executeStatement(
      "UPDATE profiles SET birth_time='10:30' WHERE id=?",
      [pessoa.id]
    );

    const resposta = await chamar(GET, { usuario: pessoa });
    expect(resposta.json).toMatchObject({
      situacao: 'informada',
      hora: '10:30',
    });
    expect(
      (resposta.json as OpcoesDeHora).opcoes.some((o) => o.escolhida)
    ).toBe(false);
    const mapa = await chamar(mapaNatal, { usuario: pessoa });
    expect(mapa.json).toMatchObject({ mapa: { precisaoDaHora: 'informada' } });
  });

  it('nunca substitui nem apaga uma hora informada pela pessoa', async () => {
    const pessoa = await criarUsuario();
    await definirNascimento(pessoa, '10:30');
    const opcoes = (await chamar(GET, { usuario: pessoa }))
      .json as OpcoesDeHora;
    expect(opcoes.situacao).toBe('informada');

    expect(
      (
        await chamar(POST, {
          usuario: pessoa,
          method: 'POST',
          body: { janela: opcoes.opcoes[0].id },
        })
      ).status
    ).toBe(409);
    expect(
      (await chamar(DELETE, { usuario: pessoa, method: 'DELETE' })).status
    ).toBe(409);
    expect((await horasDoPerfil(pessoa)).birth_time!.slice(0, 5)).toBe('10:30');
  });

  it('recusa janela de outro dia, corpo inválido e campos extras', async () => {
    const pessoa = await criarUsuario();
    await definirNascimento(pessoa, null);
    const enviar = (body: unknown) =>
      chamar(POST, { usuario: pessoa, method: 'POST', body });

    expect((await enviar({ janela: '2001-01-01T12:00:00.000Z' })).status).toBe(
      409
    );
    expect((await enviar({ janela: '10:30' })).status).toBe(400);
    expect((await enviar({})).status).toBe(400);
    expect(
      (await enviar({ janela: '1990-12-01T03:00:00.000Z', hora: '10:30' }))
        .status
    ).toBe(400);
    expect(await horasDoPerfil(pessoa)).toEqual({
      birth_time: null,
      birth_time_estimate: null,
    });
  });

  it('declara o que falta e o limite polar em vez de inventar janelas', async () => {
    const semDados = await criarUsuario();
    const vazio = await chamar(GET, { usuario: semDados });
    expect(vazio.json).toMatchObject({
      situacao: 'desconhecida',
      faltando: ['data', 'local'],
      opcoes: [],
    });
    expect(
      (
        await chamar(POST, {
          usuario: semDados,
          method: 'POST',
          body: { janela: '1990-12-01T03:00:00.000Z' },
        })
      ).status
    ).toBe(422);

    const polar = await criarUsuario();
    await definirNascimento(polar, null, 69.6492, 'Europe/Oslo');
    const resposta = await chamar(GET, { usuario: polar });
    expect(resposta.status).toBe(200);
    const corpo = resposta.json as OpcoesDeHora;
    expect(corpo.opcoes).toEqual([]);
    expect(corpo.indisponivel).toMatch(/latitude polar/);
  });

  it('não alcança o perfil de outra conta', async () => {
    const outra = await criarUsuario();
    await definirNascimento(outra, null);
    const opcoes = (await chamar(GET, { usuario: titular }))
      .json as OpcoesDeHora;
    await chamar(POST, {
      usuario: titular,
      method: 'POST',
      path: `/api/perfil/hora-de-nascimento?userId=${outra.id}`,
      body: { janela: opcoes.opcoes[1].id },
    });
    expect(await horasDoPerfil(outra)).toEqual({
      birth_time: null,
      birth_time_estimate: null,
    });
    expect((await horasDoPerfil(titular)).birth_time).not.toBeNull();
  });
});
