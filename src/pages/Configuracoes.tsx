import ListaFrentes from '@/components/configuracoes/lista-frentes'
import TabelaMetas from '@/components/configuracoes/tabela-metas'
import { Button } from '@/components/ui/button'
import { useFrentes } from '@/hooks/use-frentes'
import { useMetas } from '@/hooks/use-metas'
import { supabase } from '@/lib/supabase'

function Configuracoes() {
  const { data: frentes } = useFrentes()
  const { data: metas } = useMetas()

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Configurações</h1>
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>
          Sair
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Metas</h2>
        {frentes && metas ? (
          <TabelaMetas metas={metas} frentes={frentes} />
        ) : (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Frentes</h2>
        {frentes ? (
          <ListaFrentes frentes={frentes} />
        ) : (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        )}
      </section>
    </div>
  )
}

export default Configuracoes
