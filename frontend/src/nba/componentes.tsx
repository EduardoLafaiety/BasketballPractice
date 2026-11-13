import { useState } from 'react'
import { Carregando, ErroCarga } from '../components/Estado'
import type { Escudos } from './escudos'

/** Carregando, ou o erro com "tentar de novo". */
export function Estado({ erro, carregar, texto }: { erro: Error | null; carregar: () => void; texto: string }) {
  return erro ? <ErroCarga erro={erro} tentarDeNovo={carregar} /> : <Carregando texto={texto} />
}

/**
 * Escudo nas versões para fundo claro e escuro (o CSS mostra a do tema); se não carregar, fica a bolinha
 * na cor do time. `soEscuro` é para fundos sempre escuros, como o cartão do líder: sem escudo, não mostra nada.
 */
export function Escudo({ time, soEscuro = false, className = '' }: { time: Escudos; soEscuro?: boolean; className?: string }) {
  const [falhou, setFalhou] = useState(false)
  // Dados guardados no cache antes de existirem os escudos vêm sem eles.
  if (falhou || !time.escudo || !time.escudoEscuro) return soEscuro ? null : <span className="nba-time-cor" aria-hidden />
  const img = (src: string, classe?: string) => <img className={classe} src={src} alt="" width={28} height={28} loading="lazy" onError={() => setFalhou(true)} />
  return (
    <span className={`nba-escudo ${className}`.trim()} aria-hidden>
      {soEscuro ? img(time.escudoEscuro) : <>{img(time.escudo, 'nba-escudo-claro')}{img(time.escudoEscuro, 'nba-escudo-escuro')}</>}
    </span>
  )
}
