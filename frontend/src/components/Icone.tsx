// Ícones de traço (24×24) usados na navegação e nos botões; sempre decorativos.
const CAMINHOS = {
  bola: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2v20M5.2 4.8c3.4 3.6 3.4 10.8 0 14.4M18.8 4.8c-3.4 3.6-3.4 10.8 0 14.4" />
    </>
  ),
  inicio: <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />,
  treinos: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  rotina: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  desempenho: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  metas: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  ferramentas: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />,
  jogador: <path d="M8 3h2a2 2 0 0 0 4 0h2l1 4-2 2v12H9V9L7 7z" />,
  admin: <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />,
  config: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  sair: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" />,
  raio: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  seta: <path d="M5 12h14M13 6l6 6-6 6" />,
  relogio: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2M10 2h4M12 2v3" />
    </>
  ),
  ritmo: <path d="M2 12h3l2-6 4 12 3-9 2 3h6" />,
  video: (
    <>
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="m16 10 6-3v10l-6-3" />
    </>
  ),
  calculadora: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01" />
    </>
  ),
  check: <path d="M5 12.5 10 17 19 7" />,
  medalha: (
    <>
      <circle cx="12" cy="15" r="6" />
      <path d="M8.5 10.2 6 2h4l2 5 2-5h4l-2.5 8.2M12 12.5v5" />
    </>
  ),
  cadeado: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  fogo: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3.5-1-6 1-8.5z" />,
}

export type NomeIcone = keyof typeof CAMINHOS

export default function Icone({ nome, tamanho = 18 }: { nome: NomeIcone; tamanho?: number }) {
  return (
    <svg
      className="icone-svg"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {CAMINHOS[nome]}
    </svg>
  )
}
