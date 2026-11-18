import { cloneElement, useId, type ReactElement, type ReactNode } from 'react'

interface Controle { id?: string; 'aria-labelledby'?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling' }
/** Rótulo, ajuda e erro associados ao controle nativo, preservando as classes do formulário. */
export default function Campo({ rotulo, ajuda, erro, children, className }: { rotulo: ReactNode; ajuda?: string; erro?: string; children: ReactElement<Controle>; className?: string }) {
  const gerado = useId()
  const id = children.props.id ?? gerado
  const descricoes = [...new Set([children.props['aria-describedby'], ajuda && `${id}-ajuda`, erro && `${id}-erro`].filter(Boolean))].join(' ') || undefined
  return <label className={className} htmlFor={id}>
    <span id={`${id}-rotulo`}>{rotulo}</span>
    {cloneElement(children, { id, 'aria-labelledby': children.props['aria-labelledby'] ?? `${id}-rotulo`, 'aria-describedby': descricoes, 'aria-invalid': erro ? true : children.props['aria-invalid'] })}
    {ajuda && <span className="meta" id={`${id}-ajuda`}>{ajuda}</span>}
    {erro && <span className="erro" role="alert" id={`${id}-erro`}>{erro}</span>}
  </label>
}
