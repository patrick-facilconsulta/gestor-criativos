import type { ReactNode } from 'react'
import logoPrimario from '../../docs/Logotipo primário.svg'
import logoPrimarioBranco from '../../docs/primário branco.svg'

interface AuthFrameProps {
  title: string
  description: string
  children: ReactNode
}

function AuthFrame({ title, description, children }: AuthFrameProps) {
  return (
    <main className="grid min-h-svh bg-[#f7faff] lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.8fr)]">
      <section className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#0a2c53,#061c36)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:38px_38px]" />
        <div className="relative">
          <img src={logoPrimarioBranco} alt="Fácil Consulta" className="h-12 w-auto" />
        </div>
        <div className="relative max-w-md">
          <p className="font-heading text-4xl font-bold leading-tight">Produção criativa, organizada.</p>
          <p className="mt-4 text-base leading-7 text-blue-100">Acompanhe demandas, entregas e metas do seu time em um só lugar.</p>
        </div>
        <p className="relative text-sm text-blue-200">Nacional</p>
      </section>

      <section className="flex items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-[0_20px_50px_rgba(10,44,83,.09)] sm:p-8">
          <div className="mb-7 lg:hidden">
            <img src={logoPrimario} alt="Fácil Consulta" className="h-10 w-auto" />
          </div>
          <h1 className="text-2xl font-bold tracking-normal">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="mt-7">{children}</div>
        </div>
      </section>
    </main>
  )
}

export default AuthFrame