import { useEffect, useState } from 'react'
import { Check, Copy, Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ROTULO_FORMATO } from '@/lib/constantes'
import { copiarTexto } from '@/lib/copiar-texto'
import { CAMPOS_COPY, type ChaveCopy } from '@/lib/textos-anuncio'
import type { Criativo } from '@/types/database'

interface ModalTextosAnuncioProps {
  criativo: Criativo | null
  nomeFrente?: string
  onFechar: () => void
}

function ModalTextosAnuncio({ criativo, nomeFrente, onFechar }: ModalTextosAnuncioProps) {
  const [copiado, setCopiado] = useState<ChaveCopy | 'tudo' | null>(null)

  // O ícone de "copiado" volta ao normal depois de 2 segundos.
  useEffect(() => {
    if (!copiado) return
    const temporizador = setTimeout(() => setCopiado(null), 2000)
    return () => clearTimeout(temporizador)
  }, [copiado])

  const camposPreenchidos = criativo
    ? CAMPOS_COPY.filter(({ chave }) => Boolean(criativo[chave]?.trim()))
    : []

  async function copiar(texto: string, origem: ChaveCopy | 'tudo') {
    if (await copiarTexto(texto)) {
      setCopiado(origem)
      toast.success(origem === 'tudo' ? 'Todos os textos copiados.' : 'Texto copiado.')
    } else {
      toast.error('Não foi possível copiar o texto.')
    }
  }

  function copiarTudo() {
    if (!criativo) return
    const bloco = camposPreenchidos
      .map(({ chave, rotulo }) => `${rotulo}:\n${criativo[chave]!.trim()}`)
      .join('\n\n')
    copiar(bloco, 'tudo')
  }

  return (
    <Dialog
      open={criativo !== null}
      onOpenChange={(aberto) => {
        if (!aberto) {
          setCopiado(null)
          onFechar()
        }
      }}
    >
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
        {criativo && (
          <>
            <DialogHeader>
              <DialogTitle>{criativo.titulo}</DialogTitle>
              <DialogDescription>
                Textos do anúncio · {nomeFrente ?? 'Sem frente'} · {ROTULO_FORMATO[criativo.formato]}
              </DialogDescription>
            </DialogHeader>

            {camposPreenchidos.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-4 py-6 text-center">
                <p className="text-sm font-medium">Este criativo ainda não tem textos cadastrados.</p>
                <p className="mt-1 text-sm text-muted-foreground">Preencha a seção "Copy para anúncio" em Criativos → Editar.</p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link to="/criativos">
                    <Pencil />
                    Ir para Criativos
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {CAMPOS_COPY.map(({ chave, rotulo }) => {
                  const valor = criativo[chave]?.trim()

                  return (
                    <div key={chave} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{rotulo}</p>
                        {valor && <span className="text-xs text-muted-foreground">{valor.length} caracteres</span>}
                      </div>
                      {valor ? (
                        <div className="flex items-start gap-2 rounded-md border border-[#d7e6f7] bg-[#f7faff] py-2 pr-1.5 pl-3">
                          <p className="min-w-0 flex-1 py-0.5 text-sm break-words whitespace-pre-wrap">{valor}</p>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title={`Copiar ${rotulo.toLowerCase()}`}
                            onClick={() => copiar(valor, chave)}
                          >
                            {copiado === chave ? <Check className="text-[#187a3b]" /> : <Copy />}
                          </Button>
                        </div>
                      ) : (
                        <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">Não preenchido</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {camposPreenchidos.length > 0 && (
              <DialogFooter>
                <Button onClick={copiarTudo}>
                  {copiado === 'tudo' ? <Check /> : <Copy />}
                  Copiar tudo
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ModalTextosAnuncio
