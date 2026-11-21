import { afterEach, describe, expect, it } from 'vitest';

import { contar } from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { zerarLimite } from '@/lib/security/rate-limit';

import { LIMITE_DESCOBERTA_POR_IP, POST } from './descoberta/route';

const IPS: string[] = [];
function pedido(
  ip: string,
  body: unknown,
  extras: Record<string, string> = {}
) {
  IPS.push(ip);
  return chamar(POST, {
    usuario: null,
    method: 'POST',
    path: '/api/public/descoberta',
    body,
    headers: { 'x-forwarded-for': ip, ...extras },
  });
}

afterEach(async () => {
  for (const ip of IPS.splice(0))
    await zerarLimite(LIMITE_DESCOBERTA_POR_IP, ip);
});

describe('Experimente Grátis sem conta (tarefas 155 e 157)', () => {
  it('calcula a leitura ocidental sem conta, sem cookie, sem cache e sem gravar', async () => {
    const contas = await contar('SELECT COUNT(*) AS total FROM users');
    const perfis = await contar('SELECT COUNT(*) AS total FROM profiles');
    const r = await pedido('203.0.113.10', {
      nome: 'Ana Maria Teste',
      dataDeNascimento: '1990-07-15',
    });
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('no-store, private');
    expect(r.headers.get('set-cookie')).toBeNull();
    const corpo = r.json as {
      primeiroNome: string;
      sol: { signo: string };
      leitura: { tipo: string };
    };
    expect(corpo.primeiroNome).toBe('Ana');
    expect(corpo.sol.signo).toBe('Câncer');
    expect(corpo.leitura.tipo).toBe('ocidental');
    expect(r.texto).not.toContain('Maria Teste');
    expect(r.texto).not.toContain('1990-07-15');
    expect(await contar('SELECT COUNT(*) AS total FROM users')).toBe(contas);
    expect(await contar('SELECT COUNT(*) AS total FROM profiles')).toBe(perfis);
  });

  it('o limite por IP guarda só o hash, nunca o IP, o nome ou a data', async () => {
    await pedido('203.0.113.11', {
      nome: 'Ana Teste',
      dataDeNascimento: '1990-07-15',
    });
    for (const valor of ['203.0.113.11', 'Ana Teste', '1990-07-15'])
      expect(
        await contar(
          'SELECT COUNT(*) AS total FROM rate_limit_buckets WHERE bucket_key LIKE ?',
          [`%${valor}%`]
        )
      ).toBe(0);
  });

  it('recusa menor de 13 anos com 403, sem repetir a data', async () => {
    const r = await pedido('203.0.113.12', {
      nome: 'Ana Teste',
      dataDeNascimento: '2020-05-10',
    });
    expect(r.status).toBe(403);
    expect(r.json).toEqual({
      error: 'A experiência da Lyra é para quem tem 13 anos ou mais.',
    });
    expect(r.headers.get('cache-control')).toBe('no-store, private');
  });

  it('recusa corpo inválido, campos extras, data inexistente e pedido grande', async () => {
    expect(
      (
        await pedido('203.0.113.13', {
          nome: 'Ana',
          dataDeNascimento: '1990-07-15',
        })
      ).status
    ).toBe(400);
    expect(
      (
        await pedido('203.0.113.13', {
          nome: 'Ana Teste',
          dataDeNascimento: '1990-07-15',
          email: 'ana@teste.lyra.local',
        })
      ).status
    ).toBe(400);
    expect(
      (
        await pedido('203.0.113.13', {
          nome: 'Ana Teste',
          dataDeNascimento: '1990-02-30',
        })
      ).status
    ).toBe(422);
    expect(
      (
        await pedido(
          '203.0.113.13',
          { nome: 'Ana Teste', dataDeNascimento: '1990-07-15' },
          { 'content-length': '5000' }
        )
      ).status
    ).toBe(413);
  });

  it('responde 429 quando o IP passa do limite da janela', async () => {
    const visitante = { nome: 'Ana Teste', dataDeNascimento: '1990-07-15' };
    for (let i = 0; i < LIMITE_DESCOBERTA_POR_IP.limite; i++)
      expect((await pedido('203.0.113.14', visitante)).status).toBe(200);
    const excedido = await pedido('203.0.113.14', visitante);
    expect(excedido.status).toBe(429);
    expect(excedido.headers.get('retry-after')).toMatch(/^\d+$/);
    // Outro IP continua livre.
    expect((await pedido('203.0.113.15', visitante)).status).toBe(200);
  });
});
