import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { repo } from './lib/repo'
import { seedDemoData } from './lib/demoSeed'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

// Local mode seeds immediately; Supabase mode seeds after login (AuthGate),
// because RLS rejects everything until a session exists. In the keyless
// demo deployment, also load sample training history (no-op otherwise).
const boot = import.meta.env.VITE_SUPABASE_URL
  ? Promise.resolve()
  : repo.ready().then(() => seedDemoData())
boot.finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  )
})
