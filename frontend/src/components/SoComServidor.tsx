import type { ReactNode } from 'react'
import Icone from './Icone'

/**
 * Aviso da demonstração para recursos que precisam de várias contas ou de um servidor ligado o tempo todo.
 * Com `exemplo`, um retrato apagado do recurso fica por trás do aviso, para a pessoa entender o que ele faz.
 */
export default function SoComServidor({ recurso, porque, exemplo }: { recurso: string; porque: string; exemplo?: ReactNode }) {
  const aviso = (
    <div className="card so-com-servidor" role="status">
      <Icone nome="cadeado" tamanho={28} />
      <div>
        <h2 className="sem-margem">{recurso} não funciona na demonstração</h2>
        <p className="muted">
          {porque} A demonstração roda inteira no seu navegador, sem servidor e com um único visitante. Na versão com conta, este recurso funciona
          normalmente.
        </p>
      </div>
    </div>
  )
  if (!exemplo) return aviso
  return (
    <div className="desempenho-vazio">
      <div className="desempenho-fantasma" aria-hidden>{exemplo}</div>
      <div className="desempenho-chamada">{aviso}</div>
    </div>
  )
}
