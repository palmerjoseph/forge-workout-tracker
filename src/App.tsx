import { Route, Routes } from 'react-router-dom'
import { AuthGate } from './components/AuthGate'
import { BottomNav } from './components/BottomNav'
import { PullToRefresh } from './lib/pullRefresh'
import { Home } from './screens/Home'
import { Train } from './screens/Train'
import { Progress } from './screens/Progress'
import { Plan } from './screens/Plan'

export default function App() {
  return (
    <AuthGate>
    <div className="min-h-dvh relative">
      {/* Ambient signature glow */}
      <div className="glow-orb -top-[20vmin] -right-[20vmin]" />
      <PullToRefresh />
      <main className="relative z-10 mx-auto max-w-107 px-4 pt-safe pb-28">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/train" element={<Train />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/plan" element={<Plan />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
    </AuthGate>
  )
}
