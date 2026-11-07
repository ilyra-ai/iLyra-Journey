import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { criarUsuario } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import {
  getDefaultPageConfig,
  type AppPageConfig,
} from '@/lib/site-page-config/schema';
import { getVisibleNavigation } from '@/components/layout/navigation';
import { lyraCustomazeEditableSurfaceMap } from '@/lib/site-page-config/registry';
import * as admin from './admin/page-config/[pageKey]/route';
import * as publicPage from './public/page-config/[pageKey]/route';
import * as data from './data/[table]/route';

it('draft e publicado antigos não reintroduzem a rota e preservam personalização e publicação em Conteúdo', async () => {
  const gestor = await criarUsuario('admin');
  const [previous] = await queryRows<Record<string, unknown>>(
    "SELECT * FROM site_page_configs WHERE page_key='app'"
  );
  const encode = (v: unknown) =>
    typeof v === 'string' ? v : JSON.stringify(v);
  try {
    const old = getDefaultPageConfig('app');
    old.sidebar.brandTitle = 'Personalização histórica de QA';
    old.sidebar.items.find((i) => i.href === '/admin/content')!.label =
      'Conteúdo preservado';
    old.sidebar.items.push({
      href: '/admin/page-builder',
      label: 'Construtor antigo',
      description: 'Configuração histórica',
      visible: true,
    });
    await executeStatement(
      `INSERT INTO site_page_configs(id,page_key,draft_config,published_config) VALUES(?,'app',?,?) AS novo ON DUPLICATE KEY UPDATE draft_config=novo.draft_config,published_config=novo.published_config`,
      [randomUUID(), JSON.stringify(old), JSON.stringify(old)]
    );
    const params = { pageKey: 'app' };
    const loaded = await chamar(admin.GET, { usuario: gestor, params });
    expect(loaded.status).toBe(200);
    const stored = loaded.json as {
      draftConfig: AppPageConfig;
      publishedConfig: AppPageConfig;
    };
    for (const cfg of [stored.draftConfig, stored.publishedConfig]) {
      expect(cfg.sidebar.brandTitle).toBe(old.sidebar.brandTitle);
      expect(
        cfg.sidebar.items.some((i) => i.href === '/admin/page-builder')
      ).toBe(false);
      expect(
        cfg.sidebar.items.find((i) => i.href === '/admin/content')?.label
      ).toBe('Conteúdo preservado');
      expect(
        getVisibleNavigation(true, cfg).some((i) => i.href === '/admin/content')
      ).toBe(false);
    }
    const raw = await queryRows<{ draft_config: unknown }>(
      "SELECT draft_config FROM site_page_configs WHERE page_key='app'"
    );
    expect(encode(raw[0].draft_config)).toContain('/admin/page-builder');
    const pub = await chamar(publicPage.GET, { usuario: null, params });
    expect(
      (pub.json as { config: AppPageConfig }).config.sidebar.items.some(
        (i) => i.href === '/admin/page-builder'
      )
    ).toBe(false);
    old.sidebar.brandTitle = 'Edição atual de QA';
    expect(
      (
        await chamar(admin.PUT, {
          method: 'PUT',
          usuario: gestor,
          params,
          body: { config: old },
        })
      ).status
    ).toBe(200);
    expect(
      (
        await chamar(admin.POST, {
          method: 'POST',
          usuario: gestor,
          params,
          body: { action: 'publish' },
        })
      ).status
    ).toBe(200);
    expect(
      (
        (await chamar(publicPage.GET, { usuario: null, params })).json as {
          config: AppPageConfig;
        }
      ).config.sidebar.brandTitle
    ).toBe('Edição atual de QA');
    expect(
      (
        await chamar(admin.POST, {
          method: 'POST',
          usuario: gestor,
          params,
          body: { action: 'restorePublished' },
        })
      ).status
    ).toBe(200);
    expect(lyraCustomazeEditableSurfaceMap.app.route).toBe('/admin/content');
  } finally {
    if (previous)
      await executeStatement(
        'UPDATE site_page_configs SET draft_config=?,published_config=?,updated_by_user_id=?,created_at=?,updated_at=? WHERE id=?',
        [
          encode(previous.draft_config),
          encode(previous.published_config),
          previous.updated_by_user_id,
          previous.created_at,
          previous.updated_at,
          previous.id,
        ]
      );
    else
      await executeStatement(
        "DELETE FROM site_page_configs WHERE page_key='app'"
      );
    await executeStatement('DELETE FROM users WHERE id=?', [gestor.id]);
  }
});

it('CRUD dos hábitos sugeridos e dicas continua real e restrito à administração', async () => {
  const gestor = await criarUsuario('admin'),
    pessoa = await criarUsuario();
  const ids: Array<{ table: string; id: string }> = [];
  try {
    for (const table of ['suggested_habits', 'ai_tips']) {
      const field = table === 'suggested_habits' ? 'name' : 'title';
      const values =
        table === 'suggested_habits'
          ? {
              name: 'Hábito temporário de QA',
              frequency: 'Diariamente',
              is_active: true,
            }
          : {
              title: 'Dica temporária de QA',
              detail: 'Detalhe suficiente para validar o conteúdo.',
              category: 'Geral',
              is_active: true,
            };
      expect(
        (
          await chamar(data.POST, {
            method: 'POST',
            usuario: pessoa,
            params: { table },
            body: { values },
          })
        ).status
      ).toBe(403);
      const created = await chamar(data.POST, {
        method: 'POST',
        usuario: gestor,
        params: { table },
        body: { values },
      });
      expect(created.status).toBe(200);
      const id = (created.json as { data: { id: string } }).data.id;
      ids.push({ table, id });
      const filters = [{ type: 'eq', column: 'id', value: id }];
      expect(
        (
          await chamar(data.GET, {
            usuario: gestor,
            params: { table },
            path: `/api/data/${table}?filters=${encodeURIComponent(JSON.stringify(filters))}`,
          })
        ).status
      ).toBe(200);
      expect(
        (
          await chamar(data.PATCH, {
            method: 'PATCH',
            usuario: gestor,
            params: { table },
            body: {
              values: {
                [field]: 'Conteúdo de QA atualizado',
                is_active: false,
              },
              filters,
            },
          })
        ).status
      ).toBe(200);
      expect(
        (
          await queryRows<Record<string, unknown>>(
            `SELECT ${field},is_active FROM ${table} WHERE id=?`,
            [id]
          )
        )[0]
      ).toMatchObject({ [field]: 'Conteúdo de QA atualizado', is_active: 0 });
      expect(
        (
          await chamar(data.DELETE, {
            method: 'DELETE',
            usuario: gestor,
            params: { table },
            body: { filters },
          })
        ).status
      ).toBe(200);
      expect(
        await queryRows(`SELECT id FROM ${table} WHERE id=?`, [id])
      ).toEqual([]);
    }
  } finally {
    for (const { table, id } of ids)
      await executeStatement(`DELETE FROM ${table} WHERE id=?`, [id]);
    await executeStatement('DELETE FROM users WHERE id IN (?,?)', [
      gestor.id,
      pessoa.id,
    ]);
  }
});
