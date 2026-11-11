import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ARTIGOS } from '../artigos/dados'
import { Carregando, ErroCarga } from '../components/Estado'
import Icone from '../components/Icone'
import { ROTULO_CATEGORIA, textoCompartilhar, useQuizDoDia, type QuizDoDia } from '../quiz/api'

const LETRAS = ['A', 'B', 'C', 'D']

export default function Quiz() {
  const { quiz, erro, recarregar, responder } = useQuizDoDia()
  if (!quiz) return erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Separando as perguntas de hoje…" />
  return (
    <>
      <h1>Entenda o jogo</h1>
      <p className="muted">Quiz diário: 5 perguntas sobre regras, história, NBA e treino, todas tiradas dos artigos do site. As mesmas para todo mundo, trocadas à meia-noite. Vale a primeira tentativa.</p>
      {quiz.resultado ? <Revisao quiz={quiz} /> : <Perguntas quiz={quiz} responder={responder} />}
    </>
  )
}

function Perguntas({ quiz, responder }: { quiz: QuizDoDia; responder: (respostas: number[]) => Promise<unknown> }) {
  const [respostas, setRespostas] = useState<number[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const atual = Math.min(respostas.length, quiz.perguntas.length - 1)
  const pergunta = quiz.perguntas[atual]
  const completo = respostas.length === quiz.perguntas.length

  async function enviar() {
    setEnviando(true)
    setErro(null)
    try {
      await responder(respostas)
    } catch (e) {
      setErro((e as Error).message)
      setEnviando(false)
    }
  }

  return (
    <section className="card quiz">
      <Quadros total={quiz.perguntas.length} feitos={respostas.length} />
      {completo ? (
        <div className="quiz-fim">
          <h2 className="sem-margem">Respostas prontas</h2>
          <p className="muted">Envie para ver quantas você acertou e a explicação de cada uma.</p>
          {erro && <p className="erro" role="alert">{erro}</p>}
          <div className="acoes">
            <button className="btn btn-primario" onClick={enviar} disabled={enviando}>
              {enviando ? 'Corrigindo…' : 'Ver resultado'} <Icone nome="seta" />
            </button>
            <button className="btn" onClick={() => setRespostas((r) => r.slice(0, -1))} disabled={enviando}>Voltar uma</button>
          </div>
        </div>
      ) : (
        <fieldset className="quiz-pergunta">
          <legend>
            <span className="rotulo-forte">Pergunta {atual + 1} de {quiz.perguntas.length} · {ROTULO_CATEGORIA[pergunta.categoria]}</span>
            <span className="quiz-enunciado">{pergunta.pergunta}</span>
          </legend>
          <div className="quiz-alternativas">
            {pergunta.alternativas.map((alt, i) => (
              <button key={alt} className="quiz-alternativa" onClick={() => setRespostas((r) => [...r, i])}>
                <span aria-hidden>{LETRAS[i]}</span>
                {alt}
              </button>
            ))}
          </div>
          {respostas.length > 0 && (
            <button className="link botao-link" onClick={() => setRespostas((r) => r.slice(0, -1))}>Voltar à pergunta anterior</button>
          )}
        </fieldset>
      )}
    </section>
  )
}

/** Uma casa por pergunta: preenchida conforme o atleta responde (ou acerta, na revisão). */
function Quadros({ total, feitos, acertos }: { total: number; feitos?: number; acertos?: boolean[] }) {
  return (
    <ol className="quiz-quadros" aria-label={acertos ? `${acertos.filter(Boolean).length} de ${total} certas` : `${feitos} de ${total} respondidas`}>
      {Array.from({ length: total }, (_, i) => {
        const estado = acertos ? (acertos[i] ? 'certo' : 'errado') : i < feitos! ? 'feito' : ''
        return <li key={i} className={estado} />
      })}
    </ol>
  )
}

function Revisao({ quiz }: { quiz: QuizDoDia }) {
  const [aviso, setAviso] = useState<string | null>(null)
  const acertos = quiz.perguntas.map((p) => !!p.acertou)
  const endereco = `${window.location.origin}${import.meta.env.BASE_URL}quiz`
  const texto = textoCompartilhar(quiz, endereco)

  async function compartilhar() {
    try {
      if (navigator.share) await navigator.share({ text: texto })
      else {
        await navigator.clipboard.writeText(texto)
        setAviso('Resultado copiado. É só colar na conversa.')
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setAviso('Não deu para compartilhar daqui. Copie o texto abaixo.')
    }
  }

  return (
    <>
      <section className="card quiz quiz-placar" aria-labelledby="quiz-placar-titulo">
        <Quadros total={quiz.perguntas.length} acertos={acertos} />
        <h2 id="quiz-placar-titulo" className="sem-margem">{quiz.resultado!.acertos} de {quiz.resultado!.total} certas</h2>
        <p className="muted">Novas perguntas amanhã. Compartilhe o placar sem entregar as respostas.</p>
        <div className="acoes">
          <button className="btn btn-primario" onClick={compartilhar}>Compartilhar resultado</button>
        </div>
        {aviso && <p className="meta" role="status">{aviso}</p>}
        <pre className="quiz-texto texto-literal" aria-label="Texto para compartilhar">{texto}</pre>
      </section>

      <h2>Respostas</h2>
      <ol className="quiz-revisao">
        {quiz.perguntas.map((p) => {
          const artigo = ARTIGOS.find((a) => a.id === p.artigo)
          return (
            <li key={p.id} className={p.acertou ? 'certo' : 'errado'}>
              <span className="rotulo-forte">
                <Icone nome={p.acertou ? 'check' : 'xis'} tamanho={14} /> {p.acertou ? 'Acertou' : 'Errou'} · {ROTULO_CATEGORIA[p.categoria]}
              </span>
              <h3>{p.pergunta}</h3>
              <p>
                Resposta: <strong>{p.alternativas[p.certa!]}</strong>
                {!p.acertou && p.escolhida !== undefined && <> · você marcou {p.alternativas[p.escolhida]}</>}
              </p>
              <p className="muted">{p.explicacao}</p>
              {artigo && <Link to={`/artigos/${artigo.id}`} className="link">Ler: {artigo.titulo}</Link>}
            </li>
          )
        })}
      </ol>
    </>
  )
}
