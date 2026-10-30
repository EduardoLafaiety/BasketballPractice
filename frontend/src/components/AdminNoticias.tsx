import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, type Noticia } from '../api'
import { NOTICIAS_MUDARAM, tempoAtras } from '../lib/noticias'
import { Carregando, ErroCarga } from './Estado'

const PRAZOS = [
  { horas: 6, rotulo: '6 horas' },
  { horas: 12, rotulo: '12 horas' },
  { horas: 24, rotulo: '1 dia' },
  { horas: 72, rotulo: '3 dias' },
  { horas: 168, rotulo: '7 dias' },
]

const avisarBarra = () => window.dispatchEvent(new Event(NOTICIAS_MUDARAM))

/** Publica "Breaking news" e tira da barra as manchetes que não deviam estar lá. */
export default function AdminNoticias() {
  const [noticias, setNoticias] = useState<Noticia[] | null>(null)
  const [erro, setErro] = useState<Error | null>(null)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [fonte, setFonte] = useState('')
  const [link, setLink] = useState('')
  const [horas, setHoras] = useState(24)

  const carregar = useCallback(() => {
    setErro(null)
    api.noticias().then(setNoticias).catch(setErro)
  }, [])
  useEffect(carregar, [carregar])

  async function publicar(e: FormEvent) {
    e.preventDefault()
    setErroAcao(null)
    setSalvando(true)
    try {
      const criada = await api.publicarManchete({ title: titulo.trim(), sourceName: fonte.trim() || null, url: link.trim() || null, hours: horas })
      setNoticias((lista) => [criada, ...(lista ?? [])])
      setTitulo('')
      setFonte('')
      setLink('')
      avisarBarra()
    } catch (e) {
      setErroAcao((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function remover(n: Noticia) {
    if (!window.confirm(`Remover da barra a manchete "${n.title}"?`)) return
    setErroAcao(null)
    try {
      await api.removerManchete(n.id)
      setNoticias((lista) => lista?.filter((x) => x.id !== n.id) ?? null)
      avisarBarra()
    } catch (e) {
      setErroAcao((e as Error).message)
    }
  }

  return (
    <section className="admin-noticias">
      <h2>Barra de notícias</h2>
      <form className="card form" onSubmit={publicar}>
        <label>
          Manchete
          <input className="input" value={titulo} required minLength={3} maxLength={160} onChange={(e) => setTitulo(e.target.value)} />
        </label>
        <p className="meta">Escreva com as suas palavras, sem copiar o texto da matéria. Ela aparece primeiro na barra, com o selo “Breaking news”.</p>
        <div className="linha">
          <label>
            Fonte (opcional)
            <input className="input" value={fonte} maxLength={80} placeholder="Ex.: ESPN" onChange={(e) => setFonte(e.target.value)} />
          </label>
          <label>
            Link da matéria (opcional)
            <input className="input" type="url" value={link} maxLength={2000} placeholder="https://" onChange={(e) => setLink(e.target.value)} />
          </label>
        </div>
        <label>
          Fica no ar por
          <select className="input" value={horas} onChange={(e) => setHoras(Number(e.target.value))}>
            {PRAZOS.map((p) => (
              <option key={p.horas} value={p.horas}>{p.rotulo}</option>
            ))}
          </select>
        </label>
        <div className="acoes">
          <button className="btn btn-primario" type="submit" disabled={salvando}>{salvando ? 'Publicando…' : 'Publicar manchete'}</button>
        </div>
      </form>
      {erroAcao && <p className="erro aviso" role="alert">{erroAcao}</p>}

      {!noticias ? (
        erro ? <ErroCarga erro={erro} tentarDeNovo={carregar} /> : <Carregando texto="Carregando manchetes…" />
      ) : noticias.length === 0 ? (
        <p className="meta">Nenhuma manchete na barra agora.</p>
      ) : (
        <ul className="metas admin-manchetes">
          {noticias.map((n) => (
            <li key={n.id} className="card admin-usuario">
              <div className="admin-info">
                <strong>{n.title}</strong>
                <span className="meta">
                  {n.origin === 'admin' ? 'Breaking news' : 'Automática'}
                  {n.sourceName && ` · ${n.sourceName}`} · {tempoAtras(n.publishedAt)}
                </span>
              </div>
              <div className="acoes">
                <button className="btn btn-perigo" onClick={() => remover(n)}>Remover</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
