import type { ComponentType } from "react"
// Every ISO 3166-1 flag, keyed by alpha-2 code — so an admin can add a server
// in any country and its flag renders with no code change here.
import * as AllFlags from "country-flag-icons/react/3x2"
import { cn } from "@/lib/utils"

type FlagIcon = ComponentType<{ className?: string; title?: string }>

const flags = AllFlags as unknown as Record<string, FlagIcon>

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
