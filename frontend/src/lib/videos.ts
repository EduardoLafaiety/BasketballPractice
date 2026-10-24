// Vídeos de arremesso guardados só neste navegador (IndexedDB). Nada é enviado ao servidor.
const BANCO = 'bp-videos'
const LOJA = 'videos'

export interface Video {
  id: string
  nome: string
  criadoEm: string // ISO
  tipo: string
  tamanho: number
  blob: Blob
}

function abrir() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const pedido = indexedDB.open(BANCO, 1)
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA, { keyPath: 'id' })
    pedido.onsuccess = () => resolve(pedido.result)
    pedido.onerror = () => reject(pedido.error ?? new Error('Armazenamento de vídeos indisponível'))
  })
}

async function transacao<T>(modo: IDBTransactionMode, fazer: (loja: IDBObjectStore) => IDBRequest<T>) {
  const db = await abrir()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(LOJA, modo)
      const pedido = fazer(tx.objectStore(LOJA))
      tx.oncomplete = () => resolve(pedido.result)
      tx.onerror = () => reject(tx.error ?? new Error('Falha ao acessar os vídeos'))
      tx.onabort = () => reject(tx.error ?? new Error('Sem espaço para salvar o vídeo'))
    })
  } finally {
    db.close()
  }
}

export async function listarVideos() {
  const todos = await transacao<Video[]>('readonly', (loja) => loja.getAll() as IDBRequest<Video[]>)
  return todos.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
}

export async function salvarVideo(blob: Blob, nome: string) {
  const video: Video = {
    id: crypto.randomUUID(),
    nome,
    criadoEm: new Date().toISOString(),
    tipo: blob.type,
    tamanho: blob.size,
    blob,
  }
  await transacao('readwrite', (loja) => loja.put(video))
  return video
}

export const renomearVideo = (video: Video, nome: string) => transacao('readwrite', (loja) => loja.put({ ...video, nome }))

export const removerVideo = (id: string) => transacao('readwrite', (loja) => loja.delete(id))

export const formatarTamanho = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
