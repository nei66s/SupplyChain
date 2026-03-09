'use client'

export default function ClearPilotPage() {
  return (
    <div className="space-y-2 p-4 font-body sm:p-6">
      <h1 className="text-xl font-semibold sm:text-2xl">Modo local removido</h1>
      <p className="text-sm text-muted-foreground sm:text-base">Os dados agora sao persistidos no banco. Esta tela nao tem mais efeito.</p>
    </div>
  )
}
