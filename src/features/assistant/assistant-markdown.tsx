import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

const components: Components = {
  pre: ({ children }) => (
    <pre
      tabIndex={0}
      aria-label='Code block'
      className='max-w-full overflow-x-auto rounded-lg border bg-muted p-4 text-xs leading-6 whitespace-pre [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit'
    >
      {children}
    </pre>
  ),
  code: ({ children, className }) => (
    <code
      className={`rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] ${className ?? ''}`}
    >
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div
      tabIndex={0}
      role='region'
      aria-label='Answer table'
      className='max-w-full overflow-x-auto rounded-lg border'
    >
      <table className='w-full border-collapse text-sm'>{children}</table>
    </div>
  ),
  th: ({ children, style }) => (
    <th
      scope='col'
      style={style}
      className='border-b bg-muted px-3 py-2 text-left font-medium whitespace-nowrap'
    >
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td style={style} className='border-b px-3 py-2 align-top'>
      {children}
    </td>
  ),
  a: ({ children, href }) => (
    <a href={href} className='text-primary underline underline-offset-4'>
      {children}
    </a>
  ),
}

export function AssistantMarkdown({ text }: { text: string }) {
  return (
    <div className='min-w-0 text-sm leading-7 [overflow-wrap:anywhere] [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_h4]:font-semibold [&_h5]:font-semibold [&_h6]:font-semibold [&_img]:max-w-full [&_li+li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&>*+*]:mt-4'>
      <Markdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {text}
      </Markdown>
    </div>
  )
}
