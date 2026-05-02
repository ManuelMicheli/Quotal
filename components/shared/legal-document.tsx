import * as React from 'react'

import { cn } from '@/lib/utils'

type TocItem = { id: string; label: string }

/**
 * LegalDocument — editorial shell for long-form legal pages.
 *
 * Renders a hero block (eyebrow / title / updated-at) and a 12-col layout
 * with sticky table-of-contents on lg+. Children are rendered inside a
 * refined prose container that styles raw `h2`/`h3`/`p`/`a`/`ul` etc. — no
 * `prose` plugin needed.
 */
export function LegalDocument({
  eyebrow,
  title,
  updatedAt,
  toc,
  children,
}: {
  eyebrow?: string
  title: string
  updatedAt?: string
  toc?: TocItem[]
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16">
      {toc?.length ? (
        <aside className="hidden lg:block">
          <nav
            aria-label="Indice"
            className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2"
          >
            <p className="eyebrow mb-3">In questa pagina</p>
            <ol className="flex flex-col gap-1 text-sm">
              {toc.map((item, i) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="group flex gap-3 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <span className="number text-xs tabular text-muted-foreground/70 group-hover:text-foreground">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="leading-snug">{item.label}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
      ) : null}

      <article className="min-w-0">
        <header className="mb-12 flex flex-col gap-3 border-b border-border/60 pb-10">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="heading-display text-balance text-4xl sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {updatedAt ? (
            <p className="text-sm text-muted-foreground">
              Ultimo aggiornamento:{' '}
              <span className="text-foreground">{updatedAt}</span>
            </p>
          ) : null}
        </header>

        <LegalProse>{children}</LegalProse>
      </article>
    </div>
  )
}

/**
 * LegalProse — refined long-form typography. Targets raw heading/paragraph
 * elements so legal pages can keep their semantic structure without a prose
 * plugin dependency.
 */
export function LegalProse({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'max-w-3xl text-[1rem] leading-7 text-foreground/90',
        '[&_p]:my-4 [&_p]:text-pretty',
        '[&_h2]:heading-display [&_h2]:scroll-mt-28 [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-2xl sm:[&_h2]:text-3xl [&_h2]:text-foreground [&_h2]:text-pretty',
        '[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:text-foreground [&_h3]:text-pretty',
        '[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:marker:text-muted-foreground/50',
        '[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:marker:text-muted-foreground/70',
        '[&_li]:my-1.5 [&_li]:text-pretty',
        '[&_strong]:font-semibold [&_strong]:text-foreground',
        '[&_em]:italic',
        '[&_a]:font-medium [&_a]:text-accent [&_a]:underline-offset-4 [&_a]:decoration-accent/40 [&_a]:underline hover:[&_a]:decoration-accent',
        '[&_code]:rounded [&_code]:border [&_code]:border-border/60 [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-foreground',
        '[&_table]:my-6 [&_table]:w-full [&_table]:overflow-hidden [&_table]:rounded-xl [&_table]:border [&_table]:border-border/60 [&_table]:text-sm',
        '[&_thead]:bg-secondary/60',
        '[&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground',
        '[&_td]:border-t [&_td]:border-border/60 [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_td]:text-foreground/85',
        '[&_hr]:my-10 [&_hr]:border-border/60',
        className,
      )}
    >
      {children}
    </div>
  )
}
