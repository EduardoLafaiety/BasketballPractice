import { useState } from 'react'

/** Aviso fixo da versão de demonstração, com o botão para voltar aos dados de exemplo. */
export default function FaixaDemo() {
  const [recomecando, setRecomecando] = useState(false)

  async function recomecar() {
    if (!window.confirm('Recomeçar a demonstração? Tudo o que você registrou aqui será apagado.')) return
    setRecomecando(true)
    try {
      await (await import('@demo/servidor')).recomecarDemonstracao()
      window.location.reload()
    } catch (erro) {
      console.error(erro)
      setRecomecando(false)
      window.alert('Não foi possível recomeçar a demonstração. Recarregue a página e tente de novo.')
    }
  }

  return (
    <div className="faixa-demo" role="note">
      <p>
        <strong>Versão de demonstração.</strong> Explore à vontade: os dados são de exemplo e o que você registrar fica só
        neste navegador.
      </p>
      <button className="link-forte botao-link" onClick={recomecar} disabled={recomecando}>
        {recomecando ? 'Recomeçando…' : 'Recomeçar'}
      </button>
    </div>
  )
}
