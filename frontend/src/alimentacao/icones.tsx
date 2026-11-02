import type { Refeicao } from './dados'

// Ícones das refeições, desenhados à mão (48×48), com cores próprias que funcionam no tema claro e no escuro.
const DESENHOS: Record<Refeicao, JSX.Element> = {
  // Café da manhã: xícara de café com vapor.
  cafe: (
    <>
      <path d="M17 4c-2 3 2 5 0 8M24 2c-2 3 2 5 0 8M31 4c-2 3 2 5 0 8" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" fill="none" />
      <ellipse cx="24" cy="41" rx="18" ry="3.5" fill="#cfc8b6" />
      <path d="M36 21h2.5a5.5 5.5 0 0 1 0 11H35" stroke="#d9530a" strokeWidth="3.2" fill="none" />
      <path d="M11 17h26v15a8 8 0 0 1-8 8H19a8 8 0 0 1-8-8z" fill="#ff6a13" />
      <ellipse cx="24" cy="17" rx="13" ry="3.2" fill="#5a3420" />
      <path d="M15 24v7" stroke="#ffa66b" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  // Almoço: tigela de arroz.
  almoco: (
    <>
      <path d="M8 26c0-8.5 7-14 16-14s16 5.5 16 14z" fill="#fbf7ec" stroke="#d6ccb3" strokeWidth="1.5" />
      <path d="M15 21l2 1M21 17l2 .5M28 17.5l2-1M33 22l2 1M19 24l2-.5M26 23l2 1" stroke="#cbbf9f" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 26h38c-1 9-8 15-19 15S6 35 5 26z" fill="#4da3ff" />
      <path d="M7.5 31h33" stroke="#2f7fd6" strokeWidth="2" />
      <rect x="17" y="39.5" width="14" height="3.5" rx="1.75" fill="#2f7fd6" />
    </>
  ),
  // Café da tarde: sanduíche.
  lanche: (
    <>
      <rect x="6" y="31" width="36" height="8" rx="4" fill="#d9954a" />
      <rect x="8" y="28" width="32" height="4.5" rx="2.25" fill="#f25f5c" />
      <path d="M7 25h34l-3 5.5-4-3-5 4-4-4-5 4-4-3-5 3z" fill="#f5c542" />
      <path d="M5 24c3-3 5 1 8-1s5 2 8 0 5 2 8 0 5 2 8 0 3 1 6 1v3H5z" fill="#43c59e" />
      <path d="M6 23c0-8 8-13 18-13s18 5 18 13z" fill="#e8b56b" />
      <ellipse cx="17" cy="16" rx="1.6" ry="1" fill="#fff3d6" />
      <ellipse cx="25" cy="13.5" rx="1.6" ry="1" fill="#fff3d6" />
      <ellipse cx="31" cy="17" rx="1.6" ry="1" fill="#fff3d6" />
    </>
  ),
  // Janta: bisteca de porco grelhada, com a borda de gordura e o osso.
  janta: (
    <>
      <path d="M8 14c0-5 4-8 9-8h12c8 0 14 7 14 16 0 10-7 18-17 18h-6c-6 0-9-4-9-8 0-3 2-5 2-8s-5-5-5-10z" fill="#f6d9c9" stroke="#e2b9a3" strokeWidth="1.2" />
      <path d="M12 15c0-3 2-5 5-5h11c6 0 11 5 11 12 0 8-6 14-13 14h-5c-4 0-6-2-6-5 0-2 2-4 2-7s-5-5-5-9z" fill="#c96a55" />
      <path d="M14.5 11c-1 5 3.5 7 3.5 11s-3.5 6-2.5 10" stroke="#f3ead8" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M23 15l11 11M27 12.5l9.5 9.5M21 21.5l10 10" stroke="#8f3f30" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
}

export default function IconeRefeicao({ refeicao, tamanho = 40 }: { refeicao: Refeicao; tamanho?: number }) {
  return (
    <svg className="icone-refeicao" width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden focusable="false">
      {DESENHOS[refeicao]}
    </svg>
  )
}
