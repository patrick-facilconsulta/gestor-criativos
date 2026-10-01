// Copia um texto para a área de transferência. Devolve false quando o navegador
// bloqueia o acesso (ex.: página fora de HTTPS), para a tela avisar o usuário.
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}
