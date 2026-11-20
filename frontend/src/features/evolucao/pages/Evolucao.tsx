import { Link } from '../../../shared/i18n/links'
import { useEffect, useState } from 'react'

import { Carregando, ErroCarga, AvisoDesatualizado } from '../../../shared/ui/Estado'
import { api } from '../../../shared/api/backend'
import { useRecurso } from '../../../shared/data/recursos'
import Historico from './Historico'

export default function Evolucao() {
  const [dias, setDias] = useState(7)
  const [exercicio, setExercicio] = useState('')
  const { dados, erro, recarregar } = useRecurso(`progresso-comparacao:${dias}:${exercicio}`, (signal) => api.comparacao(dias, exercicio, signal))
  const [nomes, setNomes] = useState<{ id: string; nome: string }[]>([])
  useEffect(() => { if (dados) setNomes(dados.exercicios) }, [dados])
  const atual = dados?.atual
  const anterior = dados?.anterior
  const percentual = (n: number | null) => n == null ? 'Sem tentativas' : `${n}%`
  return <>
    <h1>Evolução</h1>
    <p className="muted">Compare seus registros com o período anterior de mesma duração.</p>
    <div className="acoes"><Link className="btn" to="/overall">Overall</Link><Link className="btn" to="/conquistas">Conquistas</Link></div>
      <div className="card form evolucao-filtros">
        <label>Período<select value={dias} onChange={(e) => setDias(Number(e.target.value))}><option value={7}>Últimos 7 dias</option><option value={30}>Últimos 30 dias</option></select></label>
        <label>Exercício<select value={exercicio} onChange={(e) => setExercicio(e.target.value)}><option value="">Todos os exercícios</option>{nomes.map(({ id, nome }) => <option key={id} value={id}>{nome}</option>)}</select></label>
      </div>
    {!atual || !anterior ? erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Carregando evolução" /> : <>
      <AvisoDesatualizado erro={erro} tentarDeNovo={recarregar} />
      <div className="evolucao-tabela"><table>
        <caption>Atual: últimos {dias} dias, incluindo hoje. Anterior: os {dias} dias precedentes.</caption>
        <thead><tr><th scope="col">Indicador</th><th scope="col">Atual</th><th scope="col">Anterior</th></tr></thead>
        <tbody>
          <tr><th scope="row">Sessões</th><td>{atual.frequencia}</td><td>{anterior.frequencia}</td></tr>
          <tr><th scope="row">Dias com treino</th><td>{atual.diasAtivos}</td><td>{anterior.diasAtivos}</td></tr>
          {!exercicio && <tr><th scope="row">Minutos</th><td>{atual.minutos}</td><td>{anterior.minutos}</td></tr>}
          <tr><th scope="row">Acertos / tentativas</th><td>{atual.acertos} / {atual.tentativas}</td><td>{anterior.acertos} / {anterior.tentativas}</td></tr>
          <tr><th scope="row">Aproveitamento</th><td>{percentual(atual.aproveitamento)}</td><td>{percentual(anterior.aproveitamento)}</td></tr>
          <tr><th scope="row">Repetições</th><td>{atual.repeticoes}</td><td>{anterior.repeticoes}</td></tr>
          <tr><th scope="row">Segundos registrados nos exercícios</th><td>{atual.segundos}</td><td>{anterior.segundos}</td></tr>
        </tbody>
      </table></div>
      {!atual.frequencia && <p>Nenhum treino registrado neste período para a seleção atual.</p>}
      <section className="card"><h2>Próximo treino</h2>
        <p>{!atual.frequencia ? 'Escolha uma sessão na rotina para começar a acompanhar sua evolução.' : 'Repita um exercício em condições parecidas para comparar os resultados. Use a rotina para planejar a próxima sessão.'}</p>
        <Link className="btn btn-primario" to="/rotina">Planejar na rotina</Link>
      </section>
    </>}
    <Historico />
  </>
}
