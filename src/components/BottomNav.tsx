import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { IconCalendar, IconDumbbell, IconHome, IconPulse } from './icons'

const TABS = [
  { to: '/', label: 'Home', icon: IconHome },
  { to: '/train', label: 'Train', icon: IconDumbbell },
  { to: '/progress', label: 'Progress', icon: IconPulse },
  { to: '/plan', label: 'Plan', icon: IconCalendar },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 inset-x-0 z-40 flex justify-center bg-bg0/80 backdrop-blur-xl border-t border-edge"
    >
      <div className="flex w-full max-w-107 pb-safe">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={(e) => {
              // Re-tapping the active tab resets that screen to its start
              if (location.pathname === to) {
                e.preventDefault()
                navigate(to, { replace: true, state: { reset: Date.now() } })
              }
            }}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 min-h-11 transition-colors duration-200 ${
                isActive ? 'text-lime' : 'text-ink-faint hover:text-ink-dim'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(168,224,99,0.8))' } : undefined}>
                  <Icon size={22} />
                </span>
                <span className="text-[0.65rem] font-medium tracking-wide">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
