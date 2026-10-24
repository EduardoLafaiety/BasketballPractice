import { useState } from 'react'
import {
  DISTANCIAS,
  acertosParaMeta,
  efgPct,
  fgPct,
  metrosParaPes,
  pesParaMetros,
  pontos as calcularPontos,
  tsPct,
} from '../lib/calculos'

const n = (texto: string) => Math.max(0, Number(texto.replace(',', '.')) || 0)
const mostrar = (v: number | null) => (v === null ? '—' : `${v.toLocaleString('pt-BR')}%`)

function Campo({ rotulo, valor, mudar }: { rotulo: string; valor: string; mudar: (v: string) => void }) {
  return (
    <label>
      {rotulo}
      <input className="input" inputMode="decimal" value={valor} onChange={(e) => mudar(e.target.value)} />
    </label>
  )
}

export default function Calculadoras() {
  // Aproveitamento
  const [cestas, setCestas] = useState('7')
  const [tentativas, setTentativas] = useState('15')
  const [cestas3, setCestas3] = useState('2')
  const [lances, setLances] = useState('4')
  const [tentLances, setTentLances] = useState('5')
  // Meta
  const [acertos, setAcertos] = useState('30')
  const [tentMeta, setTentMeta] = useState('80')
  const [meta, setMeta] = useState('45')
  // Distâncias
  const [metros, setMetros] = useState('6.75')
  const [pes, setPes] = useState(metrosParaPes(6.75).toFixed(2))

  const c = n(cestas)
  const t = n(tentativas)
  const c3 = Math.min(n(cestas3), c)
  const pts = calcularPontos(c, c3, n(lances))
  const faltam = acertosParaMeta(n(acertos), n(tentMeta), Math.min(100, n(meta)))
  const invalido = c > t

  return (
    <div className="calculadoras">
      <section className="card form form-solto">
        <h3>Aproveitamento</h3>
        <div className="linha linha-3">
          <Campo rotulo="Cestas de quadra" valor={cestas} mudar={setCestas} />
          <Campo rotulo="Arremessos de quadra" valor={tentativas} mudar={setTentativas} />
          <Campo rotulo="…sendo de três" valor={cestas3} mudar={setCestas3} />
        </div>
        <div className="linha">
          <Campo rotulo="Lances livres convertidos" valor={lances} mudar={setLances} />
          <Campo rotulo="Lances livres tentados" valor={tentLances} mudar={setTentLances} />
        </div>
        {invalido ? (
          <p className="erro">Cestas não podem passar dos arremessos.</p>
        ) : (
          <dl className="resultados">
            <div><dt>FG%</dt><dd>{mostrar(fgPct(c, t))}</dd></div>
            <div><dt>eFG%</dt><dd>{mostrar(efgPct(c, c3, t))}</dd></div>
            <div><dt>TS%</dt><dd>{mostrar(tsPct(pts, t, n(tentLances)))}</dd></div>
            <div><dt>Pontos</dt><dd>{pts}</dd></div>
          </dl>
        )}
        <p className="meta">
          eFG% dá peso 1,5 à bola de três. TS% inclui os lances livres e mede a eficiência real de pontuação.
        </p>
      </section>

      <section className="card form form-solto">
        <h3>Quanto falta para a meta?</h3>
        <div className="linha linha-3">
          <Campo rotulo="Acertos até agora" valor={acertos} mudar={setAcertos} />
          <Campo rotulo="Tentativas até agora" valor={tentMeta} mudar={setTentMeta} />
          <Campo rotulo="Meta (%)" valor={meta} mudar={setMeta} />
        </div>
        <p className="resultado-grande">
          {n(acertos) > n(tentMeta)
            ? 'Acertos não podem passar das tentativas.'
            : faltam === null
              ? 'Com algum erro já registrado, 100% não é mais possível.'
              : faltam === 0
                ? 'Meta já alcançada! 🎯'
                : `Faltam ${faltam} acertos seguidos para chegar a ${n(meta)}%.`}
        </p>
      </section>

      <section className="card form form-solto">
        <h3>Distâncias</h3>
        <div className="linha">
          <label>
            Metros
            <input
              className="input"
              inputMode="decimal"
              value={metros}
              onChange={(e) => {
                setMetros(e.target.value)
                setPes(metrosParaPes(n(e.target.value)).toFixed(2))
              }}
            />
          </label>
          <label>
            Pés
            <input
              className="input"
              inputMode="decimal"
              value={pes}
              onChange={(e) => {
                setPes(e.target.value)
                setMetros(pesParaMetros(n(e.target.value)).toFixed(2))
              }}
            />
          </label>
        </div>
        <ul className="historico compacto">
          {DISTANCIAS.map((d) => (
            <li key={d.nome}>
              <span>{d.nome}</span>
              <strong>
                {d.metros.toLocaleString('pt-BR')} m · {metrosParaPes(d.metros).toFixed(1).replace('.', ',')} pés
              </strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
