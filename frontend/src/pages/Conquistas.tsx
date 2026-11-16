import { Carregando, ErroCarga } from '../components/Estado'
import Icone from '../components/Icone'
import { useProgresso } from '../store'
import ListaConquistas from './ListaConquistas'

export default function Conquistas() {
  const { progresso, erro: erroProgresso, recarregar: recarregarProgresso } = useProgresso()

  return (
    <>
      <h1>Conquistas</h1>

      {progresso ? (
        <section className="sequencia card">
          <div>
            <span className="sequencia-fogo"><Icone nome="fogo" tamanho={32} /></span>
            <strong>{progresso.sequenciaAtual}</strong>
            <span className="muted">{progresso.sequenciaAtual === 1 ? 'dia seguido' : 'dias seguidos'}</span>
          </div>
          <p className="muted">
            Melhor sequência: <strong>{progresso.melhorSequencia}</strong> {progresso.melhorSequencia === 1 ? 'dia' : 'dias'}.{' '}
            {progresso.sequenciaAtual === 0 ? 'Treine hoje para começar uma nova!' : 'Treine hoje para não perder.'}
          </p>
        </section>
      ) : erroProgresso ? (
        <ErroCarga erro={erroProgresso} tentarDeNovo={recarregarProgresso} />
      ) : (
        <Carregando texto="Calculando sua sequência" />
      )}

      {progresso && <ListaConquistas conquistas={progresso.conquistas} />}
    </>
  )
}
