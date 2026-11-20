import { useRef, useState, type ChangeEvent } from 'react'
import { useAuth } from '../../autenticacao/model/auth'
import { api } from '../../../shared/api/backend'
import Avatar from '../../../shared/ui/Avatar'
import { prepararFoto } from '../lib/foto-perfil'

export default function FotoPerfil() {
  const { usuario, reconferirSessao } = useAuth()
  const input = useRef<HTMLInputElement>(null)
  const [previa, setPrevia] = useState<string | null>(null)
  const [salva, setSalva] = useState<string | null | undefined>(undefined)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const atual = salva !== undefined ? salva : usuario?.avatarUrl

  async function escolher(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setOcupado(true); setErro(''); setAviso('')
    try { setPrevia(await prepararFoto(file)) }
    catch (error) { setErro((error as Error).message) }
    finally { setOcupado(false) }
  }
  async function salvar(remover = false) {
    if (!remover && !previa) return
    setOcupado(true); setErro(''); setAviso('')
    try {
      const result = remover ? await api.removerFoto() : await api.salvarFoto(previa!)
      setSalva(result.avatarUrl); setPrevia(null); reconferirSessao()
      setAviso(remover ? 'Foto removida.' : 'Foto de perfil atualizada.')
    } catch (error) { setErro((error as Error).message) }
    finally { setOcupado(false) }
  }
  return <div className="conta-foto">
    <Avatar nome={usuario?.name || 'Visitante'} foto={previa ?? atual} className="conta-avatar" />
    {!__DEMO__ && <>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Selecionar foto de perfil" hidden onChange={event => void escolher(event)} />
      <button className="btn conta-foto-botao" type="button" disabled={ocupado} onClick={() => input.current?.click()}>{ocupado ? 'Preparando…' : 'Alterar foto'}</button>
      <small className="muted">PNG, JPG ou WebP · até 5 MB</small>
      {previa && <div className="conta-foto-acoes"><button className="btn btn-primario" disabled={ocupado} onClick={() => void salvar()}>Salvar foto</button><button className="btn" disabled={ocupado} onClick={() => setPrevia(null)}>Cancelar</button></div>}
      {atual && !previa && <button className="conta-foto-remover" disabled={ocupado} onClick={() => void salvar(true)}>Remover foto</button>}
      {erro && <p className="erro" role="alert">{erro}</p>}
      {aviso && <p className="muted" role="status">{aviso}</p>}
    </>}
  </div>
}
