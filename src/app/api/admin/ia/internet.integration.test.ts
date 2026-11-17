import { describe, expect, it } from 'vitest';

import type { AcessoInternet } from '@/lib/ai/internet/acesso';
import { registrarConsulta } from '@/lib/ai/internet/acesso';
import { queryRows } from '@/lib/mysql/pool';

import { criarUsuario } from '../../../../../tests/integration/fixtures';
import { chamar } from '../../../../../tests/integration/http';
import { GET, PATCH } from './internet/route';

interface Situacao {
  acesso: AcessoInternet;
  consultas: Array<{ tarefa: string; tipo: string; alvo: string }>;
}

describe('Acesso do modelo de IA à internet', () => {
  it('só administradores leem e alteram', async () => {
    expect((await chamar(GET, { usuario: null })).status).toBe(401);
    const pessoa = await criarUsuario();
    expect((await chamar(GET, { usuario: pessoa })).status).toBe(403);
    expect(
      (
        await chamar(PATCH, {
          usuario: pessoa,
          method: 'PATCH',
          body: { modo: 'total', dominios: [] },
        })
      ).status
    ).toBe(403);
  });

  it('começa restrito às fontes oficiais de saúde da migration', async () => {
    const admin = await criarUsuario('admin');
    const resposta = await chamar(GET, { usuario: admin });
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get('Cache-Control')).toBe('private, no-store');
    const { acesso } = resposta.json as Situacao;
    expect(acesso.modo).toBe('lista');
    expect(
      typeof (resposta.json as { buscaDisponivel: unknown }).buscaDisponivel
    ).toBe('boolean');
    expect(acesso.dominios).toEqual(
      expect.arrayContaining(['gov.br', 'diabetes.org.br', 'who.int'])
    );
  });

  it('altera o alcance, normaliza domínios e valida a entrada', async () => {
    const admin = await criarUsuario('admin');
    const alterar = (body: unknown) =>
      chamar(PATCH, { usuario: admin, method: 'PATCH', body });

    const lista = await alterar({
      modo: 'lista',
      dominios: ['https://WWW.INCA.gov.br/', 'inca.gov.br', 'who.int'],
    });
    expect(lista.status).toBe(200);
    expect((lista.json as Situacao).acesso).toMatchObject({
      modo: 'lista',
      dominios: ['inca.gov.br', 'who.int'],
    });
    const [linha] = await queryRows<{ atualizado_por: string }>(
      'SELECT atualizado_por FROM ia_acesso_internet WHERE id = 1'
    );
    expect(linha.atualizado_por).toBe(admin.id);

    expect((await alterar({ modo: 'lista', dominios: [] })).status).toBe(400);
    expect(
      (await alterar({ modo: 'lista', dominios: ['localhost'] })).status
    ).toBe(400);
    expect((await alterar({ modo: 'aberto', dominios: [] })).status).toBe(400);
    expect(
      (await alterar({ modo: 'total', dominios: [], extra: true })).status
    ).toBe(400);

    const total = await alterar({ modo: 'total', dominios: [] });
    expect((total.json as Situacao).acesso.modo).toBe('total');
    const desligado = await alterar({ modo: 'desligado', dominios: [] });
    expect((desligado.json as Situacao).acesso.modo).toBe('desligado');
  });

  it('mostra as últimas consultas registradas', async () => {
    const admin = await criarUsuario('admin');
    await registrarConsulta({
      tarefa: 'exames',
      tipo: 'pagina',
      alvo: 'https://www.gov.br/inca/teste-de-registro',
      situacao: 'lida',
    });
    const { consultas } = (await chamar(GET, { usuario: admin }))
      .json as Situacao;
    expect(consultas[0]).toMatchObject({
      tarefa: 'exames',
      tipo: 'pagina',
      alvo: 'https://www.gov.br/inca/teste-de-registro',
    });
  });
});
