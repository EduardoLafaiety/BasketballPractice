export default function Avatar({ nome, foto, className = 'avatar', letras = 2 }: { nome: string; foto?: string | null; className?: string; letras?: number }) {
  const iniciais = nome.trim().split(/\s+/).filter(Boolean).slice(0, letras).map(parte => parte[0]).join('').toUpperCase()
  return <span className={className} aria-hidden="true">{foto ? <img src={foto} alt="" /> : iniciais}</span>
}
