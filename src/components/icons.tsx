import type { SVGProps } from 'react'

/* FORGE icon set — ONE visual language.
   Rules (see docs/DESIGN-SYSTEM.md): 24px grid, stroke 1.75, round caps
   and joins, no fills except tiny accent dots, currentColor only.
   Add new icons here and nowhere else; never import an external pack. */

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Base({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconHome = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 11.5 12 4.5l8 7" />
    <path d="M6 10.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8.5" />
    <path d="M10 20v-5h4v5" />
  </Base>
)

export const IconDumbbell = (p: IconProps) => (
  <Base {...p}>
    <rect x="2.5" y="9" width="3" height="6" rx="1" />
    <rect x="18.5" y="9" width="3" height="6" rx="1" />
    <rect x="5.5" y="7" width="3" height="10" rx="1" />
    <rect x="15.5" y="7" width="3" height="10" rx="1" />
    <path d="M8.5 12h7" />
  </Base>
)

export const IconBarbell = (p: IconProps) => (
  <Base {...p}>
    <path d="M1.5 12h2M20.5 12h2" />
    <rect x="3.5" y="8" width="2.5" height="8" rx="0.8" />
    <rect x="18" y="8" width="2.5" height="8" rx="0.8" />
    <rect x="6.5" y="9.5" width="2" height="5" rx="0.7" />
    <rect x="15.5" y="9.5" width="2" height="5" rx="0.7" />
    <path d="M8.5 12h7" />
  </Base>
)

export const IconBand = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 16c0-5 3.5-9 8-9s8 4 8 9" />
    <rect x="2.5" y="15" width="3" height="4.5" rx="1" />
    <rect x="18.5" y="15" width="3" height="4.5" rx="1" />
  </Base>
)

export const IconBodyweight = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="5" r="2.2" />
    <path d="M5 10.5c2.3 1 4.6 1.5 7 1.5s4.7-.5 7-1.5" />
    <path d="M12 12v4.5M12 16.5 8.5 21M12 16.5l3.5 4.5" />
  </Base>
)

export const IconAbs = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 3.5h8M8 3.5v9a4 4 0 0 0 8 0v-9" />
    <path d="M8 7.5h8M8 11.5h8" />
    <path d="M12 3.5v13" />
    <path d="M12 20.5v-2" />
  </Base>
)

export const IconPulse = (p: IconProps) => (
  <Base {...p}>
    <path d="M2.5 13h4l2.5-6 4 10 2.5-7 1.5 3h4.5" />
  </Base>
)

export const IconCalendar = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
    <circle cx="12" cy="14.5" r="1" fill="currentColor" stroke="none" />
  </Base>
)

export const IconFlame = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3.5c1 2.5 4.5 4.5 4.5 9a4.5 4.5 0 0 1-9 0c0-1.8.7-3.2 1.6-4.6.4 1 1 1.7 1.9 2.1C11.2 8 11.3 5.5 12 3.5Z" />
    <path d="M12 20.5v-2" />
  </Base>
)

export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Base>
)

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Base>
)

export const IconX = (p: IconProps) => (
  <Base {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Base>
)

export const IconChevronLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="m14.5 5.5-6 6.5 6 6.5" />
  </Base>
)

export const IconChevronRight = (p: IconProps) => (
  <Base {...p}>
    <path d="m9.5 5.5 6 6.5-6 6.5" />
  </Base>
)

export const IconChevronDown = (p: IconProps) => (
  <Base {...p}>
    <path d="m5.5 9.5 6.5 6 6.5-6" />
  </Base>
)

export const IconTrophy = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
    <path d="M8 5.5H5a3 3 0 0 0 3 4M16 5.5h3a3 3 0 0 1-3 4" />
    <path d="M12 13v3.5M8.5 20h7M12 16.5v3.5" />
  </Base>
)

export const IconMoon = (p: IconProps) => (
  <Base {...p}>
    <path d="M19.5 14A8 8 0 0 1 10 4.5a8 8 0 1 0 9.5 9.5Z" />
  </Base>
)

export const IconSliders = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.5 7.5h9M17.5 7.5h2M4.5 16.5h2M10.5 16.5h9" />
    <circle cx="15.5" cy="7.5" r="2" />
    <circle cx="8.5" cy="16.5" r="2" />
  </Base>
)

export const IconTimer = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="13.5" r="7" />
    <path d="M12 10v3.5l2.5 1.5M10 3h4" />
  </Base>
)

export const IconReport = (p: IconProps) => (
  <Base {...p}>
    <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
    <path d="M9 13.5v3M12 10.5v6M15 8v8.5" />
  </Base>
)

export const IconEdit = (p: IconProps) => (
  <Base {...p}>
    <path d="M13.5 5.5 18.5 10.5 9 20H4v-5l9.5-9.5Z" />
    <path d="m12 7 5 5" />
  </Base>
)

/** Reps: repeat cycle around a count mark */
export const IconReps = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.5 12a7.5 7.5 0 0 1 13-5.1M19.5 12a7.5 7.5 0 0 1-13 5.1" />
    <path d="M17.5 3.5v3.5H14M6.5 20.5V17H10" />
    <path d="M12 9.5v5M9.8 11.2 12 9.5l2.2 1.7" />
  </Base>
)

/** Ascending bars — weekly volume */
export const IconBars = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 19.5v-4M12 19.5v-9M19 19.5V5.5" />
    <path d="M3 19.5h18" />
  </Base>
)

export const IconArrowUp = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 19V5.5M6.5 11 12 5.5 17.5 11" />
  </Base>
)

/** Exercise-icon lookup by key stored on the exercise row. */
export const EXERCISE_ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  barbell: IconBarbell,
  dumbbell: IconDumbbell,
  band: IconBand,
  bodyweight: IconBodyweight,
  abs: IconAbs,
}

export function ExerciseIcon({ icon, ...p }: IconProps & { icon: string }) {
  const C = EXERCISE_ICONS[icon] ?? IconDumbbell
  return <C {...p} />
}
