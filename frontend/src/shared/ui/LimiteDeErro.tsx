import { Component, type ReactNode } from 'react'
import Botao from './Botao'

/** Mantém a navegação e a fila disponíveis quando uma página não pode ser baixada. */
export default class LimiteDeErro extends Component<{ children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false }
  static getDerivedStateFromError() { return { falhou: true } }
  render() {
    if (this.state.falhou) return <section className="card" role="alert">
      <h1>Não foi possível abrir esta página</h1>
      <p>Verifique a conexão e tente novamente. Seus treinos guardados neste aparelho continuam disponíveis.</p>
      <Botao onClick={() => location.reload()}>Tentar abrir novamente</Botao>
    </section>
    return this.props.children
  }
}
