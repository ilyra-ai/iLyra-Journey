import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  criarUsuario,
  definirDireito,
} from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { executeStatement } from '@/lib/mysql/pool';
import { lerLinhaDoTempo } from '@/lib/linha-do-tempo/servico';
import { ITENS_POR_PAGINA, type Consulta } from '@/lib/linha-do-tempo/esquema';
import {
  criarAcompanhamento,
  salvarRegistro,
} from '@/lib/acompanhamentos/servico';
import { dataLocal } from '@/lib/astrology/tempo';
import { somarDias } from '@/lib/acontecimentos/analise';
import * as rota from './linha-do-tempo/route';

const agora = new Date('2026-10-29T15:00:00Z');
const dia = '2026-10-28';
const consulta = (extra: Partial<Consulta> = {}): Consulta => ({
  inicio: dia,
  fim: dia,
  pagina: 0,
  ...extra,
});
async function recurso(habilitado: boolean, chave: string) {
  await executeStatement(
    "UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=? WHERE p.plan_key='free' AND f.feature_key=?",
    [habilitado, chave]
  );
}
/** Um registro real em cada origem, todos no dia 28/10 (UTC). */
async function popular(
  userId: string,
  session: Parameters<typeof criarAcompanhamento>[0]
) {
  await executeStatement(
    'INSERT INTO daily_metrics(id,user_id,date,sleep_duration_minutes,energy_level,steps) VALUES(?,?,?,?,?,?)',
    [randomUUID(), userId, dia, 0, 4, 5321]
  );
  await executeStatement(
    'INSERT INTO daily_reflections(id,user_id,reflection_date,emotional_score,body_score,spiritual_score,note) VALUES(?,?,?,?,?,?,?)',
    [randomUUID(), userId, dia, 4, 3, 5, 'NOTA-SECRETA-REFLEXAO']
  );
  await executeStatement(
    "INSERT INTO user_assessments(id,user_id,assessment_type,score_value,notes,created_at) VALUES(?,?,'mood',4,'NOTA-SECRETA-AVALIACAO','2026-10-28 09:15:00')",
    [randomUUID(), userId]
  );
  const t = await criarAcompanhamento(
    session,
    {
      pedidoId: randomUUID(),
      nome: 'Concentração',
      descricao: '',
      frequencia: 'diaria',
      escala: {
        minimo: 1,
        maximo: 5,
        rotulos: [
          { valor: 1, rotulo: 'Baixa' },
          { valor: 5, rotulo: 'Alta' },
        ],
      },
    },
    agora
  );
  await salvarRegistro(
    userId,
    t.id,
    {
      idRegistro: randomUUID(),
      data: dia,
      valor: 5,
      nota: 'NOTA-SECRETA-ACOMPANHAMENTO',
      versao: 0,
    },
    agora
  );
  await executeStatement(
    "INSERT INTO breathing_sessions(id,user_id,session_date,technique,cycles,duration_seconds,minutes_logged,created_at) VALUES(?,?,?,'quadrada',5,300,5,'2026-10-28 07:40:00')",
    [randomUUID(), userId, dia]
  );
  await executeStatement(
    "INSERT INTO focus_sessions(id,user_id,kind,target_seconds,state,elapsed_ms,started_at,created_at,ended_at,perception,note) VALUES(?,?,'foco',1500,'completed',1500000,'2026-10-28 14:00:00','2026-10-28 14:00:00','2026-10-28 14:25:00',4,'NOTA-SECRETA-FOCO')",
    [randomUUID(), userId]
  );
  const rotina = randomUUID();
  await executeStatement(
    "INSERT INTO personal_routines(id,user_id,title,days,steps) VALUES(?,?,'Manhã leve','[1,2,3]','[]')",
    [rotina, userId]
  );
  await executeStatement(
    "INSERT INTO personal_routine_runs(id,routine_id,user_id,title,steps,state,created_at,updated_at) VALUES(?,?,?,'Manhã leve',?,'encerrada','2026-10-28 06:30:00','2026-10-28 06:50:00')",
    [
      randomUUID(),
      rotina,
      userId,
      JSON.stringify([
        { id: 'a', texto: 'Água', estado: 'concluido' },
        { id: 'b', texto: 'Alongar', estado: 'pulado' },
      ]),
    ]
  );
  await executeStatement(
    "INSERT INTO goals(id,user_id,title,status,deadline,created_at) VALUES(?,?,'Dormir melhor','in_progress',?, '2026-10-28 20:00:00')",
    [randomUUID(), userId, dia]
  );
  const marcador = randomUUID();
  await executeStatement(
    "INSERT INTO personal_event_markers(id,user_id,name) VALUES(?,?,'Viagem')",
    [marcador, userId]
  );
  await executeStatement(
    "INSERT INTO personal_event_days(user_id,event_date,note,confirmed) VALUES(?,?,'NOTA-SECRETA-ACONTECIMENTO',TRUE)",
    [userId, dia]
  );
  await executeStatement(
    'INSERT INTO personal_event_day_markers(user_id,event_date,marker_id) VALUES(?,?,?)',
    [userId, dia, marcador]
  );
  await executeStatement(
    "INSERT INTO rest_periods(id,user_id,start_date,planned_end,timezone,active_since) VALUES(?,?,?,?,'UTC','2026-10-28 10:00:00')",
    [randomUUID(), userId, dia, '2026-11-02']
  );
  const exp = randomUUID();
  await executeStatement(
    "INSERT INTO personal_experiments(id,user_id,title,objective,chosen_change,baseline_start,baseline_end,observation_start,observation_end,timezone) VALUES(?,?,'Leitura à noite','Observar','Ler','2026-10-20','2026-10-27',?,'2026-11-05','UTC')",
    [exp, userId, dia]
  );
  await executeStatement(
    "INSERT INTO personal_experiment_notes(id,experiment_id,user_id,note_date,followed,perception,note) VALUES(?,?,?,?,'sim',4,'NOTA-SECRETA-EXPERIENCIA')",
    [randomUUID(), exp, userId, dia]
  );
}

describe('linha do tempo pessoal unificada com MySQL real', () => {
  // Os testes de janela usam o histórico de 30 dias do Free; desde a tarefa
  // 224 a matriz parte do acesso do Care, então o limite é declarado aqui.
  let restaurarJanela: () => Promise<void>;
  beforeAll(async () => {
    restaurarJanela = await definirDireito('free', 'metrics_history_days', {
      enabled: true,
      quota: 30,
      reset: 'rolling',
    });
  });
  afterAll(async () => {
    await restaurarJanela();
  });
  it('exige sessão e valida a consulta', async () => {
    expect((await chamar(rota.GET, { usuario: null })).status).toBe(401);
    const u = await criarUsuario(),
      hoje = dataLocal(new Date(), 'UTC');
    for (const q of [
      `inicio=${somarDias(hoje, -40)}&fim=${hoje}`,
      `inicio=${hoje}&fim=${somarDias(hoje, -1)}`,
      'assuntos=senhas',
      'assuntos=metas,metas',
      'pagina=-1',
      'inicio=2026-02-30',
    ])
      expect(
        (
          await chamar(rota.GET, {
            usuario: u,
            path: `/api/linha-do-tempo?${q}`,
          })
        ).status
      ).toBe(400);
    expect(
      (
        await chamar(rota.GET, {
          usuario: u,
          path: `/api/linha-do-tempo?inicio=${somarDias(hoje, 1)}&fim=${somarDias(hoje, 1)}`,
        })
      ).status
    ).toBe(400);
    const r = await chamar(rota.GET, { usuario: u });
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(r.json).toMatchObject({
      inicio: hoje,
      fim: hoje,
      itens: [],
      total: 0,
    });
  });

  it('reúne todas as origens do dia em ordem, sem duplicar e sem expor notas', async () => {
    const u = await criarUsuario(),
      outro = await criarUsuario();
    await popular(u.id, u.session);
    await popular(outro.id, outro.session);
    const r = await lerLinhaDoTempo(u.session, consulta(), agora);
    expect(r.total).toBe(13);
    expect(new Set(r.itens.map((i) => i.chave)).size).toBe(r.itens.length);
    expect(r.itens.map((i) => [i.origem, i.hora])).toEqual([
      ['registro', null],
      ['reflexao', null],
      ['acompanhamento', null],
      ['meta', null],
      ['acontecimento', null],
      ['descanso', null],
      ['experiencia', null],
      ['experiencia', null],
      ['rotina', '06:30'],
      ['respiracao', '07:40'],
      ['avaliacao', '09:15'],
      ['foco', '14:00'],
      ['meta', '20:00'],
    ]);
    const por = (o: string) => r.itens.filter((i) => i.origem === o);
    expect(por('registro')[0]).toMatchObject({
      resumo: '3 campos registrados no registro consolidado',
    });
    // Zero de sono é valor válido; ausência não vira zero.
    expect(por('registro')[0].detalhes).toContainEqual({
      rotulo: 'Sono da última noite',
      valor: '0 min',
    });
    expect(por('acompanhamento')[0]).toMatchObject({
      titulo: 'Concentração',
      resumo: '5 · Alta (escala 1 a 5)',
    });
    expect(por('acompanhamento')[0].destino).toMatch(
      /^\/acompanhamentos\?acompanhamento=/
    );
    expect(por('rotina')[0].resumo).toBe(
      'Encerrada · 1 de 2 passos concluídos'
    );
    expect(por('acontecimento')[0].resumo).toBe('Viagem');
    expect(
      por('experiencia')
        .map((i) => i.titulo)
        .sort()
    ).toEqual([
      'Início da experiência: Leitura à noite',
      'Relato: Leitura à noite',
    ]);
    const texto = JSON.stringify(r);
    expect(texto).not.toContain('NOTA-SECRETA');
    expect(texto).not.toContain(outro.id);

    // Filtro por assunto e totais por assunto.
    const praticas = await lerLinhaDoTempo(
      u.session,
      consulta({ assuntos: ['praticas'] }),
      agora
    );
    expect(praticas.itens.map((i) => i.origem).sort()).toEqual([
      'foco',
      'respiracao',
      'rotina',
    ]);
    expect(
      Object.fromEntries(praticas.assuntos.map((a) => [a.id, a.total]))
    ).toEqual({
      registros: 4,
      praticas: 3,
      metas: 2,
      acontecimentos: 2,
      experiencias: 2,
    });

    // Edições e exclusões nas origens aparecem na próxima consulta.
    await executeStatement('DELETE FROM daily_reflections WHERE user_id=?', [
      u.id,
    ]);
    await executeStatement(
      "UPDATE goals SET title='Dormir antes das 23h' WHERE user_id=?",
      [u.id]
    );
    const depois = await lerLinhaDoTempo(u.session, consulta(), agora);
    expect(depois.total).toBe(12);
    expect(depois.itens.some((i) => i.origem === 'reflexao')).toBe(false);
    expect(
      depois.itens
        .filter((i) => i.origem === 'meta')
        .map((i) => i.titulo)
        .sort()
    ).toEqual([
      'Meta criada: Dormir antes das 23h',
      'Prazo da meta: Dormir antes das 23h',
    ]);
  });

  it('usa o fuso do perfil para data e horário dos instantes', async () => {
    const u = await criarUsuario();
    await executeStatement(
      "UPDATE profiles SET residence_timezone='America/Sao_Paulo',residence_location='São Paulo',residence_latitude=-23.55,residence_longitude=-46.63 WHERE id=?",
      [u.id]
    );
    await executeStatement(
      "INSERT INTO user_assessments(id,user_id,assessment_type,score_value,created_at) VALUES(?,?,'who5',60,'2026-10-29 01:30:00')",
      [randomUUID(), u.id]
    );
    const dia28 = await lerLinhaDoTempo(u.session, consulta(), agora);
    expect(dia28.fuso).toBe('America/Sao_Paulo');
    expect(dia28.itens).toEqual([
      expect.objectContaining({
        origem: 'avaliacao',
        data: dia,
        hora: '22:30',
      }),
    ]);
    const dia29 = await lerLinhaDoTempo(
      u.session,
      consulta({ inicio: '2026-10-29', fim: '2026-10-29' }),
      agora
    );
    expect(dia29.total).toBe(0);
  });

  it('pagina de forma estável sem perder nem repetir itens', async () => {
    const u = await criarUsuario();
    for (let i = 0; i < ITENS_POR_PAGINA + 5; i++)
      await executeStatement(
        "INSERT INTO breathing_sessions(id,user_id,session_date,technique,cycles,duration_seconds,minutes_logged,created_at) VALUES(?,?,?,'4-7-8',2,38,1,?)",
        [
          randomUUID(),
          u.id,
          somarDias(dia, -(i % 3)),
          `${somarDias(dia, -(i % 3))} 08:${String(i).padStart(2, '0')}:00`,
        ]
      );
    const q = consulta({ inicio: somarDias(dia, -2) });
    const p0 = await lerLinhaDoTempo(u.session, q, agora),
      p1 = await lerLinhaDoTempo(u.session, { ...q, pagina: 1 }, agora);
    expect(p0.total).toBe(ITENS_POR_PAGINA + 5);
    expect(p0.itens).toHaveLength(ITENS_POR_PAGINA);
    expect(p0.proximaPagina).toBe(1);
    expect(p1.itens).toHaveLength(5);
    expect(p1.proximaPagina).toBeNull();
    const chaves = [...p0.itens, ...p1.itens].map((i) => i.chave);
    expect(new Set(chaves).size).toBe(ITENS_POR_PAGINA + 5);
    // Dias do mais recente ao mais antigo; horários crescentes dentro do dia.
    const todos = [...p0.itens, ...p1.itens];
    for (let i = 1; i < todos.length; i++) {
      const a = todos[i - 1],
        b = todos[i];
      expect(a.data > b.data || (a.data === b.data && a.hora! <= b.hora!)).toBe(
        true
      );
    }
  });

  it('respeita os recursos do plano e o histórico disponível', async () => {
    const u = await criarUsuario();
    await popular(u.id, u.session);
    await recurso(false, 'guided_breathing');
    await recurso(false, 'goal_progress_tracking');
    try {
      const r = await lerLinhaDoTempo(u.session, consulta(), agora);
      expect(r.origensIndisponiveis.sort()).toEqual([
        'meditacao',
        'meta',
        'respiracao',
      ]);
      expect(
        r.itens.some((i) => ['meta', 'respiracao'].includes(i.origem))
      ).toBe(false);
      expect(r.assuntos.find((a) => a.id === 'metas')).toMatchObject({
        disponivel: false,
        selecionado: false,
        total: 0,
      });
      await expect(
        lerLinhaDoTempo(u.session, consulta({ assuntos: ['metas'] }), agora)
      ).rejects.toMatchObject({ statusCode: 403 });
    } finally {
      await recurso(true, 'guided_breathing');
      await recurso(true, 'goal_progress_tracking');
    }
    await expect(
      lerLinhaDoTempo(
        u.session,
        consulta({ inicio: '2026-09-01', fim: '2026-09-02' }),
        agora
      )
    ).rejects.toMatchObject({ statusCode: 403 });
    await recurso(false, 'metrics_history_days');
    try {
      expect((await chamar(rota.GET, { usuario: u })).status).toBe(403);
    } finally {
      await recurso(true, 'metrics_history_days');
    }
  });
});
