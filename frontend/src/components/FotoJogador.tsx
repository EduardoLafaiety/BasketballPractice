import { FOTOS_JOGADORES } from '../assets/jogadores/fotos'
import type { Categoria } from '../types'

/** Foto do jogador com a faixa na cor da categoria principal; sem foto, mostra as iniciais. */
export default function FotoJogador({ id, nome, categoria, grande = false }: { id: string; nome: string; categoria?: Categoria; grande?: boolean }) {
  const foto = FOTOS_JOGADORES[id]
  const iniciais = nome.split(' ').map((p) => p[0]).slice(0, 2).join('')
  return (
    <div className={`foto-jogador tag-${categoria ?? 'Arremesso'} ${grande ? 'foto-jogador-grande' : ''}`}>
      {foto ? (
        <>
          <img
            src={grande ? foto.src : foto.srcPequena}
            srcSet={grande ? undefined : `${foto.srcPequena} 300w, ${foto.src} 520w`}
            sizes={grande ? undefined : '(max-width: 560px) 50vw, 25vw'}
            alt={`${nome} em quadra (${foto.legenda})`}
            loading="lazy"
            decoding="async"
          />
          <img className="foto-cor" src={grande ? foto.src : foto.srcPequena} alt="" aria-hidden loading="lazy" decoding="async" />
        </>
      ) : (
        <span className="foto-jogador-iniciais" aria-hidden>{iniciais}</span>
      )}
    </div>
  )
}

/** Crédito obrigatório das fotos com licença livre. */
export function CreditoFoto({ id }: { id: string }) {
  const foto = FOTOS_JOGADORES[id]
  if (!foto) return null
  return (
    <p className="credito-foto">
      Foto: {foto.autor},{' '}
      <a href={foto.fonte} target="_blank" rel="noreferrer">{foto.licenca}</a>, via Wikimedia Commons · {foto.legenda}
    </p>
  )
}
