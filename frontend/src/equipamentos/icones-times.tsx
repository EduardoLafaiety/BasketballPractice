import type { ReactNode } from 'react'

// Ícones próprios, em traço simples (24×24), inspirados no NOME de cada time.
// De propósito, nenhum imita escudo ou mascote: logos são marcas registradas da NBA e dos times.
// O traço usa currentColor; quem tem `fill="currentColor"` é preenchido.

export type IconeTime =
  | 'pena' | 'trevo' | 'rede' | 'vespa' | 'chifres' | 'espada' | 'pistao' | 'bandeira' | 'chama' | 'galhada'
  | 'predios' | 'estrela' | 'sino' | 'garras' | 'chapeu-mago' | 'chapeu' | 'pepita' | 'escudo' | 'foguete'
  | 'veleiro' | 'ondas' | 'pegada-urso' | 'pegada-lobo' | 'pelicano' | 'raio' | 'sol' | 'pinheiros' | 'coroa'
  | 'espora' | 'nota'

const F = 'currentColor'

export const ICONES_TIMES: Record<IconeTime, ReactNode> = {
  pena: <path d="M20 4C10 4 5 10 5 19c6 0 13-5 15-15M5 19l-2 2M9 12l4 1M11 9l4 1M8 15.5l3 .5" />,
  trevo: (
    <>
      <circle cx="12" cy="7.5" r="3.5" />
      <circle cx="7.5" cy="12.5" r="3.5" />
      <circle cx="16.5" cy="12.5" r="3.5" />
      <path d="M12 14c0 3.5 1 6 3 8" />
    </>
  ),
  rede: <path d="M3 5h18M5 5l2.5 14h9L19 5M5 5l6.5 14M19 5l-6.5 14M9.5 5l3 14M14.5 5l-3 14M6 10h12M7 15h10" />,
  vespa: (
    <>
      <ellipse cx="12" cy="14.5" rx="4" ry="6" />
      <path d="M8.3 12.5h7.4M8 15.5h8M9 18.5h6M12 20.5V23M10.5 9C8 4 3 5 5 8.5s4.5 2 5.5.5M13.5 9C16 4 21 5 19 8.5s-4.5 2-5.5.5" />
    </>
  ),
  chifres: <path d="M3 5c.5 5 3.5 8.5 9 8.5S20.5 10 21 5M8 12.5c.5 3 2 5 4 5s3.5-2 4-5" />,
  espada: <path d="M20 4 9 15M20 4v3l-9 9.5M20 4h-3L7.5 13M6 12l6 6M8 16l-4 4M3 19l2 2" />,
  pistao: (
    <>
      <rect x="6" y="3" width="12" height="8" rx="1" />
      <path d="M6 6h12M6 8.5h12M12 11v5" />
      <circle cx="12" cy="18.5" r="2.5" />
    </>
  ),
  bandeira: (
    <>
      <path d="M5 22V3M5 4h14v10H5" />
      <path fill={F} stroke="none" d="M5 4h4.7v3.3H5zM14.3 4H19v3.3h-4.7zM9.7 7.3h4.6v3.4H9.7zM5 10.7h4.7V14H5zM14.3 10.7H19V14h-4.7z" />
    </>
  ),
  chama: <path d="M12 2.5c1 4 6.5 6 6.5 11.5a6.5 6.5 0 0 1-13 0c0-3 1.8-4.6 3-6.5.3 2 1.2 3.2 2.5 3.5-.5-3-.3-5.8 1-8.5z" />,
  galhada: <path d="M12 22v-8M12 14c-4.5 0-7-3.5-7-9M5 9.5 2 7.5M7.5 6.5V3M12 14c4.5 0 7-3.5 7-9M19 9.5l3-2M16.5 6.5V3" />,
  predios: <path d="M2 21h20M3 21V11h4v10M7 21V4h5v17M12 21V8h4v13M16 21v-8h5v8M9 7h1M9 10h1M9 13h1M14 11h0M18.5 16h0" />,
  estrela: <path d="m12 2.5 2.8 6 6.5.7-4.9 4.4 1.4 6.5L12 16.8l-5.8 3.3 1.4-6.5-4.9-4.4 6.5-.7z" />,
  sino: <path d="M5.5 17.5c1-1.5 1.5-3 1.5-7.5a5 5 0 0 1 10 0c0 4.5.5 6 1.5 7.5zM12 17.5V21M10 3h4M12 3v2M11.5 9l1.5 2.5-1.5 2.5" />,
  garras: <path d="M6 3c2.5 6 2.5 12-1 18M12 2c2.5 6.5 2.5 13-1 20M18 3c2.5 6 2.5 12-1 18" />,
  'chapeu-mago': (
    <>
      <path d="M3 20.5h18M6.5 20.5 12 3l5.5 17.5M8 15.5c2.5 1 5.5 1 8 0" />
      <path fill={F} stroke="none" d="m11 9 .5 1.2 1.3.1-1 .9.3 1.3-1.1-.7-1.1.7.3-1.3-1-.9 1.3-.1z" />
    </>
  ),
  chapeu: <path d="M2 14.5c2.5 3.5 17.5 3.5 20 0M5 15c0-5.5 1.3-9 4-9 1.3 0 2 1 3 1s1.7-1 3-1c2.7 0 4 3.5 4 9M6 12.5c3.5 1.2 8.5 1.2 12 0" />,
  pepita: <path d="m3 17 3.5-5.5 6-1.5 6 4-2 6-9 1zM6.5 11.5l4 3.5 2-5M10.5 15l-1 5.5M10.5 15l6 5M19 3v4M17 5h4" />,
  escudo: <path d="M12 2.5 20 5.5v6.5c0 5-3.5 8.5-8 9.5-4.5-1-8-4.5-8-9.5V5.5zM12 7v10M7.5 11.5h9" />,
  foguete: (
    <>
      <path d="M12 2c4 3 5.5 8 4 13H8C6.5 10 8 5 12 2zM8 15l-3 3v2.5l4-2M16 15l3 3v2.5l-4-2M10.5 18h3L12 22z" />
      <circle cx="12" cy="9" r="1.7" />
    </>
  ),
  veleiro: <path d="M12 3v14M12 4l7 12h-7M11 6.5 5 16h6M3 18h18l-3 3.5H6z" />,
  ondas: <path d="M2 8c2.5-2 5-2 7.5 0s5 2 7.5 0 4-2 5 0M2 13c2.5-2 5-2 7.5 0s5 2 7.5 0 4-2 5 0M2 18c2.5-2 5-2 7.5 0s5 2 7.5 0 4-2 5 0" />,
  'pegada-urso': (
    <>
      <path d="M6.5 16.5c0-3.5 2.5-6 5.5-6s5.5 2.5 5.5 6c0 3-2.5 4.5-5.5 4.5s-5.5-1.5-5.5-4.5z" />
      <g fill={F} stroke="none">
        <circle cx="4.8" cy="10" r="1.8" />
        <circle cx="8.8" cy="6" r="1.8" />
        <circle cx="15.2" cy="6" r="1.8" />
        <circle cx="19.2" cy="10" r="1.8" />
      </g>
    </>
  ),
  'pegada-lobo': (
    <>
      <path d="M12 12c2.8 0 5 2.6 5 5.2 0 2.2-2 3.3-5 3.3s-5-1.1-5-3.3C7 14.6 9.2 12 12 12z" />
      <g fill={F} stroke="none">
        <ellipse cx="5.5" cy="11" rx="1.6" ry="2.3" />
        <ellipse cx="9.5" cy="6" rx="1.6" ry="2.5" />
        <ellipse cx="14.5" cy="6" rx="1.6" ry="2.5" />
        <ellipse cx="18.5" cy="11" rx="1.6" ry="2.3" />
      </g>
      <path d="M9.5 2.5V1.5M14.5 2.5v-1M5 7.5l-.5-1M19 7.5l.5-1" />
    </>
  ),
  pelicano: (
    <>
      <ellipse cx="8" cy="15.5" rx="5.5" ry="3.8" />
      <path d="M11.5 12.5c1.5-2 1.5-4.2 0-6M13.8 4.8 22 8l-8 .3M14 8.3c2 2.5 5 2.5 8-.3M6.5 19.3V22M9.5 19.3V22" />
      <circle cx="12" cy="5" r="2" />
      <circle cx="12.4" cy="4.7" r=".5" fill={F} />
    </>
  ),
  raio: <path d="M13.5 2 5 13.5h6.5L10 22l9-12h-6.5z" />,
  sol: (
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  pinheiros: <path d="M7 3 3 10h8zM7 7l-5 8h10zM7 15v3M17 6l-3.5 6h7zM17 9.5l-4.5 7h9zM17 16.5v2.5M3 22c3-2 6-2 9-1s6 1 9-1" />,
  coroa: <path d="m3 8 4.5 5L12 5.5l4.5 7.5L21 8l-2 11H5zM5.5 16h13" />,
  espora: (
    <>
      <circle cx="16" cy="12" r="1.6" />
      <path d="M16 5.5v3M16 15.5v3M9.5 12h3M19.5 12h3M11.4 7.4l2.1 2.1M18.5 14.5l2.1 2.1M11.4 16.6l2.1-2.1M18.5 9.5l2.1-2.1M2 8.5c3.5 0 6.5 1.3 8.5 3.5-2 2.2-5 3.5-8.5 3.5" />
    </>
  ),
  nota: (
    <>
      <path d="M14 18V3c0 3 5 4 5 8" />
      <ellipse cx="10.5" cy="18" rx="3.5" ry="2.7" fill={F} />
    </>
  ),
}
