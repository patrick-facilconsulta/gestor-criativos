import { useEffect, useRef, useState, type ReactNode } from 'react'

interface PreviaEscaladaProps {
  largura: number
  altura: number
  children: ReactNode
}

// Mostra a arte (desenhada em tamanho real) reduzida para caber na largura do
// cartão. O tamanho real continua intacto para exportar o PNG.
function PreviaEscalada({ largura, altura, children }: PreviaEscaladaProps) {
  const container = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(0.3)

  useEffect(() => {
    const elemento = container.current
    if (!elemento) return

    const observador = new ResizeObserver(([entrada]) => {
      setEscala(entrada.contentRect.width / largura)
    })
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [largura])

  return (
    <div
      ref={container}
      className="relative w-full overflow-hidden rounded-md border border-border"
      style={{ height: altura * escala }}
    >
      {/* Fora do fluxo: assim a arte de 1080 px não alarga o cartão */}
      <div style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${escala})`, transformOrigin: 'top left', width: largura, height: altura }}>
        {children}
      </div>
    </div>
  )
}

export default PreviaEscalada
