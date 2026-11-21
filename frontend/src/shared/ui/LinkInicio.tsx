import type { LinkProps } from 'react-router-dom'
import { Link } from '../i18n/links'

/** A marca sempre leva ao começo da landing, mesmo ao clicar novamente na mesma rota. */
export default function LinkInicio({ onClick, ...props }: Omit<LinkProps, 'to'>) {
  return <Link {...props} to="/conheca#inicio" onClick={event => {
    onClick?.(event)
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }} />
}
