import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { dataLocal } from '../api'
import { useAuth } from '../auth'
import { nomeMes, useCartao, type CartaoMes, type Habilidade, type IdHabilidade } from '../cartao/api'
import { Carregando, ErroCarga } from '../components/Estado'
import GraficoLinha from '../components/GraficoLinha'
import { useTestes } from '../store'

const COMO_FAZER: Record<IdHabilidade, string> = {
  lance_livre: 'Um minuto no relógio: quantos lances livres você converte pegando o próprio rebote.',
  arremesso: 'Cinco arremessos de cada um de cinco pontos: os dois cantos, as duas alas e o topo. Use a linha de 3 ou, se estiver começando, a média distância. Conte as cestas, de 1 a 25.',
  drible: 'Seis cones em linha, a 2 m um do outro. Zigue-zague driblando, ida e volta, trocando de mão em cada cone. Tempo em segundos.',
  salto: 'Impulsão vertical: marque na parede o alcance com o braço esticado e depois o ponto mais alto do salto, saindo parado. A diferença, em centímetros.',
}

const UNIDADE: Record<IdHabilidade, string> = { lance_livre: 'cestas', arremesso: 'cestas', drible: 's', salto: 'cm' }

const mesAtual = () => dataLocal(new Date()).slice(0, 7)

// Notas de um cartão de exemplo, só para a prévia apagada de quem ainda não fez nenhum teste.
const NOTAS_EXEMPLO = [72, 64, 81, 58]
const exemplo = (habilidades: Habilidade[]): CartaoMes => ({
  mes: mesAtual(),
  geral: 69,
  completo: true,
  notas: Object.fromEntries(habilidades.map((h, i) => [h.id, { valor: 0, nota: NOTAS_EXEMPLO[i % NOTAS_EXEMPLO.length] }])) as CartaoMes['notas'],
})

export default function CartaoDoAtleta() {
  const { cartao, erro, recarregar } = useCartao()
  if (!cartao) return erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Montando o seu cartão" />

  const ultimo = cartao.meses.at(-1)
  const anterior = cartao.meses.at(-2)
  const desteMes = ultimo?.mes === mesAtual() ? ultimo : undefined

  return (
    <>
      <h1>Cartão do atleta</h1>
      <p className="muted">
        Uma bateria de quatro testes por mês. Cada resultado vira uma nota de 0 a 99, e a nota geral é a média delas. Refaça todo mês para ver a evolução.
      </p>

      {ultimo ? (
        <div className="cartao-topo">
          <Ficha mes={ultimo} habilidades={cartao.habilidades} atual={ultimo === desteMes} />
          <section className="card cartao-radar" aria-labelledby="cartao-radar-titulo">
            <h2 id="cartao-radar-titulo" className="sem-margem">Perfil</h2>
            <Radar habilidades={cartao.habilidades} mes={ultimo} comparar={anterior} />
            <p className="meta legenda-radar">
              <span className="chave atual" /> {nomeMes(ultimo.mes)}
              {anterior && <><span className="chave anterior" /> {nomeMes(anterior.mes)}</>}
            </p>
          </section>
        </div>
      ) : (
        // Antes do primeiro teste, um cartão de exemplo apagado mostra o que vai aparecer aqui.
        <div className="desempenho-vazio">
          <div className="desempenho-fantasma cartao-topo" aria-hidden>
            <Ficha mes={exemplo(cartao.habilidades)} habilidades={cartao.habilidades} atual />
            <section className="card cartao-radar">
              <Radar habilidades={cartao.habilidades} mes={exemplo(cartao.habilidades)} />
            </section>
          </div>
          <div className="vazio desempenho-chamada">Seu cartão aparece depois do primeiro teste da bateria. Comece pelo que der para fazer hoje.</div>
        </div>
      )}

      <Bateria habilidades={cartao.habilidades} mes={desteMes} />

      {cartao.meses.length > 1 && (
        <section>
          <h2>Evolução mês a mês</h2>
          <div className="card">
            <GraficoLinha rotulo="Nota geral por mês" maximo={99} pontos={cartao.meses.map((m) => ({ rotulo: nomeMes(m.mes), valor: m.geral }))} />
          </div>
          <div className="tabela-rolagem">
            <table className="tabela cartao-tabela">
              <thead>
                <tr>
                  <th scope="col">Mês</th>
                  {cartao.habilidades.map((h) => <th key={h.id} scope="col">{h.nome}</th>)}
                  <th scope="col">Geral</th>
                </tr>
              </thead>
              <tbody>
                {[...cartao.meses].reverse().map((m) => (
                  <tr key={m.mes}>
                    <th scope="row">{nomeMes(m.mes)}</th>
                    {cartao.habilidades.map((h) => <td key={h.id}>{m.notas[h.id]?.nota ?? '—'}</td>)}
                    <td><strong>{m.geral ?? '—'}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}

function Ficha({ mes, habilidades, atual }: { mes: CartaoMes; habilidades: Habilidade[]; atual: boolean }) {
  const { usuario } = useAuth()
  const faltam = habilidades.filter((h) => !mes.notas[h.id]).length
  return (
    <section className="cartao-ficha" aria-label={`Nota geral ${mes.geral ?? 'sem nota'}`}>
      <div className="cartao-ficha-topo">
        <span className="cartao-geral">{mes.geral ?? '—'}</span>
        <div>
          <span className="cartao-nome">{usuario?.name ?? 'Atleta'}</span>
          <span className="cartao-mes">{atual ? 'Este mês' : 'Último cartão'} · {nomeMes(mes.mes, 'long')}</span>
          <span className="cartao-status">{faltam ? `Falta${faltam > 1 ? 'm' : ''} ${faltam} teste${faltam > 1 ? 's' : ''} da bateria` : 'Bateria completa'}</span>
        </div>
      </div>
      <ul className="cartao-notas">
        {habilidades.map((h) => {
          const n = mes.notas[h.id]
          return (
            <li key={h.id}>
              <span>{h.nome}</span>
              <span className="cartao-barra" aria-hidden><i style={{ width: `${((n?.nota ?? 0) / 99) * 100}%` }} /></span>
              <strong>{n?.nota ?? '—'}</strong>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Radar de quatro eixos (um por habilidade), de 0 no centro a 99 na ponta. */
export function Radar({ habilidades, mes, comparar }: { habilidades: Habilidade[]; mes: CartaoMes; comparar?: CartaoMes }) {
  const C = 150
  const R = 105
  const angulo = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / habilidades.length
  const ponto = (i: number, nota: number) => {
    const r = (R * nota) / 99
    return `${(C + r * Math.cos(angulo(i))).toFixed(1)},${(C + r * Math.sin(angulo(i))).toFixed(1)}`
  }
  const poligono = (m: CartaoMes) => habilidades.map((h, i) => ponto(i, m.notas[h.id]?.nota ?? 0)).join(' ')
  const resumo = habilidades.map((h) => `${h.nome} ${mes.notas[h.id]?.nota ?? 'sem nota'}`).join(', ')

  return (
    <svg className="radar" viewBox="0 0 300 300" role="img" aria-label={`Radar das notas: ${resumo}`}>
      {[25, 50, 75, 99].map((n) => (
        <polygon key={n} className="radar-anel" points={habilidades.map((_, i) => ponto(i, n)).join(' ')} />
      ))}
      {habilidades.map((h, i) => (
        <line key={h.id} className="radar-eixo" x1={C} y1={C} x2={ponto(i, 99).split(',')[0]} y2={ponto(i, 99).split(',')[1]} />
      ))}
      {comparar && <polygon className="radar-anterior" points={poligono(comparar)} />}
      <polygon className="radar-atual" points={poligono(mes)} />
      {habilidades.map((h, i) => {
        const [x, y] = ponto(i, 122).split(',').map(Number)
        return (
          <text key={h.id} className="radar-rotulo" x={x} y={y} textAnchor={Math.abs(x - C) < 5 ? 'middle' : x > C ? 'start' : 'end'} dominantBaseline="middle">
            {h.nome} {mes.notas[h.id]?.nota ?? '—'}
          </text>
        )
      })}
    </svg>
  )
}

function Bateria({ habilidades, mes }: { habilidades: Habilidade[]; mes?: CartaoMes }) {
  return (
    <section>
      <h2>Bateria do mês</h2>
      <p className="muted">
        Faça os quatro testes no mesmo mês, descansado e depois do aquecimento. Vale o melhor resultado de cada um. Os resultados também aparecem nos{' '}
        <Link to="/metas" className="link">testes físicos de Metas</Link>.
      </p>
      <div className="grade cartao-bateria">
        {habilidades.map((h) => <TesteDaBateria key={h.id} habilidade={h} feito={mes?.notas[h.id] ?? null} />)}
      </div>
    </section>
  )
}

function TesteDaBateria({ habilidade, feito }: { habilidade: Habilidade; feito: { valor: number; nota: number } | null }) {
  const { adicionar } = useTestes()
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const unidade = UNIDADE[habilidade.id]

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const n = Number(valor.replace(',', '.'))
    if (!(n > 0)) return setErro('Digite um valor maior que zero.')
    setSalvando(true)
    setErro(null)
    try {
      await adicionar({ tipo: habilidade.teste, valor: n, data: new Date().toISOString() })
      setValor('')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form className="card form cartao-teste" onSubmit={enviar}>
      <h3>{habilidade.nome}</h3>
      <p className="muted">{COMO_FAZER[habilidade.id]}</p>
      {feito && (
        <p className="cartao-feito">
          Este mês: <strong>{feito.valor.toLocaleString('pt-BR')} {unidade}</strong> · nota {feito.nota}
        </p>
      )}
      <label>
        Resultado ({unidade})
        <input className="input" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
      </label>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <button className="btn" type="submit" disabled={salvando}>{salvando ? 'Salvando' : feito ? 'Registrar outra tentativa' : 'Registrar'}</button>
    </form>
  )
}
