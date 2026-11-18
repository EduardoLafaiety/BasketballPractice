import type { Refeicao } from './dados'

// Pratinhos das refeições, desenhados à mão (48×48): o prato visto de lado, com a comida em cima. As cores são
// próprias e funcionam no tema claro e no escuro (o prato branco tem contorno, e a sombra é só um véu escuro).
const PRATO = (
  <>
    <ellipse cx="24" cy="38" rx="21" ry="5.5" fill="#000" opacity="0.18" />
    <ellipse cx="24" cy="35" rx="21.5" ry="6.5" fill="#fbfaf5" stroke="#d6d0bf" />
    <ellipse cx="24" cy="34" rx="15" ry="3.6" fill="none" stroke="#e7e2d4" />
  </>
)

const COMIDA: Record<Refeicao, JSX.Element> = {
  // Café da manhã: pão francês e ovo frito.
  cafe: (
    <>
      <path d="M8 33c0-6 6-9.5 13-9.5S34 27 34 33z" fill="#cf8b3e" />
      <path d="M10.5 31c1.5-4 5.5-6 10.5-6s9 2 10.5 6" stroke="#e5ab62" strokeWidth="2" fill="none" />
      <path d="M13 27.5c3-3.5 13-3.5 16 0" stroke="#a9692a" strokeWidth="1.3" fill="none" />
      <path d="M27 32c-.5-3 2-5 6-5s8 1 8 4-3 3-7 3-6.6-.4-7-2z" fill="#fff" stroke="#e1dccd" strokeWidth="0.7" />
      <ellipse cx="34" cy="29.6" rx="2.6" ry="1.9" fill="#f5b82e" />
    </>
  ),
  // Almoço: arroz, feijão, salada com tomate e frango grelhado.
  almoco: (
    <>
      <path d="M7 34c0-5 3.5-8 8-8s8 3 8 8z" fill="#fbf7ec" stroke="#d9cfb8" strokeWidth="0.8" />
      <path d="M11 30.5l1 .4M15 28.5l1 .2M18 31l1 .4" stroke="#c9bd9e" strokeLinecap="round" />
      <path d="M18 34c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6z" fill="#4a2414" />
      <circle cx="22" cy="31" r="0.9" fill="#7a4128" />
      <circle cx="26" cy="30.4" r="0.9" fill="#7a4128" />
      <path d="M27 34c-1-4 2-7.5 7-8 4.5-.4 7.5 3 7 8z" fill="#e3a352" stroke="#b9772f" strokeWidth="0.8" />
      <path d="M31 28l3 5M35 27.5l2.6 4.6" stroke="#a35c22" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M9 27c-1-4 2-7 5-6.5M12.5 26c1-3.5 4.5-5 6.5-3.5" stroke="#2fa36b" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="16.5" cy="24.5" r="2" fill="#f25f5c" />
    </>
  ),
  // Café da tarde: banana e um potinho de doce de leite com a colher.
  lanche: (
    <>
      <path d="M8 31c4 5 20 6 30-3-1 4-7 9-16 9S9 35 8 31z" fill="#f5d24a" stroke="#c9a227" strokeWidth="0.8" />
      <path d="M7.4 29.6l1 1.6M38.6 27.4l-1.2 1" stroke="#5b4320" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M27 34v-5.5h12V34" fill="#fbf7ec" stroke="#cfc6b1" strokeWidth="0.8" />
      <ellipse cx="33" cy="28.5" rx="6" ry="1.8" fill="#b8692a" />
      <path d="M35 28c2-6 4-9 5-11" stroke="#9a9384" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  // Janta: bife grelhado, batata-doce e brócolis.
  janta: (
    <>
      <path d="M6 34c0-5 4-8.5 10-8.5s10 3.5 10 8.5z" fill="#8f3f30" stroke="#f1d3c1" strokeWidth="1.2" />
      <path d="M10 31l3-3.5M14 32l3.4-4M18 32.4l2.6-3" stroke="#5a2216" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M24 34l2.6-6.4 6 2.4-1.6 4z" fill="#f08a3c" stroke="#b5502a" strokeWidth="0.8" />
      <path d="M37 34v-5" stroke="#8fc46a" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="34.6" cy="27.6" r="2.8" fill="#2f9e5e" />
      <circle cx="39.4" cy="27.6" r="2.8" fill="#2f9e5e" />
      <circle cx="37" cy="25" r="3" fill="#38b06a" />
    </>
  ),
}

// O prato fica na metade de baixo do desenho; sobe um pouco para o pratinho ficar no meio do ícone.
export default function IconeRefeicao({ refeicao, tamanho = 52 }: { refeicao: Refeicao; tamanho?: number }) {
  return (
    <svg className="icone-refeicao" width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden focusable="false">
      <g transform="translate(0 -6)">
        {PRATO}
        {COMIDA[refeicao]}
      </g>
    </svg>
  )
}
