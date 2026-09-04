import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import RotaProtegida from './components/RotaProtegida'
import { Toaster } from './components/ui/sonner'
import { AuthProvider } from './lib/auth-context'
import Configuracoes from './pages/Configuracoes'
import Criativos from './pages/Criativos'
import Dashboard from './pages/Dashboard'
import Entregas from './pages/Entregas'
import EsqueciSenha from './pages/EsqueciSenha'
import Login from './pages/Login'
import RedefinirSenha from './pages/RedefinirSenha'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route
              path="/criativos"
              element={
                <RotaProtegida>
                  <Criativos />
                </RotaProtegida>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RotaProtegida>
                  <Dashboard />
                </RotaProtegida>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <RotaProtegida>
                  <Configuracoes />
                </RotaProtegida>
              }
            />
            <Route
              path="/entregas"
              element={
                <RotaProtegida>
                  <Entregas />
                </RotaProtegida>
              }
            />
            <Route path="*" element={<Navigate to="/criativos" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
