import { describe, expect, it } from 'vitest';
import { criarUsuario } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import * as mapaApi from '@/app/api/astrologia/mapa/route';
import * as painelApi from '@/app/api/astrologia/painel/route';
import * as diaApi from '@/app/api/astrologia/dia/route';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { exportarDadosDoTitular } from '@/lib/lgpd/conta';
import { carregarNatalDoTitular } from './persistencia-natal';
import { mapaDoPerfil } from './perfil-astrologico';

async function pessoaComMapa() {
  const pessoa = await criarUsuario('patient', 'NatalPersistido');
  await executeStatement(
    `UPDATE profiles SET birth_date='1990-12-01', birth_time='10:30',
     birth_location='São Paulo', birth_latitude=-23.5505, birth_longitude=-46.6333,
     birth_timezone='America/Sao_Paulo' WHERE id=?`,
    [pessoa.id]
  );
  return pessoa;
}

async function revisao(userId: string) {
  const [linha] = await queryRows<{ revision: number }>(
    'SELECT revision FROM astrological_natal_bases WHERE user_id=?',
    [userId]
  );
  return linha ? Number(linha.revision) : null;
}

describe('base natal privada no MySQL real', () => {
  it('grava uma vez, reaproveita entre acessos e projeta períodos sem alterar posições', async () => {
    const pessoa = await pessoaComMapa();
    const primeira = await carregarNatalDoTitular(
      pessoa.id,
      new Date('2026-11-09T12:00:00Z')
    );
    expect(primeira.reutilizado).toBe(false);
    expect(primeira.mapa).toEqual(
      mapaDoPerfil(primeira.perfil, new Date('2026-11-09T12:00:00Z'))
    );
    const segunda = await carregarNatalDoTitular(
      pessoa.id,
      new Date('2028-05-01T12:00:00Z')
    );
    expect(segunda.reutilizado).toBe(true);
    expect(segunda.mapa).toEqual(
      mapaDoPerfil(segunda.perfil, new Date('2028-05-01T12:00:00Z'))
    );
    expect(segunda.mapa?.planetas).toEqual(primeira.mapa?.planetas);
    expect(await revisao(pessoa.id)).toBe(1);
  });

  it('coalesce acessos concorrentes e não compartilha bases entre titulares', async () => {
    const pessoa = await pessoaComMapa();
    const respostas = await Promise.all(
      Array.from({ length: 6 }, () => carregarNatalDoTitular(pessoa.id))
    );
    expect(respostas.filter((item) => !item.reutilizado)).toHaveLength(1);
    expect(await revisao(pessoa.id)).toBe(1);
    const outra = await pessoaComMapa();
    expect((await carregarNatalDoTitular(outra.id)).reutilizado).toBe(false);
    expect(await revisao(outra.id)).toBe(1);
  });

  it('compartilha a base entre mapa, painel e dia com sessão e resposta privada', async () => {
    const pessoa = await pessoaComMapa();
    for (const handler of [mapaApi.GET, painelApi.GET, diaApi.GET]) {
      expect((await chamar(handler, { usuario: null })).status).toBe(401);
      const resposta = await chamar(handler, { usuario: pessoa });
      expect(resposta.status).toBe(200);
      expect(resposta.headers.get('cache-control')).toBe('private, no-store');
      expect(await revisao(pessoa.id)).toBe(1);
    }
  });

  it('invalida cada entrada natal, mas preserva a base ao mudar somente a moradia', async () => {
    const pessoa = await pessoaComMapa();
    const referencia = new Date('2026-11-09T12:00:00Z');
    await carregarNatalDoTitular(pessoa.id, referencia);
    await executeStatement(
      `UPDATE profiles SET residence_location='Lisboa', residence_latitude=38.72,
       residence_longitude=-9.14, residence_timezone='Europe/Lisbon' WHERE id=?`,
      [pessoa.id]
    );
    expect(
      (await carregarNatalDoTitular(pessoa.id, referencia)).reutilizado
    ).toBe(true);
    expect(await revisao(pessoa.id)).toBe(1);
    const mudancas = [
      "birth_date='1991-01-02'",
      "birth_time='11:45'",
      'birth_latitude=-22.9',
      'birth_longitude=-43.17',
      "birth_timezone='America/Manaus'",
    ];
    for (const [indice, mudanca] of mudancas.entries()) {
      await executeStatement(`UPDATE profiles SET ${mudanca} WHERE id=?`, [
        pessoa.id,
      ]);
      const resultado = await carregarNatalDoTitular(pessoa.id, referencia);
      expect(resultado.reutilizado).toBe(false);
      expect(resultado.mapa).toEqual(
        mapaDoPerfil(resultado.perfil, referencia)
      );
      expect(await revisao(pessoa.id)).toBe(indice + 2);
    }
  });

  it('invalida por edição de nascimento, versão e payload incompatível', async () => {
    const pessoa = await pessoaComMapa();
    await carregarNatalDoTitular(pessoa.id);
    await executeStatement(
      "UPDATE profiles SET birth_time='11:30' WHERE id=?",
      [pessoa.id]
    );
    const alterada = await carregarNatalDoTitular(pessoa.id);
    expect(alterada.reutilizado).toBe(false);
    expect(alterada.mapa).toEqual(mapaDoPerfil(alterada.perfil));
    expect(await revisao(pessoa.id)).toBe(2);
    await executeStatement(
      'UPDATE astrological_natal_bases SET engine_version=0 WHERE user_id=?',
      [pessoa.id]
    );
    expect((await carregarNatalDoTitular(pessoa.id)).reutilizado).toBe(false);
    await executeStatement(
      "UPDATE astrological_natal_bases SET payload=JSON_OBJECT('invalido',TRUE) WHERE user_id=?",
      [pessoa.id]
    );
    expect((await carregarNatalDoTitular(pessoa.id)).reutilizado).toBe(false);
    expect(await revisao(pessoa.id)).toBe(4);
  });

  it('mantém mapa sem hora, não grava perfil incompleto e descarta base quando o nascimento é retirado', async () => {
    const pessoa = await pessoaComMapa();
    await executeStatement('UPDATE profiles SET birth_time=NULL WHERE id=?', [
      pessoa.id,
    ]);
    await carregarNatalDoTitular(pessoa.id);
    const semHora = await carregarNatalDoTitular(pessoa.id);
    expect(semHora.reutilizado).toBe(true);
    expect(semHora.mapa?.lagna).toBeNull();
    expect(
      semHora.mapa?.planetas.every((planeta) => planeta.casa === null)
    ).toBe(true);
    await executeStatement('UPDATE profiles SET birth_date=NULL WHERE id=?', [
      pessoa.id,
    ]);
    expect((await carregarNatalDoTitular(pessoa.id)).mapa).toBeNull();
    expect(await revisao(pessoa.id)).toBeNull();
    const incompleta = await criarUsuario();
    expect((await carregarNatalDoTitular(incompleta.id)).mapa).toBeNull();
    expect(await revisao(incompleta.id)).toBeNull();
  });

  it('exporta somente os dados do titular e remove a base ao excluir a conta', async () => {
    const pessoa = await pessoaComMapa();
    await carregarNatalDoTitular(pessoa.id);
    const outra = await pessoaComMapa();
    await carregarNatalDoTitular(outra.id);
    const exportacao = await exportarDadosDoTitular(pessoa.id);
    expect(exportacao.astrological_natal_bases).toHaveLength(1);
    expect(exportacao.astrological_natal_bases[0].user_id).toBe(pessoa.id);
    await executeStatement('DELETE FROM users WHERE id=?', [pessoa.id]);
    expect(await revisao(pessoa.id)).toBeNull();
    expect(await revisao(outra.id)).toBe(1);
    await expect(carregarNatalDoTitular(pessoa.id)).rejects.toThrow(
      'Perfil não encontrado.'
    );
  });
});
