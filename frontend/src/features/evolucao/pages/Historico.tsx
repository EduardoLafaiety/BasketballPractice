import { useState } from 'react'
import { api } from '../../../shared/api/backend'
import { useRecurso } from '../../../shared/data/recursos'
import { AvisoDesatualizado, Carregando, ErroCarga } from '../../../shared/ui/Estado'

export default function Historico() {
  const [pagina, setPagina] = useState(0)
  const { dados, erro, carregando, recarregar } = useRecurso(`progresso-historico:${pagina}`, (signal) => api.paginaSessoes(pagina, signal))
  return <section className="card" aria-labelledby="titulo-historico">
    <h2 id="titulo-historico">Histórico de treinos</h2>
    {!dados ? erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Carregando histórico" /> : <>
      <AvisoDesatualizado erro={erro} tentarDeNovo={recarregar} />
      {!dados.length ? <p>Nenhum treino nesta página.</p> : <ol start={pagina * 20 + 1}>
        {dados.slice(0, 20).map((s) => <li key={s.id}><time dateTime={s.data}>{new Date(s.data).toLocaleString('pt-BR')}</time> — {s.drillNome || 'Treino'} · {s.duracaoMin} min</li>)}
      </ol>}
      <nav className="acoes" aria-label="Páginas do histórico">
        <button className="btn" disabled={pagina === 0 || carregando} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
        <span role="status">Página {pagina + 1}</span>
        <button className="btn" disabled={dados.length <= 20 || carregando} onClick={() => setPagina((p) => p + 1)}>Próxima</button>
      </nav>
    </>}
  </section>
}
