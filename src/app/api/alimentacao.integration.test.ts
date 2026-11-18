import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  criarUsuario,
  contar,
  type UsuarioDeTeste,
  definirDireito,
} from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { dataLocal } from '@/lib/astrology/tempo';
import { somarDias } from '@/lib/acontecimentos/analise';
import { exportarDadosDoTitular, excluirConta } from '@/lib/lgpd/conta';
import { lerLinhaDoTempo } from '@/lib/linha-do-tempo/servico';
import { montarRelatorio } from '@/lib/relatorio-pessoal/servico';
import * as central from './alimentacao/route';
import * as individual from './alimentacao/[id]/route';
import * as foto from './alimentacao/[id]/foto/route';

const hoje = () => dataLocal(new Date(), 'UTC');
const dados = (extra: Record<string, unknown> = {}) => ({
  id: randomUUID(),
  data: hoje(),
  hora: '12:30',
  tipo: 'almoco',
  descricao: 'Arroz, feijão e salada',
  porcao: 'media',
  percepcao: 4,
  nota: 'Comi com calma',
  ...extra,
});
async function jpegComExif() {
  return sharp({
    create: {
      width: 64,
      height: 48,
      channels: 3,
      background: { r: 200, g: 120, b: 40 },
    },
  })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Copyright: 'QA-EXIF-PRIVADO' } } })
    .toBuffer();
}
function formulario(
  d: unknown,
  arquivo?: { bytes: Buffer; nome: string; tipo: string }
) {
  const f = new FormData();
  f.set('dados', JSON.stringify(d));
  if (arquivo)
    f.set(
      'foto',
      new File([new Uint8Array(arquivo.bytes)], arquivo.nome, {
        type: arquivo.tipo,
      })
    );
  return f;
}
async function recurso(habilitado: boolean) {
  await executeStatement(
    "UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=? WHERE p.plan_key='care' AND f.feature_key='daily_checkin'",
    [habilitado]
  );
}
const enviar = (
  h: typeof central.POST | typeof foto.PUT,
  usuario: UsuarioDeTeste | null,
  corpo: FormData,
  method = 'POST',
  id?: string
) =>
  chamar(h as typeof central.POST, {
    usuario,
    method,
    rawBody: corpo,
    ...(id ? { params: { id } as never } : {}),
  });

describe('diário alimentar com MySQL real', () => {
  // Os testes de janela usam um histórico de 30 dias no plano de base; desde
  // as tarefas 224 e 225 é o Care, sem esse limite, então ele é declarado aqui.
  let restaurarJanela: () => Promise<void>;
  beforeAll(async () => {
    restaurarJanela = await definirDireito('care', 'metrics_history_days', {
      enabled: true,
      quota: 30,
      reset: 'rolling',
    });
  });
  afterAll(async () => {
    await restaurarJanela();
  });
  it('exige sessão em todas as rotas', async () => {
    const id = randomUUID();
    for (const [h, m] of [
      [central.GET, 'GET'],
      [central.POST, 'POST'],
      [individual.PATCH, 'PATCH'],
      [individual.DELETE, 'DELETE'],
      [foto.GET, 'GET'],
      [foto.PUT, 'PUT'],
      [foto.DELETE, 'DELETE'],
    ] as const)
      expect(
        (
          await chamar(h as typeof individual.PATCH, {
            usuario: null,
            method: m,
            params: { id },
            ...(m === 'GET' ? {} : { body: {} }),
          })
        ).status
      ).toBe(401);
  });

  it('cria com foto normalizada sem metadados, idempotência e validações', async () => {
    const u = await criarUsuario(),
      d = dados(),
      jpeg = await jpegComExif();
    expect(jpeg.toString('latin1')).toContain('QA-EXIF-PRIVADO');
    const criado = await enviar(
      central.POST,
      u,
      formulario(d, { bytes: jpeg, nome: 'prato.jpg', tipo: 'image/jpeg' })
    );
    expect(criado.status).toBe(201);
    expect(criado.json).toMatchObject({
      id: d.id,
      tipo: 'almoco',
      porcao: 'media',
      percepcao: 4,
      versao: 1,
      foto: { bytes: expect.any(Number) },
    });
    const repetido = await enviar(central.POST, u, formulario(d));
    expect(repetido.status).toBe(200);
    expect(
      (
        await enviar(
          central.POST,
          u,
          formulario({ ...d, descricao: 'Outro prato' })
        )
      ).status
    ).toBe(409);
    const img = await chamar(foto.GET, { usuario: u, params: { id: d.id } });
    expect(img.status).toBe(200);
    expect(img.headers.get('content-type')).toBe('image/png');
    expect(img.headers.get('cache-control')).toBe('private, no-store');
    // Bytes guardados: PNG sem o EXIF do original.
    const [guardada] = await queryRows<{ file_data: Buffer }>(
      'SELECT file_data FROM meal_photos WHERE entry_id=?',
      [d.id]
    );
    expect(guardada.file_data.toString('latin1')).not.toContain(
      'QA-EXIF-PRIVADO'
    );
    const meta = await sharp(guardada.file_data).metadata();
    expect(meta.format).toBe('png');
    expect(meta.exif).toBeUndefined();

    for (const [corpo, status] of [
      [formulario(dados({ descricao: '' })), 400],
      [formulario(dados({ hora: '25:00' })), 400],
      [formulario(dados({ tipo: 'sobremesa' })), 400],
      [formulario(dados({ percepcao: 6 })), 400],
      [formulario(dados({ data: somarDias(hoje(), 1) })), 400],
      [formulario(dados({ data: somarDias(hoje(), -60) })), 403],
      [
        formulario(dados(), {
          bytes: Buffer.from('não é imagem'),
          nome: 'nota.txt',
          tipo: 'text/plain',
        }),
        415,
      ],
      [
        formulario(dados(), {
          bytes: Buffer.alloc(3 * 1024 * 1024 + 10, 1),
          nome: 'grande.png',
          tipo: 'image/png',
        }),
        413,
      ],
    ] as const)
      expect((await enviar(central.POST, u, corpo)).status).toBe(status);
    // Só foto, sem descrição, é aceito.
    const soFoto = dados({ descricao: '', hora: '16:00', tipo: 'lanche' });
    expect(
      (
        await enviar(
          central.POST,
          u,
          formulario(soFoto, {
            bytes: jpeg,
            nome: 'lanche.jpg',
            tipo: 'image/jpeg',
          })
        )
      ).status
    ).toBe(201);
    const dia = await chamar(central.GET, { usuario: u });
    expect(dia.status).toBe(200);
    expect(dia.headers.get('cache-control')).toBe('private, no-store');
    const corpo = dia.json as {
      refeicoes: Array<{ hora: string; descricao: string }>;
      dias: Array<{ total: number }>;
    };
    expect(corpo.refeicoes.map((r) => r.hora)).toEqual(['12:30', '16:00']);
    expect(corpo.dias[0].total).toBe(2);
    // Remover a única foto de um registro sem descrição é recusado.
    expect(
      (
        await chamar(foto.DELETE, {
          usuario: u,
          method: 'DELETE',
          params: { id: soFoto.id },
          body: { versao: 1 },
        })
      ).status
    ).toBe(400);
  });

  it('edita com versão, troca e remove foto, exclui e isola titulares', async () => {
    const dono = await criarUsuario(),
      outro = await criarUsuario(),
      d = dados();
    await enviar(central.POST, dono, formulario(d));
    const edicao = {
      versao: 1,
      data: d.data,
      hora: '13:00',
      tipo: 'almoco',
      descricao: 'Arroz, feijão, salada e frango',
      porcao: 'grande',
      percepcao: 5,
      nota: '',
    };
    const e = await chamar(individual.PATCH, {
      usuario: dono,
      method: 'PATCH',
      params: { id: d.id },
      body: edicao,
    });
    expect(e.status).toBe(200);
    expect(e.json).toMatchObject({
      hora: '13:00',
      porcao: 'grande',
      versao: 2,
    });
    expect(
      (
        await chamar(individual.PATCH, {
          usuario: dono,
          method: 'PATCH',
          params: { id: d.id },
          body: edicao,
        })
      ).status
    ).toBe(409);
    const nova = await sharp({
      create: { width: 20, height: 20, channels: 3, background: '#0a0' },
    })
      .webp()
      .toBuffer();
    const troca = await enviar(
      foto.PUT,
      dono,
      formulario(
        { versao: 2 },
        { bytes: nova, nome: 'b.webp', tipo: 'image/webp' }
      ),
      'PUT',
      d.id
    );
    expect(troca.status).toBe(200);
    expect(troca.json).toMatchObject({
      versao: 3,
      foto: { bytes: expect.any(Number) },
    });
    for (const [h, m, body] of [
      [individual.PATCH, 'PATCH', { ...edicao, versao: 3 }],
      [individual.DELETE, 'DELETE', { versao: 3 }],
      [foto.GET, 'GET', undefined],
      [foto.DELETE, 'DELETE', { versao: 3 }],
    ] as const)
      expect(
        (
          await chamar(h as typeof individual.PATCH, {
            usuario: outro,
            method: m,
            params: { id: d.id },
            ...(body ? { body } : {}),
          })
        ).status
      ).toBe(404);
    expect((await chamar(central.GET, { usuario: outro })).json).toMatchObject({
      refeicoes: [],
    });
    const semFoto = await chamar(foto.DELETE, {
      usuario: dono,
      method: 'DELETE',
      params: { id: d.id },
      body: { versao: 3 },
    });
    expect(semFoto.json).toMatchObject({ foto: null, versao: 4 });
    expect(
      await contar('SELECT COUNT(*) total FROM meal_photos WHERE user_id=?', [
        dono.id,
      ])
    ).toBe(0);
    expect(
      (
        await chamar(individual.DELETE, {
          usuario: dono,
          method: 'DELETE',
          params: { id: d.id },
          body: { versao: 4 },
        })
      ).status
    ).toBe(200);
    expect(
      await contar('SELECT COUNT(*) total FROM meal_entries WHERE user_id=?', [
        dono.id,
      ])
    ).toBe(0);
  });

  it('integra linha do tempo, relatório, plano, exportação e exclusão da conta', async () => {
    const u = await criarUsuario(),
      d = dados({ hora: '08:15', tipo: 'cafe', descricao: 'Pão e café' });
    await enviar(
      central.POST,
      u,
      formulario(d, {
        bytes: await jpegComExif(),
        nome: 'cafe.jpg',
        tipo: 'image/jpeg',
      })
    );
    const linha = await lerLinhaDoTempo(u.session, {
      inicio: hoje(),
      fim: hoje(),
      pagina: 0,
    });
    const refeicao = linha.itens.find((i) => i.origem === 'refeicao');
    expect(refeicao).toMatchObject({
      hora: '08:15',
      titulo: 'Café da manhã',
      resumo: 'Pão e café',
      destino: `/alimentacao?data=${hoje()}`,
    });
    expect(JSON.stringify(linha)).not.toContain('Comi com calma');
    const base = {
      inicio: hoje(),
      fim: hoje(),
      metricas: [],
      reflexoes: false,
      acontecimentos: false,
      acompanhamentos: [],
      alimentacao: true,
      notas: false,
    };
    const r = await montarRelatorio(u.session, base);
    expect(r.alimentacao).toEqual([
      {
        data: hoje(),
        hora: '08:15',
        tipo: 'Café da manhã',
        descricao: 'Pão e café',
        porcao: 'Média',
        percepcao: 4,
        temFoto: true,
      },
    ]);
    expect(
      (await montarRelatorio(u.session, { ...base, notas: true }))
        .alimentacao[0].nota
    ).toBe('Comi com calma');
    await recurso(false);
    try {
      expect((await chamar(central.GET, { usuario: u })).status).toBe(403);
      expect(
        (await chamar(foto.GET, { usuario: u, params: { id: d.id } })).status
      ).toBe(403);
      await expect(montarRelatorio(u.session, base)).rejects.toMatchObject({
        statusCode: 403,
      });
    } finally {
      await recurso(true);
    }
    const ex = await exportarDadosDoTitular(u.id);
    expect(ex.meal_entries).toHaveLength(1);
    expect(ex.fotos_do_diario_alimentar).toHaveLength(1);
    expect(ex.fotos_do_diario_alimentar[0].arquivo_base64).toMatch(/^iVBOR/);
    await excluirConta(u.id);
    for (const t of ['meal_entries', 'meal_photos'])
      expect(
        await contar(`SELECT COUNT(*) total FROM ${t} WHERE user_id=?`, [u.id])
      ).toBe(0);
  });
});
