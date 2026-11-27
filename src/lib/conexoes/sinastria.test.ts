import { describe, expect, it } from 'vitest';

import { HttpError } from '@/lib/http-error';

import {
  esquemaDaConexao,
  idadeEmAnos,
  montarConexao,
  type NascimentoInformado,
} from './sinastria';

const AGORA = new Date('2026-11-27T15:00:00Z');
const SAO_PAULO = {
  rotulo: 'São Paulo, São Paulo, Brasil',
  latitude: -23.5475,
  longitude: -46.63611,
  fuso: 'America/Sao_Paulo',
};

const pessoa = (
  rotulo: string,
  data: string,
  extra: Partial<NascimentoInformado> = {}
): NascimentoInformado => ({ rotulo, data, hora: null, local: null, ...extra });

describe('Conexões da Alma: só com as datas (tarefa 166)', () => {
  it('compara os Sóis: Áries e Leão são de fogo e formam trígono', () => {
    const c = montarConexao(
      pessoa('Você', '1990-04-10'),
      pessoa('Rafa', '1992-08-15'),
      AGORA
    );
    expect(c.nivel).toBe('solar');
    expect(c.pessoas.map((p) => p.sol.signo)).toEqual(['Áries', 'Leão']);
    expect(c.leituras).toHaveLength(1);
    expect(c.leituras[0].condicao).toBeNull();
    const texto = c.leituras[0].afinidades.join(' ');
    expect(texto).toContain('trígono');
    expect(texto).toContain('fogo');
    expect(c.aspectos).toEqual([]);
    expect(c.naoComparado.join(' ')).toContain('Lua, Mercúrio, Vênus, Marte');
  });

  it('no dia de troca de signo, mostra as duas possibilidades em vez de escolher uma', () => {
    // 20/03/2000: o Sol entrou em Áries às 07h35 UTC.
    const c = montarConexao(
      pessoa('Você', '2000-03-20'),
      pessoa('Rafa', '1992-08-15'),
      AGORA
    );
    expect(c.pessoas[0].sol.signo).toBeNull();
    expect(c.pessoas[0].sol.possiveis).toEqual(['Peixes', 'Áries']);
    expect(c.leituras.map((l) => l.condicao)).toEqual([
      'Se o Sol de você estiver em Peixes e o de Rafa em Leão',
      'Se o Sol de você estiver em Áries e o de Rafa em Leão',
    ]);
    expect(c.avisos.join(' ')).toContain('dia de troca de signo');
  });

  it('hora sem cidade não vira mapa completo e o aviso explica por quê', () => {
    const c = montarConexao(
      pessoa('Você', '1990-04-10', { hora: '08:30' }),
      pessoa('Rafa', '1992-08-15'),
      AGORA
    );
    expect(c.pessoas[0].nivel).toBe('solar');
    expect(c.avisos.join(' ')).toContain('sem a cidade');
  });
});

describe('Conexões da Alma: mapas completos (tarefa 166)', () => {
  const completo = montarConexao(
    pessoa('Você', '1990-04-10', { hora: '08:30', local: SAO_PAULO }),
    pessoa('Rafa', '1992-08-15', { hora: '21:10', local: SAO_PAULO }),
    AGORA
  );

  it('usa as posições reais e os aspectos entre os dois mapas', () => {
    expect(completo.nivel).toBe('completo');
    for (const p of completo.pessoas) {
      expect(p.posicoes.map((x) => x.planeta)).toEqual([
        'sol',
        'lua',
        'mercurio',
        'venus',
        'marte',
      ]);
      expect(p.ascendente).not.toBeNull();
    }
    expect(completo.aspectos.length).toBeGreaterThan(0);
    expect(completo.aspectos.length).toBeLessThanOrEqual(8);
    const orbes = completo.aspectos.map((a) => a.orbe);
    expect([...orbes].sort((x, y) => x - y)).toEqual(orbes);
    for (const a of completo.aspectos)
      expect(a.orbe).toBeLessThanOrEqual(a.aspecto === 'sextil' ? 3 : 5);
    expect(completo.comparado.join(' ')).toContain('Vênus');
  });

  it('só com uma pessoa completa, compara no nível do Sol e avisa', () => {
    const c = montarConexao(
      pessoa('Você', '1990-04-10', { hora: '08:30', local: SAO_PAULO }),
      pessoa('Rafa', '1992-08-15'),
      AGORA
    );
    expect(c.nivel).toBe('solar');
    expect(c.aspectos).toEqual([]);
    expect(c.avisos.join(' ')).toContain('Só uma das pessoas');
  });

  it('horário que não existiu no horário de verão vira 422 com o nome da pessoa', () => {
    // 03/10/1999 00:30 em São Paulo: o horário de verão começou e o relógio
    // pulou de 00:00 para 01:00.
    expect(() =>
      montarConexao(
        pessoa('Você', '1990-04-10'),
        pessoa('Rafa', '1999-10-03', { hora: '00:30', local: SAO_PAULO }),
        AGORA
      )
    ).toThrow(HttpError);
  });
});

describe('Conexões da Alma: limites éticos (tarefa 166)', () => {
  it('recusa quem tem menos de 18 anos, de qualquer um dos lados', () => {
    const menor = '2010-05-05';
    for (const [a, b] of [
      [menor, '1990-04-10'],
      ['1990-04-10', menor],
    ]) {
      try {
        montarConexao(pessoa('Você', a), pessoa('Rafa', b), AGORA);
        throw new Error('deveria recusar');
      } catch (erro) {
        expect(erro).toBeInstanceOf(HttpError);
        expect((erro as HttpError).statusCode).toBe(422);
      }
    }
    expect(idadeEmAnos('2008-11-27', AGORA)).toBe(18);
    expect(idadeEmAnos('2008-11-28', AGORA)).toBe(17);
  });

  it('não promete porcentagem, destino nem os sentimentos do outro', () => {
    const c = montarConexao(
      pessoa('Você', '1990-04-10'),
      pessoa('Rafa', '1992-08-15'),
      AGORA
    );
    const tudo = JSON.stringify(c);
    expect(tudo).not.toMatch(/\d+\s?%/);
    expect(c.sobre.join(' ')).toContain('não sabe o que a outra pessoa sente');
    expect(c.perguntas.length).toBeGreaterThanOrEqual(3);
  });

  it('exige o consentimento e não aceita campos a mais', () => {
    const base = { outra: { data: '1992-08-15' } };
    expect(esquemaDaConexao.safeParse(base).success).toBe(false);
    expect(
      esquemaDaConexao.safeParse({ ...base, consentimento: false }).success
    ).toBe(false);
    expect(
      esquemaDaConexao.safeParse({ ...base, consentimento: true }).success
    ).toBe(true);
    expect(
      esquemaDaConexao.safeParse({
        outra: { data: '1992-08-15', nomeCompleto: 'X' },
        consentimento: true,
      }).success
    ).toBe(false);
  });
});
