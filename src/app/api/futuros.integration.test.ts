import { describe, expect, it } from 'vitest';

import { criarUsuario } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';

import { POST } from './futuros/route';

const PREMISSAS = {
  duvida: 'Mudar de cidade no próximo ano?',
  horizonte: '1a',
  caminhos: [
    { titulo: 'Mudar para o litoral', passo: 'Visitar três bairros' },
    { titulo: 'Ficar onde estou', passo: 'Reformar o apartamento' },
    { titulo: 'Testar por três meses', passo: 'Alugar por temporada' },
  ],
};

describe('Teatro dos Futuros: rota (tarefa 189)', () => {
  it('exige sessão e devolve três ramos sem cache, sem mapa calculado', async () => {
    expect(
      (await chamar(POST, { usuario: null, method: 'POST', body: PREMISSAS }))
        .status
    ).toBe(401);
    const pessoa = await criarUsuario();
    const resposta = await chamar(POST, {
      usuario: pessoa,
      method: 'POST',
      body: PREMISSAS,
    });
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get('cache-control')).toContain('no-store');
    const teatro = resposta.json as {
      aviso: string;
      fatos: { texto: string }[];
      ramos: { titulo: string }[];
    };
    expect(teatro.aviso).toBe('NÃO É PREVISÃO');
    expect(teatro.ramos.map((r) => r.titulo)).toEqual([
      'Mudar para o litoral',
      'Ficar onde estou',
      'Testar por três meses',
    ]);
    // Conta de teste sem nascimento: o período não é inventado.
    expect(teatro.fatos[0].texto).toMatch(/não é determinável/);
  });

  it('recusa tema de risco e de saúde com orientação, e campos fora do esquema', async () => {
    const pessoa = await criarUsuario();
    const risco = await chamar(POST, {
      usuario: pessoa,
      method: 'POST',
      body: { ...PREMISSAS, duvida: 'Não quero mais viver assim' },
    });
    expect(risco.status).toBe(422);
    expect((risco.json as { error: string }).error).toContain('188');
    const saude = await chamar(POST, {
      usuario: pessoa,
      method: 'POST',
      body: { ...PREMISSAS, duvida: 'Parar de tomar o remédio?' },
    });
    expect(saude.status).toBe(422);
    expect(
      (
        await chamar(POST, {
          usuario: pessoa,
          method: 'POST',
          body: { ...PREMISSAS, dataDeNascimento: '1990-01-01' },
        })
      ).status
    ).toBe(400);
  });
});
