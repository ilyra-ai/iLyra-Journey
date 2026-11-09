#!/usr/bin/env node
/** Baseline somente leitura; imprime caminhos e agregados, nunca dados pessoais ou segredos. */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { loadEnvFile } from './lib/env-file.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const comando = (programa, argumentos) =>
  execFileSync(programa, argumentos, { cwd: raiz, encoding: 'utf8' }).trim();
const referencias = (expressao) => {
  try {
    return comando('rg', [
      '-l',
      expressao,
      'src',
      'modules',
      'scripts',
      'mysql',
    ]).split('\n');
  } catch (erro) {
    if (erro.status === 1) return [];
    throw erro;
  }
};

await loadEnvFile(raiz, '.env.local');
await loadEnvFile(raiz, '.env');
const banco = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectTimeout: 10_000,
});

try {
  await banco.query('SET TRANSACTION READ ONLY');
  await banco.beginTransaction();
  const consultar = async (sql) => (await banco.query(sql))[0];
  const resultado = {
    instante: new Date().toISOString(),
    head: comando('git', ['rev-parse', 'HEAD']),
    branch: comando('git', ['branch', '--show-current']),
    alteracoes: comando('git', ['status', '--short']).split('\n'),
    stashes: comando('git', ['stash', 'list']).split('\n'),
    node: process.version,
    mysql: await consultar('SELECT VERSION() AS versao'),
    credenciaisPresentes: Object.fromEntries(
      [
        'AUTH_SECRET',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'APPLE_CLIENT_ID',
        'APPLE_TEAM_ID',
        'APPLE_KEY_ID',
        'APPLE_PRIVATE_KEY',
      ].map((nome) => [nome, Boolean(process.env[nome]?.trim())])
    ),
    assinaturas: await consultar(
      'SELECT p.plan_key, s.status, s.source, COUNT(*) AS total FROM user_subscriptions s JOIN subscription_plans p ON p.id=s.plan_id GROUP BY p.plan_key,s.status,s.source'
    ),
    credenciaisDePagamento: await consultar(
      'SELECT provider,environment,secret_ciphertext IS NOT NULL AS tem_segredo,webhook_secret_ciphertext IS NOT NULL AS tem_webhook,last_check_ok FROM payment_provider_credentials'
    ),
    ambientesDePagamento: await consultar(
      'SELECT provider,active_environment,enabled FROM payment_provider_settings'
    ),
    precosStripe: await consultar(
      'SELECT environment,COUNT(*) AS total,SUM(monthly_price_id IS NOT NULL) AS mensal,SUM(annual_price_id IS NOT NULL) AS anual FROM stripe_plan_prices GROUP BY environment'
    ),
    paginasPublicadas: await consultar(
      'SELECT page_key,JSON_LENGTH(draft_config) AS campos_rascunho,JSON_LENGTH(published_config) AS campos_publicados,JSON_CONTAINS(draft_config,published_config) AS rascunho_contem_publicado FROM site_page_configs'
    ),
    tabelasFinanceiras: await consultar(
      "SELECT TABLE_NAME,TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND (TABLE_NAME LIKE '%invoice%' OR TABLE_NAME LIKE '%billing%' OR TABLE_NAME LIKE '%webhook%')"
    ),
    grupos: await consultar(
      'SELECT switch_key,enabled FROM platform_feature_switches ORDER BY switch_key'
    ),
    consumidores: {
      planos: referencias(
        'PlanFeatureKey|PlanFeatureGate|RECURSOS_DA_ROTA|isPlanFeatureEnabled|plan_key|user_subscriptions|stripe_plan_prices'
      ),
      mapas: referencias(
        'TipoDeMapa|TIPOS_DE_MAPA|samadhi|quantum|vedico|Samādhi|Védico'
      ),
      publicacaoVisual: referencias(
        'site_page_configs|site-page-config|lyra-customaze-ui-ux'
      ),
      protecoes: referencias(
        'requisicaoDeMesmaOrigem|consent_records|Content-Security-Policy|signSessionToken|exigirDentroDoLimite'
      ),
    },
  };
  console.log(JSON.stringify(resultado, null, 2));
  await banco.rollback();
} finally {
  await banco.end();
}
