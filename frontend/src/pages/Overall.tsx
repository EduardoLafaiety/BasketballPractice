import type { CSSProperties } from 'react'
import { Carregando, ErroCarga } from '../components/Estado'
import { useAuth } from '../auth'
import { atributos as calcular, estiloDeJogador, faixaDaNota, faixaDoOverall, overall as media, TETO } from '../progressao/calculos'
import JogadorPixel from '../progressao/JogadorPixel'
import Radar from '../progressao/Radar'
import { useHistorico } from '../progressao/usarSessoes'

const BLOCOS = 20

export default function Overall() {
  const { usuario } = useAuth()
  const { sessoes, drillPorId, carregado, erro, recarregar } = useHistorico()

  const lista = sessoes ? calcular(sessoes, drillPorId) : []
  const ovr = media(lista)
  const faixa = faixaDaNota(ovr)
  const { build, forte, fraco } = estiloDeJogador(lista)

  return (
    <>
      <h1>Overall</h1>
      <p className="muted">A média dos seus cinco atributos. Cada treino registrado aumenta o atributo que ele trabalha.</p>

      {!carregado ? (
        erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Calculando seu overall" />
      ) : (
        <>
          <section className="ficha-2k" aria-label="Ficha do jogador" style={{ '--faixa': faixa.cor } as CSSProperties}>
            <div className="ficha-jogador">
              <JogadorPixel cor={faixa.cor} />
            </div>
            <div className="ficha-centro">
              <span className="ficha-faixa">{faixa.nome}</span>
              <h2>{usuario?.name ?? 'Seu jogador'}</h2>
              <p className="ficha-build">{build}</p>
              <p className="ficha-nivel">{faixaDoOverall(ovr)}</p>
              <div className="ficha-nota" aria-label={`Overall ${ovr}`}>
                <strong>{ovr}</strong>
                <span>OVR</span>
              </div>
              {forte && fraco && (
                <ul className="ficha-destaques">
                  <li><span>Ponto forte</span><strong>{forte.rotulo} {forte.valor}</strong></li>
                  <li><span>Para melhorar</span><strong>{fraco.rotulo} {fraco.valor}</strong></li>
                </ul>
              )}
            </div>
            <Radar atributos={lista} cor={faixa.cor} />
          </section>

          <ul className="overall-atributos">
            {lista.map((a) => (
              <li key={a.id} className="overall-atributo" style={{ '--cor': a.cor, '--faixa-nota': faixaDaNota(a.valor).cor } as CSSProperties}>
                <strong className="overall-valor" aria-label={`${a.rotulo}: ${a.valor}`}>{a.valor}</strong>
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
                <span className="overall-dica muted">{a.dica}</span>
              </li>
            ))}
          </ul>
          <p className="muted overall-nota-info">Todo atleta começa com 40 em cada atributo. O teto é {TETO}. As cores da nota vão de Bronze (50) a Diamante rosa (99).</p>
        </>
      )}
    </>
  )
}
