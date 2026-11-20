import { defaultUrlTransform } from 'react-markdown';
import { memo } from 'react';
import { Streamdown, type Components } from 'streamdown';
import remarkGfm from 'remark-gfm';

/** Links são navegação explícita; imagens de mensagens não disparam rastreadores. */
function linkSeguro(url: string) {
  const segura = defaultUrlTransform(url);
  return /^(https?:|mailto:|\/(?!\/)|#)/i.test(segura) ? segura : undefined;
}

interface NoMarkdown {
  type: string;
  children?: NoMarkdown[];
}
/** Remove HTML da árvore antes da conversão, mantendo exemplos de código. */
function ignorarHtml() {
  return (arvore: NoMarkdown) => {
    const limpar = (no: NoMarkdown) => {
      if (!no.children) return;
      no.children = no.children.filter((filho) => filho.type !== 'html');
      no.children.forEach(limpar);
    };
    limpar(arvore);
  };
}

const componentes: Components = {
  strong: ({ children }) => <strong>{children}</strong>,
  ul: ({ children }) => <ul>{children}</ul>,
  ol: ({ children, start }) => <ol start={start}>{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  pre: ({ children }) => (
    <pre tabIndex={0} role="region" aria-label="Código da resposta">
      {children}
    </pre>
  ),
  code: ({ children }) => <code>{children}</code>,
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => <th>{children}</th>,
  td: ({ children }) => <td>{children}</td>,
  h1: ({ children }) => <h3>{children}</h3>,
  h2: ({ children }) => <h3>{children}</h3>,
  h3: ({ children }) => <h3>{children}</h3>,
  h4: ({ children }) => <h4>{children}</h4>,
  h5: ({ children }) => <h4>{children}</h4>,
  h6: ({ children }) => <h4>{children}</h4>,
  a: ({ href, children }) =>
    href ? (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
    ) : (
      <span>{children}</span>
    ),
  img: ({ alt }) => <span>{alt || 'Imagem mencionada na resposta'}</span>,
  table: ({ children }) => (
    <div
      role="region"
      aria-label="Tabela da resposta"
      tabIndex={0}
      className="max-w-full overflow-x-auto rounded border border-border focus-visible:outline-2 focus-visible:outline-ring"
    >
      <table>{children}</table>
    </div>
  ),
};

/** O texto original continua no histórico e na cópia; só a apresentação muda. */
export const RespostaMarkdown = memo(function RespostaMarkdown({
  texto,
  emFluxo = false,
}: {
  texto: string;
  emFluxo?: boolean;
}) {
  return (
    // Leitura rápida para leigos (tarefa 230): a Inter, fonte de leitura de
    // interface já carregada, em 15 px com entrelinha 1,6, no lugar da
    // Imprima larga com entrelinha 1,87 do tema celestial; parágrafos e
    // títulos internos mais próximos e contidos.
    <div className="min-w-0 max-w-[68ch] break-words font-[family-name:var(--font-inter)] text-[0.9375rem] leading-[1.6] text-foreground [overflow-wrap:anywhere] [&>*+*]:mt-2.5 [&_p]:whitespace-pre-wrap [&_strong]:font-semibold [&_em]:italic [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-[0.9375rem] [&_h3]:font-semibold [&_h4]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li+li]:mt-1 [&_li>ul]:mt-1 [&_li>ol]:mt-1 [&_a]:rounded-xs [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-ring [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-xs [&_code]:rounded-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.9em] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:text-left [&_table]:text-sm [&_th]:border-b [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:font-semibold [&_td]:border-b [&_td]:border-border [&_td]:p-2 [&_hr]:border-border">
      <Streamdown
        mode={emFluxo ? 'streaming' : 'static'}
        isAnimating={emFluxo}
        controls={false}
        rehypePlugins={[]}
        remarkPlugins={[remarkGfm, ignorarHtml]}
        skipHtml
        urlTransform={linkSeguro}
        components={componentes}
      >
        {texto}
      </Streamdown>
    </div>
  );
});
