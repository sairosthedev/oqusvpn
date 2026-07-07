import type { ComponentType } from "react"
import CA from "country-flag-icons/react/3x2/CA"
import US from "country-flag-icons/react/3x2/US"
import DE from "country-flag-icons/react/3x2/DE"
import NG from "country-flag-icons/react/3x2/NG"
import ZA from "country-flag-icons/react/3x2/ZA"
import KE from "country-flag-icons/react/3x2/KE"
import ZW from "country-flag-icons/react/3x2/ZW"
import GB from "country-flag-icons/react/3x2/GB"
import NL from "country-flag-icons/react/3x2/NL"
import FR from "country-flag-icons/react/3x2/FR"
import BR from "country-flag-icons/react/3x2/BR"
import IN from "country-flag-icons/react/3x2/IN"
import PK from "country-flag-icons/react/3x2/PK"
import JP from "country-flag-icons/react/3x2/JP"
import SG from "country-flag-icons/react/3x2/SG"
import { cn } from "@/lib/utils"

type FlagIcon = ComponentType<{ className?: string; title?: string }>

const flags: Record<string, FlagIcon> = {
  CA, US, DE, NG, ZA, KE, ZW, GB, NL, FR, BR, IN, PK, JP, SG,
}

/**
 * Renders a real SVG flag by ISO 3166-1 alpha-2 code — works everywhere,
 * including Windows, which has no flag emoji glyphs.
 */
export function Flag({
  code,
  className,
  title,
}: {
  code: string
  className?: string
  title?: string
}) {
  const Icon = flags[code.toUpperCase()]
  if (!Icon) {
    // Fallback: a neutral disc with the country code, never a broken glyph.
    return (
      <span
        className={cn(
          "inline-grid place-items-center rounded-full bg-surface-2 text-[9px] font-bold text-muted",
          className,
        )}
        aria-hidden="true"
      >
        {code.toUpperCase().slice(0, 2)}
      </span>
    )
  }
  return (
    <span
      className={cn("inline-block shrink-0 overflow-hidden rounded-full ring-1 ring-border/60", className)}
    >
      <Icon title={title} className="h-full w-full scale-150 object-cover" />
    </span>
  )
}
