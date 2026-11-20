import { forwardRef, type ReactNode } from 'react'
import { Link as LinkOriginal, NavLink as NavLinkOriginal, type LinkProps, type NavLinkProps } from 'react-router-dom'
import { traduzir, useIdioma } from './idioma'

const texto = (valor: ReactNode): ReactNode => typeof valor === 'string' ? traduzir(valor) : Array.isArray(valor) ? valor.map(texto) : valor
function atributos<T extends { title?: string; 'aria-label'?: string }>(props: T): T {
  return { ...props, 'aria-label': props['aria-label'] ? traduzir(props['aria-label']) : undefined, title: props.title ? traduzir(props.title) : undefined }
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(props, ref) {
  useIdioma()
  return <LinkOriginal {...atributos(props)} ref={ref}>{props.translate === 'no' ? props.children : texto(props.children)}</LinkOriginal>
})
export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(props, ref) {
  useIdioma()
  const filhos = props.children
  return <NavLinkOriginal {...atributos({ ...props, children: undefined })} ref={ref}>{typeof filhos === 'function'
    ? (estado) => texto(filhos(estado)) : props.translate === 'no' ? filhos : texto(filhos)}</NavLinkOriginal>
})
