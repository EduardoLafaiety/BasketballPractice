import type { CSSProperties } from 'react'
import { Carregando, ErroCarga } from '../components/Estado'
import { useAuth } from '../auth'
import { atributos as calcular, faixaDoOverall, overall as media, TETO } from '../progressao/calculos'
import { useHistorico } from '../progressao/usarSessoes'

const BLOCOS = 20

export default function Overall() {
  const { usuario } = useAuth()
  const { sessoes, drillPorId, carregado, erro, recarregar } = useHistorico()

  const lista = sessoes ? calcular(sessoes, drillPorId) : []
  const ovr = media(lista)

  return (
    <>
      <h1>Overall</h1>
      <p className="muted">A média dos seus cinco atributos. Cada treino registrado aumenta o atributo que ele trabalha.</p>

      {!carregado ? (
        erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Calculando seu overall" />
      ) : (
        <>
          <section className="overall-cartao card" aria-label="Overall geral">
            <div className="overall-nota" aria-label={`Overall ${ovr}`}>
              <strong>{ovr}</strong>
              <span>OVR</span>
            </div>
            <div>
              <h2>{usuario?.name ?? 'Seu jogador'}</h2>
              <p className="muted">{faixaDoOverall(ovr)}</p>
              <p className="muted overall-nota-info">Todo atleta começa com 40 em cada atributo. O teto é {TETO}.</p>
            </div>
          </section>

          <ul className="overall-atributos">
            {lista.map((a) => (
              <li key={a.id} className="overall-atributo" style={{ '--cor': a.cor } as CSSProperties}>
                <span className="overall-rotulo">{a.rotulo}</span>
                <div
                  className="overall-barra"
                  role="meter"
                  aria-label={a.rotulo}
                  aria-valuemin={0}
                  aria-valuemax={TETO}
                  aria-valuenow={a.valor}
                >
                  {Array.from({ length: BLOCOS }, (_, i) => (
                    <i key={i} className={i < Math.round((a.valor / TETO) * BLOCOS) ? 'cheio' : ''} />
                  ))}
                </div>
                <strong className="overall-valor">{a.valor}</strong>
                <span className="overall-dica muted">{a.dica}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
