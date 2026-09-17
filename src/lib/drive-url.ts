export function normalizarLinkDrive(valor: string): string | null {
  try {
    const url = new URL(valor.trim())

    if (
      url.protocol !== 'https:' ||
      !['drive.google.com', 'docs.google.com'].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.pathname === '/'
    ) {
      return null
    }

    return url.toString()
  } catch {
    return null
  }
}
