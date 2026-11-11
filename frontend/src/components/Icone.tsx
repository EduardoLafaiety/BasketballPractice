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
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  sair: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" />,
  pausa: <path d="M8 5v14M16 5v14" />,
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
  xis: <path d="M6 6l12 12M18 6 6 18" />,
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
  prancheta: (
    <>
      <rect x="4" y="4" width="16" height="18" rx="2" />
      <path d="M9 2h6v4H9zM8 12l3 3M11 12l-3 3M14 17l3-6M15.5 10.5 17 11l-.3 1.6" />
    </>
  ),
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
