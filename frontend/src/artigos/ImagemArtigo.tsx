import { FOTOS_ARTIGOS } from '../assets/artigos/fotos'
import Ilustracao from './Ilustracao'

/** Foto (História) ou ilustração (as outras categorias) do artigo; a capa mostra o crédito da foto. */
export default function ImagemArtigo({ id, capa = false }: { id: string; capa?: boolean }) {
  const foto = FOTOS_ARTIGOS[id]
  const imagem = foto ? (
    <img
      src={capa ? foto.src : foto.srcPequena}
      srcSet={`${foto.srcPequena} 640w, ${foto.src} 1200w`}
      sizes={capa ? '(max-width: 760px) 100vw, 68ch' : '(max-width: 560px) 100vw, 33vw'}
      alt={foto.legenda}
      loading={capa ? undefined : 'lazy'}
      decoding="async"
    />
  ) : (
    <Ilustracao id={id} />
  )

  if (!capa) return <div className="artigo-imagem">{imagem}</div>
  return (
    <figure className="artigo-capa">
      <div className="artigo-imagem">{imagem}</div>
      {foto && (
        <figcaption className="credito-foto">
          {foto.legenda}. Foto: {foto.autor},{' '}
          <a href={foto.fonte} target="_blank" rel="noreferrer">{foto.licenca}</a>, via Wikimedia Commons
        </figcaption>
      )}
    </figure>
  )
}
