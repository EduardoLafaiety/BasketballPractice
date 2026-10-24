// Sons gerados com a Web Audio API: funcionam offline e sem arquivos de áudio.
let contexto: AudioContext | null = null

/** Contexto de áudio compartilhado. Navegadores só liberam o som depois de um toque do usuário. */
export function audio() {
  contexto ??= new AudioContext()
  if (contexto.state === 'suspended') void contexto.resume()
  return contexto
}

/** Toca um bipe curto; `quando` é o instante no relógio do AudioContext (padrão: agora). */
export function bipe(frequencia = 880, duracaoMs = 120, volume = 0.3, quando?: number) {
  const ctx = audio()
  const inicio = quando ?? ctx.currentTime
  const osc = ctx.createOscillator()
  const ganho = ctx.createGain()
  osc.frequency.value = frequencia
  osc.type = 'sine'
  // Envelope curto evita o estalo no começo e no fim do som.
  ganho.gain.setValueAtTime(0, inicio)
  ganho.gain.linearRampToValueAtTime(volume, inicio + 0.005)
  ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracaoMs / 1000)
  osc.connect(ganho).connect(ctx.destination)
  osc.start(inicio)
  osc.stop(inicio + duracaoMs / 1000 + 0.02)
}

/** Vibra o celular, se houver suporte (ignorado em desktop). */
export function vibrar(padrao: number | number[]) {
  // Sem um toque do usuário antes, o Chrome recusa e registra erro no console.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return
  try {
    navigator.vibrate?.(padrao)
  } catch {
    // sem vibração
  }
}

/**
 * Metrônomo preciso: agenda as batidas no relógio do áudio com antecedência,
 * em vez de depender do setInterval (que atrasa quando a aba fica ocupada).
 */
export function criarMetronomo(aoBater: (batida: number) => void) {
  let bpm = 90
  let compasso = 4
  let proxima = 0
  let batida = 0
  let timer: number | undefined

  const agendar = () => {
    const ctx = audio()
    while (proxima < ctx.currentTime + 0.1) {
      const acento = batida % compasso === 0
      bipe(acento ? 1320 : 880, 60, acento ? 0.45 : 0.3, proxima)
      const numero = batida
      const atraso = Math.max(0, (proxima - ctx.currentTime) * 1000)
      window.setTimeout(() => aoBater(numero), atraso)
      proxima += 60 / bpm
      batida++
    }
  }

  return {
    iniciar() {
      if (timer !== undefined) return
      batida = 0
      proxima = audio().currentTime + 0.05
      agendar()
      timer = window.setInterval(agendar, 25)
    },
    parar() {
      window.clearInterval(timer)
      timer = undefined
    },
    definir(novoBpm: number, novoCompasso: number) {
      bpm = novoBpm
      compasso = Math.max(1, novoCompasso)
    },
  }
}
