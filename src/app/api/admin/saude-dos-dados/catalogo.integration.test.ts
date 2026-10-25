import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { GET } from './route';
import { criarUsuario } from '../../../../../tests/integration/fixtures';
import { chamar } from '../../../../../tests/integration/http';
import { queryRows, executeStatement } from '@/lib/mysql/pool';
import {
  CATALOGO_DE_METRICAS,
  COLUNAS_DAS_METRICAS,
  NUMERIC_METRIC_COLUMNS,
} from '@/lib/metricas/catalogo';
import { CAMPOS_DO_REGISTRO } from '@/lib/metricas/registro-do-dia';
import { TABLE_CONFIG } from '@/lib/mysql/table-config';

it('cobre todas as métricas do schema real com nomes e unidades, reutilizando os campos já definidos', async () => {
  const columns = await queryRows<{ coluna: string }>(
    `SELECT COLUMN_NAME coluna FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='daily_metrics' AND DATA_TYPE IN ('tinyint','smallint','mediumint','int','bigint','decimal','float','double')`
  );
  expect([...NUMERIC_METRIC_COLUMNS].sort()).toEqual(
    columns.map((c) => c.coluna).sort()
  );
  expect(NUMERIC_METRIC_COLUMNS).toHaveLength(63);
  const dados = TABLE_CONFIG.daily_metrics.columns.filter(
    (c) =>
      !['id', 'user_id', 'date', 'created_at', 'metrics_updated_at'].includes(c)
  );
  expect([...COLUNAS_DAS_METRICAS].sort()).toEqual(dados.sort());
  for (const key of COLUNAS_DAS_METRICAS) {
    const d = CATALOGO_DE_METRICAS[key];
    expect(d.nome.length).toBeGreaterThan(2);
    expect(d.nome).not.toBe(key);
    expect(d.nome).not.toContain('_');
    expect(d.unidade).toBeTruthy();
  }
  for (const d of Object.values(CAMPOS_DO_REGISTRO)) {
    expect(
      CATALOGO_DE_METRICAS[d.coluna as keyof typeof CATALOGO_DE_METRICAS].nome
    ).toBe(d.rotulo);
  }
  expect(CATALOGO_DE_METRICAS.vo2_max.unidade).toBe('mL/kg/min');
  expect(CATALOGO_DE_METRICAS.iauc_per_meal_mgdl_h.unidade).toBe('mg/dL·h');
  expect(CATALOGO_DE_METRICAS.eda_tonic_microsiemens.unidade).toBe('µS');
});

it('API fornece os 64 nomes e preserva agregações numéricas; categoria não vira zero ou média fictícia', async () => {
  const admin = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  try {
    await executeStatement(
      `INSERT INTO daily_metrics(id,user_id,date,steps,hrv_ms,protein_grams,menstrual_flow,metrics_updated_at) VALUES(?,?,UTC_DATE(),1000,NULL,0,'moderate',UTC_TIMESTAMP()),(?,?,UTC_DATE()-INTERVAL 1 DAY,3000,50,20,NULL,UTC_TIMESTAMP())`,
      [randomUUID(), pessoa.id, randomUUID(), pessoa.id]
    );
    const result = await chamar(GET, {
      usuario: admin,
      path: '/api/admin/saude-dos-dados',
    });
    expect(result.status).toBe(200);
    const body = result.json as {
      totalDeRegistros: number;
      metricas: Array<{
        metrica: string;
        nome: string;
        unidade: string;
        tipo: string;
        preenchimento: number;
        media: number | null;
        minimo: number | null;
        maximo: number | null;
      }>;
    };
    expect(body.metricas).toHaveLength(64);
    expect(body.metricas.map((m) => m.metrica).sort()).toEqual(
      [...COLUNAS_DAS_METRICAS].sort()
    );
    for (const m of body.metricas)
      expect(m).toMatchObject(
        CATALOGO_DE_METRICAS[m.metrica as keyof typeof CATALOGO_DE_METRICAS]
      );
    for (const key of ['steps', 'hrv_ms', 'protein_grams']) {
      const [expected] = await queryRows<{
        n: number;
        media: number | null;
        minimo: number | null;
        maximo: number | null;
      }>(
        `SELECT COUNT(${key}) n,AVG(${key}) media,MIN(${key}) minimo,MAX(${key}) maximo FROM daily_metrics`
      );
      const actual = body.metricas.find((m) => m.metrica === key)!;
      expect(actual.media).toBeCloseTo(Number(expected.media), 4);
      expect(actual.minimo).toBe(Number(expected.minimo));
      expect(actual.maximo).toBe(Number(expected.maximo));
      expect(actual.preenchimento).toBeCloseTo(
        (expected.n / body.totalDeRegistros) * 100,
        6
      );
    }
    const [filled] = await queryRows<{ n: number }>(
      'SELECT COUNT(menstrual_flow) n FROM daily_metrics'
    );
    expect(
      body.metricas.find((m) => m.metrica === 'menstrual_flow')
    ).toMatchObject({
      nome: 'Fluxo menstrual',
      tipo: 'categoria',
      media: null,
      minimo: null,
      maximo: null,
      preenchimento: (filled.n / body.totalDeRegistros) * 100,
    });
    expect(body.metricas.some((m) => m.metrica === 'metrics_updated_at')).toBe(
      false
    );
  } finally {
    await executeStatement('DELETE FROM users WHERE id IN (?,?)', [
      pessoa.id,
      admin.id,
    ]);
  }
});
