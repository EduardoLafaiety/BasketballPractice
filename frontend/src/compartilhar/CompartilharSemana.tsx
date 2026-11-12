import { useEffect, useState } from 'react'
import { dataLocal } from '../api'
import { segundaDe } from '../components/InicioDestaques'
import Icone from '../components/Icone'
import { useProgresso, useResumo, useZonas } from '../store'
import { gerarPng, periodoDaSemana } from './imagem'

/** Botão que gera a imagem da semana (stories) com prévia, download e compartilhamento. */
export default function CompartilharSemana() {
  const [aberto, setAberto] = useState(false)
  return (
    <section className="card compartilhar">
      <div className="compartilhar-topo">
        <div>
          <h2 className="sem-margem">Imagem da semana</h2>
          <p className="muted">Mapa de arremessos, sequência de dias e aproveitamento numa imagem no tamanho dos stories.</p>
        </div>
        {!aberto && (
          <button className="btn btn-primario" onClick={() => setAberto(true)}>
            Gerar imagem <Icone nome="seta" />
          </button>
        )}
      </div>
      {aberto && <Previa />}
    </section>
  )
}

function Previa() {
  const segunda = segundaDe(new Date())
  const { zonas, erro: erroZonas } = useZonas(segunda)
  const { resumo, erro: erroResumo } = useResumo(segunda)
  const { progresso, erro: erroProgresso } = useProgresso()
  const [png, setPng] = useState<{ blob: Blob; url: string } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const pronto = zonas && resumo && progresso

  useEffect(() => {
    if (!pronto) return
    let ativo = true
    let url = ''
    gerarPng({
      periodo: periodoDaSemana(segunda),
      zonas: Object.fromEntries(zonas.map((z) => [z.zona, { acertos: z.acertos, tentativas: z.tentativas }])),
      sequencia: progresso.sequenciaAtual,
      acertos: resumo.acertos,
      tentativas: resumo.tentativas,
      treinos: resumo.sessoes,
      minutos: resumo.minutos,
      endereco: `${window.location.host}${import.meta.env.BASE_URL}`.replace(/\/$/, ''),
    })
      .then((blob) => {
        url = URL.createObjectURL(blob)
        if (ativo) setPng({ blob, url })
      })
      .catch((e: Error) => ativo && setErro(e.message))
    return () => {
      ativo = false
      if (url) URL.revokeObjectURL(url)
    }
    // A semana não muda enquanto a prévia está aberta; só os dados.
  }, [pronto, zonas, resumo, progresso])

  const falha = erro ?? (erroZonas ?? erroResumo ?? erroProgresso)?.message
  if (falha) return <p className="erro" role="alert">Não foi possível gerar a imagem: {falha}</p>
  if (!png) return <p className="meta" role="status">Gerando a imagem</p>

  const nome = `minha-semana-${dataLocal(segunda)}.png`
  const arquivo = new File([png.blob], nome, { type: 'image/png' })
  const podeCompartilhar = typeof navigator.canShare === 'function' && navigator.canShare({ files: [arquivo] })

  async function compartilhar() {
    try {
      await navigator.share({ files: [arquivo], title: 'Minha semana de treino' })
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setAviso('Não deu para compartilhar daqui. Baixe a imagem e poste pelo app.')
    }
  }

  return (
    <div className="compartilhar-previa">
      <img src={png.url} alt="Imagem da semana: mapa de arremessos, sequência de dias e aproveitamento" />
      <div className="acoes">
        {podeCompartilhar && <button className="btn btn-primario" onClick={compartilhar}>Compartilhar</button>}
        <a className={`btn ${podeCompartilhar ? '' : 'btn-primario'}`} href={png.url} download={nome}>Baixar PNG</a>
      </div>
      {aviso && <p className="meta" role="status">{aviso}</p>}
    </div>
  )
}
