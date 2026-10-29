// Na versão de demonstração, as rotas do backend rodam no navegador. Elas só usam o Router do Express,
// então este módulo entra no lugar dele (alias no vite.config.ts) com o mesmo pedaço da interface.

export interface PedidoDemo {
  method: string
  path: string
  params: Record<string, string>
  query: Record<string, string | string[]>
  body: unknown
  headers: Record<string, string | undefined>
  userId?: number
}

export class RespostaDemo {
  statusCode = 200
  body: unknown = undefined
  headers: Record<string, string> = {}

  status(codigo: number) {
    this.statusCode = codigo
    return this
  }

  json(dados: unknown) {
    this.body = dados
    return this
  }

  end() {
    return this
  }

  setHeader(nome: string, valor: string) {
    this.headers[nome.toLowerCase()] = valor
    return this
  }
}

type Tratador = (req: PedidoDemo, res: RespostaDemo, next: (erro?: unknown) => void) => unknown

interface Rota {
  metodo: string
  padrao: RegExp
  nomes: string[]
  tratadores: Tratador[]
}

/** "/:id/x" vira /^\/([^/]+)\/x\/?$/ e guarda o nome "id". */
function compilar(caminho: string) {
  const nomes: string[] = []
  const corpo = caminho
    .split('/')
    .filter(Boolean)
    .map((parte) => {
      if (parte.startsWith(':')) {
        nomes.push(parte.slice(1))
        return '([^/]+)'
      }
      return parte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')
  return { padrao: new RegExp(`^/${corpo}/?$`), nomes }
}

export class RouterDemo {
  private rotas: Rota[] = []

  private adicionar(metodo: string, caminho: string, tratadores: Tratador[]) {
    this.rotas.push({ metodo, ...compilar(caminho), tratadores })
    return this
  }

  get = (caminho: string, ...t: Tratador[]) => this.adicionar('GET', caminho, t)
  post = (caminho: string, ...t: Tratador[]) => this.adicionar('POST', caminho, t)
  put = (caminho: string, ...t: Tratador[]) => this.adicionar('PUT', caminho, t)
  patch = (caminho: string, ...t: Tratador[]) => this.adicionar('PATCH', caminho, t)
  delete = (caminho: string, ...t: Tratador[]) => this.adicionar('DELETE', caminho, t)

  /** Roda a primeira rota que casar, na ordem de registro (como o Express). Devolve false se nenhuma casar. */
  async tratar(req: PedidoDemo, res: RespostaDemo) {
    for (const rota of this.rotas) {
      if (rota.metodo !== req.method) continue
      const achou = rota.padrao.exec(req.path)
      if (!achou) continue
      req.params = Object.fromEntries(rota.nomes.map((nome, i) => [nome, decodeURIComponent(achou[i + 1])]))
      for (const tratador of rota.tratadores) {
        let seguir = false
        let erroDoNext: unknown
        await tratador(req, res, (erro) => {
          seguir = true
          erroDoNext = erro
        })
        if (erroDoNext) throw erroDoNext
        if (!seguir) break
      }
      return true
    }
    return false
  }
}

export function Router() {
  return new RouterDemo()
}

export default { Router }
