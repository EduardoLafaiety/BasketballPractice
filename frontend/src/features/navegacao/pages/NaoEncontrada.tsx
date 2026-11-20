import { Link } from '../../../shared/i18n/links'


export default function NaoEncontrada() {
  return (
    <>
      <h1>Página não encontrada</h1>
      <div className="vazio">
        Esse endereço não existe. <Link to="/" className="link">Voltar ao início</Link>
      </div>
    </>
  )
}
