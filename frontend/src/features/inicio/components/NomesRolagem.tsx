import type { CSSProperties, ReactNode } from 'react'

export interface NomeRolagem {
  nome: string
  /** Cor do time do jogador; sem ela, o nome fica na cor do texto. */
  cor?: string
}

/** Nomes em movimento horizontal automático, sem prender a rolagem da página. */
export function NomesRolagem({ nomes, titulo, texto }: { nomes: NomeRolagem[]; titulo: ReactNode; texto?: ReactNode }) {
  const metade = Math.ceil(nomes.length / 2)
  const linha = (lista: NomeRolagem[]) => [0, 1].map((copia) => (
    <span className="nomes-grupo" key={copia}>
      {lista.map((n) => <span key={n.nome} style={n.cor ? ({ '--c': n.cor } as CSSProperties) : undefined}>{n.nome}<i>/</i></span>)}
    </span>
  ))
  return (
    <div className="nomes-pino nomes-automaticos">
      <div className="nomes-fixo">
        {titulo}
        {texto}
        <div className="nomes-janela" aria-hidden>
          <div className="nomes-linha" aria-hidden>{linha(nomes.slice(0, metade))}</div>
          <div className="nomes-linha nomes-contorno" aria-hidden>{linha(nomes.slice(metade))}</div>
        </div>
      </div>
    </div>
  )
}
