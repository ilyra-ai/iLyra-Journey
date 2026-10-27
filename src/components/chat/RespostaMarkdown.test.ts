import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RespostaMarkdown } from './RespostaMarkdown';

const apresentar = (texto: string) =>
  renderToStaticMarkup(createElement(RespostaMarkdown, { texto }));

describe('apresentação segura das respostas da Lyra', () => {
  it('fecha marcação parcial sem liberar HTML, rastreadores ou links executáveis', () => {
    const renderizar = (texto: string) =>
      renderToStaticMarkup(
        createElement(RespostaMarkdown, { texto, emFluxo: true })
      );
    expect(renderizar('**Descanso')).toContain('<strong>Descanso</strong>');
    const inseguro = renderizar(
      '<img src=x onerror=alert(1)>\n\n![externa](https://example.org/pixel.png)\n\n[abrir](javascript:alert%281%29)'
    );
    expect(inseguro).not.toContain('<img');
    expect(inseguro).not.toContain('onerror=');
    expect(inseguro).not.toContain('href="javascript:');
    expect(inseguro).not.toContain('src="https://example.org');
  });
  it('apresenta negrito, ênfase, listas e parágrafos como conteúdo semântico', () => {
    const html = apresentar('**Cuidado** e *descanso*.\n\n- Água\n- Sono');
    expect(html).toContain('<strong>Cuidado</strong>');
    expect(html).toContain('<em>descanso</em>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Água</li>');
    expect(html).not.toContain('**Cuidado**');
  });

  it('mantém marcação intencionalmente escapada como texto literal', () => {
    const html = apresentar('\\*\\*exemplo literal\\*\\*');
    expect(html).toContain('**exemplo literal**');
    expect(html).not.toContain('<strong>');
  });

  it('mantém código inerte, sem transformar exemplos em elementos executáveis', () => {
    const html = apresentar('```html\n<script>alert(1)</script>\n```');
    expect(html).toMatch(/<pre(?:\s|>)/);
    expect(html).toContain('aria-label="Código da resposta"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('não executa HTML enviado pelo modelo', () => {
    const html = apresentar(
      '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>'
    );
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('onerror=');
  });

  it.each([
    'javascript:alert%281%29',
    'JAVASCRIPT:alert%281%29',
    'data:text/html;base64,PHNjcmlwdD4=',
    'vbscript:msgbox%281%29',
    '//externo.invalid/rastreio',
  ])('neutraliza link inseguro %s', (url) => {
    const html = apresentar(`[Abrir](${url})`);
    expect(html).not.toContain('<a ');
    expect(html).toContain('Abrir');
  });

  it.each([
    'https://example.org/guia',
    '/profile',
    '#sono',
    'mailto:contato@example.org',
  ])('mantém navegação explícita segura para %s', (url) => {
    const html = apresentar(`[Referência](${url})`);
    expect(html).toContain(`href="${url}"`);
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('abre em nova aba');
  });

  it('não carrega imagens externas ou pixels de rastreio da resposta', () => {
    const html = apresentar(
      '![Descrição da imagem](https://example.org/pixel.png)'
    );
    expect(html).toContain('Descrição da imagem');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('src=');
    expect(html).not.toContain('preload');
  });

  it('preserva tabelas e texto riscado do Markdown estendido', () => {
    const html = apresentar(
      '| Rotina | Hora |\n| --- | --- |\n| Sono | 22h |\n\n~~Anterior~~'
    );
    expect(html).toContain('<table>');
    expect(html).toContain('<th>Rotina</th>');
    expect(html).toContain('<td>22h</td>');
    expect(html).toContain('<del>Anterior</del>');
    expect(html).toContain('aria-label="Tabela da resposta"');
  });

  it('não introduz outro título principal da página a partir do texto do modelo', () => {
    const html = apresentar('# Seu plano\n\n## Sono');
    expect(html).toContain('<h3>Seu plano</h3>');
    expect(html).not.toContain('<h1');
    expect(html).not.toContain('<h2');
  });
});
