import { useEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AuthGate } from './components/AuthGate'
import { BottomNav } from './components/BottomNav'
import { PullToRefresh } from './lib/pullRefresh'
import { Home } from './screens/Home'
import { Train } from './screens/Train'
import { Progress } from './screens/Progress'
import { Plan } from './screens/Plan'

export default function App() {
  // THE scroller. The document itself is locked (index.css) so nothing is
  // positioned against iOS Safari's drifting layout viewport — the nav is a
  // plain flex child of the shell and can never float mid-screen.
  const scrollRef = useRef<HTMLElement>(null)
  const location = useLocation()

  // Tab switch — and an active-tab re-tap — lands at the top of the screen.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [location.pathname, location.state?.reset])

  return (
    <AuthGate>
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Ambient signature glow */}
      <div className="glow-orb -top-[20vmin] -right-[20vmin]" />
      <PullToRefresh scrollRef={scrollRef} />
      {/* min-h-0: without it the flex child won't shrink and never scrolls */}
      <main ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain relative z-10">
        <div className="mx-auto max-w-107 px-4 pt-safe pb-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/train" element={<Train />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/plan" element={<Plan />} />
          </Routes>
        </div>
      </main>
      <BottomNav />
    </div>
    </AuthGate>
  )
}
