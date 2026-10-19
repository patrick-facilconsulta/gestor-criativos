import ConfiguracaoMeta from '@/components/configuracoes/configuracao-meta'
import ConvidarUsuario from '@/components/configuracoes/convidar-usuario'
import ListaFrentes from '@/components/configuracoes/lista-frentes'
import TabelaMetas from '@/components/configuracoes/tabela-metas'
import { useFrentes } from '@/hooks/use-frentes'
import { useMetas } from '@/hooks/use-metas'

function Configuracoes() {
  const { data: frentes } = useFrentes()
  const { data: metas } = useMetas()

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-[#0d559f]">Administração</p>
        <h1 className="mt-1 text-3xl font-bold tracking-normal">Configurações</h1>
        <p className="mt-2 text-sm text-muted-foreground">Mantenha as metas e os conceitos de trabalho atualizados.</p>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">Metas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Defina os objetivos semanais e mensais por conceito.</p>
        </div>
        {frentes && metas ? (
          <div className="p-5"><TabelaMetas metas={metas} frentes={frentes} /></div>
        ) : (
          <p className="p-5 text-sm text-muted-foreground">Carregando...</p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Conceitos</h2>
        <p className="mt-1 text-sm text-muted-foreground">Organize as áreas que recebem demanda criativa.</p>
        {frentes ? (
          <div className="mt-5"><ListaFrentes frentes={frentes} /></div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">Carregando...</p>
        )}
      </section>

      <ConfiguracaoMeta />

      <ConvidarUsuario />
    </div>
  )
}

export default Configuracoes
