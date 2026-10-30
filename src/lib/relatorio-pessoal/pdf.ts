import PDFDocument from 'pdfkit';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { create, type Font } from 'fontkit';
import type { RelatorioPessoal } from './esquema';
const regular = path.join(
  process.cwd(),
  'src/assets/fonts/source-sans-3/SourceSans3-Regular.ttf'
);
const forte = path.join(
  process.cwd(),
  'src/assets/fonts/source-sans-3/SourceSans3-Semibold.ttf'
);
const numero = (n: number | null | undefined) =>
  n === null || n === undefined
    ? 'Sem registro'
    : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(n);
const data = (s: string) => s.split('-').reverse().join('/');
/** Representa cada glifo não coberto explicitamente; não perde caracteres silenciosamente. */
export function textoComCobertura(
  texto: string,
  font: Pick<Font, 'hasGlyphForCodePoint'>
) {
  return Array.from(texto.normalize('NFC'))
    .map((c) =>
      c === '\n' || c === '\t' || font.hasGlyphForCodePoint(c.codePointAt(0)!)
        ? c
        : `[U+${c.codePointAt(0)!.toString(16).toUpperCase()}]`
    )
    .join('');
}
export async function gerarPdfPessoal(r: RelatorioPessoal): Promise<Buffer> {
  const font = create(readFileSync(regular)) as Font;
  const doc = new PDFDocument({
    size: 'A4',
    pdfVersion: '1.7',
    margins: { top: 78, bottom: 66, left: 48, right: 48 },
    font: regular,
    bufferPages: true,
    tagged: true,
    lang: 'pt-BR',
    displayTitle: true,
    info: {
      Title: 'Relatório pessoal - Lyra MetaCare',
      Author: 'Lyra MetaCare',
      Subject: 'Registros selecionados pelo titular',
    },
  });
  const chunks: Buffer[] = [];
  const output = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (b) => chunks.push(Buffer.from(b)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  doc.registerFont('corpo', regular).registerFont('forte', forte);
  const width = doc.page.width - 96,
    rodape = doc.page.height - 66;
  const header = () => {
    doc.markContent('Artifact', { type: 'Pagination' });
    doc
      .fillColor('#087d82')
      .font('forte')
      .fontSize(10)
      .text('Lyra MetaCare | Relatório pessoal', 48, 32, { lineBreak: false });
    doc.endMarkedContent();
    doc.x = 48;
    doc.y = 78;
  };

  function espaco(h: number) {
    if (doc.y + h > rodape) doc.addPage();
  }
  function texto(s: string, tipo: 'H1' | 'H2' | 'H3' | 'P' = 'P') {
    const size =
      tipo === 'H1' ? 25 : tipo === 'H2' ? 17 : tipo === 'H3' ? 12 : 10;
    espaco(size * 2 + 8);
    doc
      .font(tipo === 'P' ? 'corpo' : 'forte')
      .fontSize(size)
      .fillColor(tipo === 'P' ? '#263c46' : '#153b44');
    const original = s + ' ',
      visivel = textoComCobertura(original, font);
    doc.addStructure(
      doc.struct(tipo, { actual: original }, () => {
        doc.text(visivel, 48, doc.y, { width, lineGap: 3 });
      })
    );
    doc.moveDown(0.55);
  }
  function pagina(titulo: string) {
    doc.addPage();
    texto(titulo, 'H2');
  }
  texto('Seu período, em perspectiva', 'H1');
  texto(
    `${data(r.selecao.inicio)} a ${data(r.selecao.fim)} | ${r.dias.length} dias | Fuso: ${r.fuso}`
  );
  texto('Compartilhamento escolhido por você', 'H2');
  texto(
    'Este arquivo reúne somente as categorias selecionadas. Conversas, cadastros de terceiros e dados de categorias não selecionadas não são consultados. Não existe envio automático ou link público. Revise o arquivo antes de compartilhar.'
  );
  texto('O que está incluído', 'H2');
  texto(
    [
      ...r.resumos.map((s) => s.nome),
      ...(r.selecao.reflexoes ? ['Reflexões pessoais'] : []),
      ...(r.selecao.acontecimentos ? ['Acontecimentos pessoais'] : []),
      ...r.acompanhamentos.map((a) => `Acompanhamento: ${a.nome}`),
    ].join('; ') + '.'
  );
  texto(
    r.selecao.notas
      ? 'Notas pessoais incluídas por seleção explícita.'
      : 'Notas pessoais não incluídas.'
  );
  texto('Como ler este relatório', 'H2');
  texto(
    'Registros numéricos consolidados, relatos pessoais e síntese descritiva aparecem separados. Um campo ausente permanece sem registro; zero válido continua sendo zero. As medianas descrevem apenas os valores disponíveis, sem preencher lacunas, emitir diagnóstico ou comprovar efeito de uma mudança.'
  );
  texto(
    'Origem: registros diários consolidados do aplicativo, reflexões da noite e diário de acontecimentos, conforme sua seleção. Valores consolidados podem ser manuais ou importados; este relatório não infere um dispositivo de origem. Datas mantêm a convenção do registro original e não são deslocadas para aproximar acontecimentos e sono.'
  );
  texto(
    `Extraído em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: r.fuso }).format(new Date(r.extraidoEm))}. Os registros podem ser corrigidos após esta extração.`
  );
  texto(
    'Fontes tipográficas incorporadas. Se um caractere não tiver glifo disponível, sua posição será representada pelo código Unicode [U+...], preservando o conteúdo original no texto acessível.'
  );
  for (const s of r.resumos) {
    pagina(s.nome);
    texto('Registros numéricos consolidados', 'H3');
    texto(
      `Unidade: ${s.unidade}. ${s.n} de ${r.dias.length} dias com valor válido; ${s.ausentes} sem registro válido.`
    );
    texto('Síntese descritiva local', 'H3');
    texto(
      `Mediana: ${numero(s.mediana)}${s.mediana === null ? '' : ' ' + s.unidade}. Mínimo: ${numero(s.minimo)}. Máximo: ${numero(s.maximo)}. Não é avaliação clínica nem interpretação por modelo de IA.`
    );
    if (s.n) {
      espaco(145);
      const y = doc.y + 15,
        h = 75,
        x = 75,
        w = width - 55,
        min = s.minimo!,
        max = s.maximo!,
        range = max - min || 1;
      doc.markContent('Artifact', { type: 'Layout' });
      doc
        .strokeColor('#a9bdc2')
        .lineWidth(0.5)
        .moveTo(x, y)
        .lineTo(x, y + h)
        .lineTo(x + w, y + h)
        .stroke();
      doc
        .font('corpo')
        .fontSize(8)
        .fillColor('#415b65')
        .text(numero(max), 48, y, { lineBreak: false })
        .text(numero(min), 48, y + h - 7, { lineBreak: false });
      r.dias.forEach((d, i) => {
        const v = d.valores[s.campo];
        if (v !== null && v !== undefined) {
          const px = x + (i * w) / Math.max(1, r.dias.length - 1),
            py = y + h - (max === min ? h / 2 : ((v - min) * h) / range);
          doc.circle(px, py, 2.1).fill('#087d82');
        }
      });
      doc
        .fontSize(8)
        .text(data(r.selecao.inicio), x, y + h + 8, { lineBreak: false })
        .text(data(r.selecao.fim), x + w - 53, y + h + 8, { lineBreak: false });
      doc.endMarkedContent();
      doc.x = 48;
      doc.y = y + h + 32;
      texto(
        'Cada ponto é um registro na data indicada; dias ausentes não recebem ponto. Os valores completos estão abaixo.'
      );
    }
    texto('Datas e valores', 'H3');
    for (const d of r.dias) {
      espaco(20);
      const v = d.valores[s.campo];
      texto(
        `${data(d.data)} | ${numero(v)}${v === null || v === undefined ? '' : ' ' + s.unidade}`
      );
    }
  }
  if (r.selecao.reflexoes) {
    pagina('Reflexões pessoais');
    texto(
      'Fonte: reflexão da noite. Escalas pessoais de 1 a 5 para emocional, corpo e espiritual; não são medições clínicas.'
    );
    for (const d of r.dias) {
      texto(data(d.data), 'H3');
      const f = d.reflexao;
      texto(
        f
          ? `Emocional: ${f.emocional}/5. Corpo: ${f.corpo}/5. Espiritual: ${f.espiritual}/5.`
          : 'Sem reflexão registrada.'
      );
      if (f && r.selecao.notas)
        texto(f.nota ? `Nota pessoal: ${f.nota}` : 'Sem nota pessoal.');
    }
  }
  if (r.selecao.acontecimentos) {
    pagina('Acontecimentos pessoais');
    texto(
      'Fonte: diário pessoal de acontecimentos. Ausência de relato não significa ausência de acontecimento. Revisões invalidadas não são contadas como confirmação de ausência.'
    );
    for (const d of r.dias) {
      texto(data(d.data), 'H3');
      const a = d.acontecimentos;
      texto(
        a
          ? `${a.revisado ? 'Dia revisado explicitamente.' : 'Revisão pendente de nova confirmação.'} Marcadores: ${a.marcadores.length ? a.marcadores.join('; ') : a.revisado ? 'nenhum informado' : 'desconhecidos'}.`
          : 'Dia sem revisão registrada.'
      );
      if (a && r.selecao.notas)
        texto(a.nota ? `Nota pessoal: ${a.nota}` : 'Sem nota pessoal.');
    }
  }
  for (const a of r.acompanhamentos) {
    pagina(`Acompanhamento: ${a.nome}`);
    texto(
      `Fonte: acompanhamento pessoal criado por você${a.arquivado ? ' (arquivado)' : ''}. Cada resposta mantém o rótulo e a escala em que foi dada, sem conversão entre escalas. Relatos pessoais, não medições clínicas. Períodos sem resposta não aparecem e não significam zero.`
    );
    texto(
      `${a.respostas.length} ${a.respostas.length === 1 ? 'resposta' : 'respostas'} no período.`
    );
    for (const x of a.respostas) {
      espaco(20);
      texto(
        `${x.frequencia === 'semanal' ? `Semana de ${data(x.data)}` : data(x.data)} | ${x.rotulo} | escala ${x.escala}`
      );
      if (r.selecao.notas)
        texto(x.nota ? `Nota pessoal: ${x.nota}` : 'Sem nota pessoal.');
    }
  }
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    header();
    const margemInferior = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.markContent('Artifact', { type: 'Pagination' });
    doc
      .font('corpo')
      .fontSize(8)
      .fillColor('#415b65')
      .text(
        `Pessoal e confidencial | ${data(r.selecao.inicio)} a ${data(r.selecao.fim)} | ${i + 1} / ${pages.count}`,
        48,
        doc.page.height - 36,
        { width, lineBreak: false }
      );
    doc.endMarkedContent();
    doc.page.margins.bottom = margemInferior;
  }
  doc.end();
  return output;
}
