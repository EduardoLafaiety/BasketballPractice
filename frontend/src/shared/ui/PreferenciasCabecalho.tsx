import { useEffect, useRef, useState } from 'react'
import { aplicarTema, temaSalvo } from '../../shared/lib/tema'
import { definirIdioma, useIdioma } from '../../shared/i18n/idioma'
import type { Tema } from '../../shared/types'

const TEMAS: { id: Tema; nome: string; icone: 'sistema' | 'sol' | 'lua' }[] = [
  { id: 'sistema', nome: 'Sistema', icone: 'sistema' },
  { id: 'claro', nome: 'Claro', icone: 'sol' },
  { id: 'escuro', nome: 'Escuro', icone: 'lua' },
]

function IconeTema({ nome }: { nome: 'sistema' | 'sol' | 'lua' }) {
  return <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {nome === 'sol' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>
      : nome === 'lua' ? <path d="M20.5 13.2A8.5 8.5 0 0 1 10.8 3a8.5 8.5 0 1 0 9.7 10.2Z" />
        : <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>}
  </svg>
}

export default function PreferenciasCabecalho({ temaConta, salvarTema }: { temaConta?: Tema; salvarTema?: (tema: Tema) => Promise<unknown> }) {
  const idioma = useIdioma()
  const [tema, setTema] = useState(temaSalvo)
  const [salvando, setSalvando] = useState(false)
  const [traduzindo, setTraduzindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const painel = useRef<HTMLDetailsElement>(null)

  useEffect(() => { if (temaConta) setTema(temaConta) }, [temaConta])
  useEffect(() => {
    const fechar = (e: PointerEvent) => {
      if (painel.current && !painel.current.contains(e.target as Node)) painel.current.open = false
    }
    document.addEventListener('pointerdown', fechar)
    return () => document.removeEventListener('pointerdown', fechar)
  }, [])

  async function escolherTema(novo: Tema) {
    if (salvando) return
    const anterior = tema
    setTema(novo)
    aplicarTema(novo)
    setErro(null)
    if (painel.current) { painel.current.open = false; painel.current.querySelector('summary')?.focus() }
    if (!salvarTema) return
    setSalvando(true)
    try { await salvarTema(novo) }
    catch { setTema(anterior); aplicarTema(anterior); setErro('Não foi possível salvar o tema. Tente novamente.') }
    finally { setSalvando(false) }
  }

  async function mudarIdioma() {
    setTraduzindo(true)
    setErro(null)
    try { await definirIdioma(idioma === 'pt' ? 'en' : 'pt') }
    catch { setErro('Não foi possível alterar o idioma. Tente novamente.') }
    finally { setTraduzindo(false) }
  }

  return <div className="topo-preferencias">
    <button className="topo-preferencia" type="button" aria-label={idioma === 'pt' ? 'Idioma: Português. Mudar para inglês' : 'Idioma: English. Mudar para português'} disabled={traduzindo} aria-busy={traduzindo} onClick={() => void mudarIdioma()}>
      <span translate="no">{traduzindo ? '…' : idioma.toUpperCase()}</span>
    </button>
    <details className="topo-tema" ref={painel} onKeyDown={(e) => {
      if (e.key === 'Escape' && painel.current) { painel.current.open = false; painel.current.querySelector('summary')?.focus() }
    }}>
      <summary className="topo-preferencia" aria-label="Escolher tema" title="Escolher tema">
        <IconeTema nome={TEMAS.find(t => t.id === tema)?.icone ?? 'sistema'} />
      </summary>
      <div className="topo-tema-opcoes" role="group" aria-label="Tema">
        <p>Tema</p>
        {TEMAS.map(t => <button key={t.id} type="button" aria-pressed={tema === t.id} disabled={salvando} onClick={() => void escolherTema(t.id)}>
          <IconeTema nome={t.icone} /><span>{t.nome}</span><span className="topo-tema-check" aria-hidden="true">{tema === t.id ? '✓' : ''}</span>
        </button>)}
        <small>Seguir o tema do aparelho</small>
      </div>
    </details>
    {erro && <p className="topo-preferencia-erro" role="alert">{erro}</p>}
  </div>
}
