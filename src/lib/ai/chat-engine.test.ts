import { describe, expect, it } from 'vitest';

import { getAstrologicalContext } from '@/lib/astrology/engine';
import { gerarBriefingLocal } from '@/lib/coach/gerador-local';

import { buildSkillsContext, generateLocalAssistantReply } from './chat-engine';

const ASTROLOGIA = getAstrologicalContext(new Date('2026-10-06T12:00:00Z'));

function responder(
  pergunta: string,
  extra: Partial<Parameters<typeof generateLocalAssistantReply>[1]> = {}
) {
  return generateLocalAssistantReply(pergunta, {
    profile: { first_name: 'Ana', goals: ['sono profundo'] },
    latestMetric: {
      steps: 5200,
      sleep_duration_minutes: 380,
      hrv_ms: 35,
      readiness_score: 61,
      blood_glucose_mgdl: 118,
    },
    astrology: ASTROLOGIA,
    ...extra,
  });
}

describe('assistente local', () => {
  it('respeita grupos desligados sem perder leitura dos registros históricos', () => {
    const gruposFuncionais = {
      registros_saude: false,
      diario_reflexao: false,
      outros_registros: false,
      metas_habitos_plano: false,
      rotinas_praticas: false,
      lembretes_descanso: false,
      dispositivos: false,
      calendario_agenda: false,
    };
    const consultar = (pergunta: string) =>
      responder(pergunta, { gruposFuncionais });
    expect(consultar('agendar consulta')).toContain(
      'agendamentos estão desativados'
    );
    expect(consultar('resumo de hoje')).not.toContain('"Meu dia"');
    expect(
      responder('resumo', { gruposFuncionais, latestMetric: null })
    ).not.toContain('Conecte um wearable');
    expect(consultar('meu sono')).toContain('6h 20m');
    expect(consultar('teste')).not.toContain('são monitorados');
  });

  it('continua respondendo com os sinais disponíveis sem calcular leituras védicas desativadas', () => {
    const texto = responder('Como está meu sono?', { astrology: null });
    expect(texto).toContain('6h 20m');
    expect(texto).not.toMatch(/Lua|Leitura simbólica|Dosha/);
    expect(responder('resumo de hoje', { astrology: null })).not.toMatch(
      /Ciclo Astrológico|Dosha dominante/
    );
  });
  it('recupera relatos fornecidos pela memória sem inventar detalhes ausentes', () => {
    expect(
      responder('Você lembra o nome da minha gata?', {
        memorias: ['A gata da pessoa se chama Aurora.'],
      })
    ).toContain('Aurora');
    expect(responder('Você lembra o nome da minha gata?')).not.toContain(
      'Aurora'
    );
  });

  it('reconhece saudações com acento, inclusive no fim da frase', () => {
    for (const saudacao of ['Olá', 'olá!', 'Oi', 'Bom dia', 'tudo bem?']) {
      expect(responder(saudacao)).toMatch(/^✨ Olá, xuxu!/);
    }
  });

  it('não confunde termos dentro de outras palavras', () => {
    // "lua" dentro de "evolua" e "oi" dentro de "dois" não são intenções.
    const resposta = responder('evolua dois pontos');
    expect(resposta).not.toMatch(/Neste instante astronômico/);
    expect(resposta).not.toContain('Olá, xuxu!');
  });

  it('apresenta os registros de sono, glicose, HRV e passos sem trocar valores', () => {
    expect(responder('Como está meu sono?')).toMatch(
      /6h 20m.*duração isolada não determina/
    );
    expect(responder('minha glicose')).toMatch(
      /118 mg\/dL.*não permite concluir controle da glicemia/
    );
    expect(responder('meu HRV')).toMatch(
      /35 ms e prontidão registrada de 61\/100/
    );
    expect(responder('quero mais passos')).toMatch(
      /5200 passos.*não define uma meta universal/
    );
  });

  it('não diagnostica controle glicêmico ou sobrecarga autonômica por cortes isolados', () => {
    for (const valor of [0, 35, 118]) {
      const contexto = {
        latestMetric: {
          steps: valor,
          sleep_duration_minutes: null,
          hrv_ms: valor,
          readiness_score: null,
          blood_glucose_mgdl: valor,
        },
      };
      const glicose = responder('minha glicose', contexto);
      expect(glicose).toContain(`${valor} mg/dL`);
      expect(glicose).toContain('não informa jejum');
      expect(glicose).not.toMatch(
        /glicemia.*parece controlada|valor indica possível/iu
      );
      const hrv = responder('meu HRV', contexto);
      expect(hrv).toContain(`${valor} ms`);
      expect(hrv).toContain('sem prontidão registrada');
      expect(hrv).not.toMatch(
        /parece sobrecarregado|boa capacidade de adaptação|N\/A|undefined/iu
      );
      const passos = responder('meus passos', contexto);
      expect(passos).toContain(`${valor} passos`);
      expect(passos).not.toMatch(
        /é essencial para melhorar o fluxo|calibre a intensidade/iu
      );
    }
  });

  it('explicita a ausência de glicose, HRV e passos sem inventar compatibilidade', () => {
    const contexto = { latestMetric: null };
    expect(responder('minha glicose', contexto)).toContain(
      'Não tenho registro recente'
    );
    expect(responder('meu HRV', contexto)).toContain(
      'não garante que ele forneça esse dado'
    );
    expect(responder('meus passos', contexto)).toContain(
      'Não tenho contagem recente'
    );
  });

  it('não prescreve suplemento ou infere recuperação pela duração ou pela Lua', () => {
    for (const pergunta of ['Como está meu sono?', '++- Como está meu sono?']) {
      const resposta = responder(pergunta);
      expect(resposta).toContain('Leitura simbólica:');
      expect(resposta).toContain('horários regulares');
      expect(resposta).toContain(
        'https://www.nhlbi.nih.gov/health/sleep-deprivation/healthy-sleep-habits'
      );
      expect(resposta).not.toMatch(
        /ajuste a ingestão|magnésio|sono está adequado|mínimo recomendado/iu
      );
    }
    const semSono = responder('meu sono', { latestMetric: null });
    expect(semSono).toContain('Ainda não tenho dados recentes');
    expect(semSono).toContain('procure avaliação profissional');
  });

  it('preserva registro zero e não declara que muitas horas garantem sono adequado', () => {
    for (const minutos of [0, 600]) {
      const resposta = responder('meu sono', {
        latestMetric: {
          steps: null,
          sleep_duration_minutes: minutos,
          hrv_ms: null,
          readiness_score: null,
        },
      });
      expect(resposta).toContain(minutos === 0 ? '0h 0m' : '10h 0m');
      expect(resposta).toContain('duração isolada não determina');
    }
  });

  it('informa ausência de dados em vez de inventar valores', () => {
    const resposta = responder('resumo de hoje', { latestMetric: null });
    expect(resposta).toMatch(/não encontrei métricas recentes/i);
    expect(responder('meu sono', { latestMetric: null })).toMatch(
      /Ainda não tenho dados recentes do seu sono/
    );
  });

  it('o contexto astrológico usa o céu calculado', () => {
    const resposta = responder('o que diz a lua hoje?');
    expect(resposta).toContain(`Lua em ${ASTROLOGIA.moonSign}`);
    expect(resposta).toContain(ASTROLOGIA.nakshatra);
  });

  it('lista as skills configuradas quando perguntado', () => {
    const resposta = responder('Quais habilidades você tem?', {
      skills: [
        {
          title: 'Sono',
          category: 'protocolos',
          content: 'Orientar higiene do sono.',
        },
      ],
    });
    expect(resposta).toMatch(/1 habilidade configurada/);
    expect(resposta).toMatch(
      /Sono \(protocolos\) — Orientar higiene do sono\./
    );
    expect(responder('Quais habilidades você tem?')).toMatch(
      /ainda não há documentos de habilidade/
    );
  });

  it('cai no resumo determinístico quando não reconhece a intenção', () => {
    const resposta = responder('xyz');
    expect(resposta).toMatch(/^✨ xuxu, podemos explorar sono profundo\./);
    expect(resposta).toContain(
      'O contexto astrológico disponível indica Lua em'
    );
    expect(resposta).not.toContain('são monitorados');
  });
});

describe('contexto de skills', () => {
  it('vazio sem skills e numerado com elas', () => {
    expect(buildSkillsContext()).toBe('');
    expect(buildSkillsContext([])).toBe('');
    expect(
      buildSkillsContext([
        { title: 'A', category: '', content: '  conteúdo A ' },
        { title: 'B', category: 'cat', content: 'conteúdo B' },
      ])
    ).toBe(
      [
        'HABILIDADES, SKILLS E TREINAMENTOS CONFIGURADOS (siga estritamente):',
        '### Skill 1: A\nconteúdo A',
        '### Skill 2: B [cat]\nconteúdo B',
      ].join('\n\n')
    );
  });
});

describe('o dia de hoje no chat', () => {
  const SP = {
    rotulo: 'São Paulo, São Paulo, Brasil',
    latitude: -23.5475,
    longitude: -46.63611,
    fuso: 'America/Sao_Paulo',
  };
  const seuDia = gerarBriefingLocal({
    contexto: {
      userId: 'teste',
      data: '2026-10-14',
      perfil: {
        nascimento: { data: '1990-05-15', hora: '08:30', local: SP },
        moradia: SP,
        localDoDia: SP,
        faltando: [],
      },
      pessoa: { nome: 'Ana', objetivos: [], ciclo: null },
      hoje: null,
      historico: [],
    },
    agora: new Date('2026-10-14T09:00:00Z'),
  });

  it('responde com os períodos e focos do coach', () => {
    const resposta = responder('como vai ser meu dia?', { seuDia });
    expect(resposta).toContain(`Seu dia (São Paulo): ${seuDia.manchete}.`);
    for (const periodo of seuDia.periodos) {
      expect(resposta).toContain(`${periodo.nome} (${periodo.horario})`);
    }
    expect(resposta).toContain('"Meu dia"');
  });

  it('sem o briefing, explica o que falta no perfil', () => {
    expect(responder('como vai ser meu dia?', { seuDia: null })).toContain(
      'escolha no perfil a cidade onde você mora'
    );
  });
});
