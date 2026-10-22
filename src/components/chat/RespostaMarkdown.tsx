import { memo } from 'react';
import Markdown, { defaultUrlTransform, type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Links são navegação explícita; imagens de mensagens não disparam rastreadores. */
function linkSeguro(url: string) {
  const segura = defaultUrlTransform(url);
  return /^(https?:|mailto:|\/(?!\/)|#)/i.test(segura) ? segura : undefined;
}

const componentes: Components = {
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
}: {
  texto: string;
}) {
  return (
    <div className="min-w-0 break-words text-body leading-7 text-foreground [overflow-wrap:anywhere] [&>*+*]:mt-3 [&_p]:whitespace-pre-wrap [&_strong]:font-semibold [&_em]:italic [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li+li]:mt-1 [&_li>ul]:mt-1 [&_li>ol]:mt-1 [&_a]:rounded-xs [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-ring [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-xs [&_code]:rounded-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.9em] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:text-left [&_table]:text-sm [&_th]:border-b [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:font-semibold [&_td]:border-b [&_td]:border-border [&_td]:p-2 [&_hr]:border-border">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={linkSeguro}
        components={componentes}
      >
        {texto}
      </Markdown>
    </div>
  );
});
