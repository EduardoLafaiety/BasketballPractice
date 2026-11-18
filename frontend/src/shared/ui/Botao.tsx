import { forwardRef, type ButtonHTMLAttributes } from 'react'

/** Preserva as classes retrô e centraliza a semântica dos botões de ação. */
const Botao = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { ocupado?: boolean }>(function Botao({ type = 'button', className = 'btn', ocupado = false, disabled, ...props }, ref) {
  return <button ref={ref} type={type} className={className} {...props} disabled={disabled || ocupado} aria-busy={ocupado || props['aria-busy']} />
})
export default Botao
