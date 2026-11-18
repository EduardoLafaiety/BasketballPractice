import { forwardRef, type ButtonHTMLAttributes } from 'react'

/** Preserva as classes retrô e centraliza a semântica dos botões de ação. */
const Botao = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(function Botao({ type = 'button', className = 'btn', ...props }, ref) {
  return <button ref={ref} type={type} className={className} {...props} />
})
export default Botao
