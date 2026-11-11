import Icone from './Icone'

/** Aviso da demonstração para recursos que precisam de várias contas ou de um servidor ligado o tempo todo. */
export default function SoComServidor({ recurso, porque }: { recurso: string; porque: string }) {
  return (
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
}
