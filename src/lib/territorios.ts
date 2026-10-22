// Territórios criativos: famílias visuais bem diferentes entre si, para a
// Fábrica diversificar as peças (pedido do gerente de contas do Meta, 21/10/2026).
// Cada layout tem um território (fabrica_layouts.territorio); as referências do
// Pinterest também (fabrica_referencias.territorio).

export const ROTULO_TERRITORIO: Record<string, string> = {
  classico: 'Arte clássica',
  interface: 'Interface do dia a dia',
  editorial: 'Tipografia editorial',
  pessoa: 'Pessoa em cena real',
  conversa: 'Conversa',
  enquete: 'Enquete de stories',
  relogio: 'Relógio / hora do dia',
  recortes: 'Recortes de papel',
  objeto: 'Objeto-metáfora',
  produto: 'Produto de verdade',
  referencia: 'Layout por referência',
}

// Território sugerido que ainda não existe vem como "novo:<nome>"
export function rotuloTerritorio(territorio: string | null | undefined) {
  if (!territorio) return 'Sem território'
  if (territorio.startsWith('novo:')) return `Sugestão de território novo: ${territorio.slice(5)}`
  return ROTULO_TERRITORIO[territorio] ?? territorio
}
