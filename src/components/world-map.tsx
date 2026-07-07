import { useMemo } from "react"
import { geoPath, geoTransform } from "d3-geo"
import { feature } from "topojson-client"
import worldData from "world-atlas/countries-110m.json"
import { project } from "@/lib/data"
import { cn } from "@/lib/utils"

// Real continent outlines, rendered offline as inline SVG (no map tiles / no
// network) so it works before the VPN connects and leaks nothing. Countries are
// projected with the SAME equirectangular framing as data.ts `project()`, so the
// land lines up exactly with the city markers plotted on top of it.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const topo = worldData as any
const land = feature(topo, topo.objects.countries) as unknown as {
  features: unknown[]
}

// A d3 projection that mirrors project(lat, lng) into a 0–100 × 0–100 box.
// geoTransform's point() receives coordinates as (longitude, latitude).
const transform = geoTransform({
  point(lng: number, lat: number) {
    const { x, y } = project(lat, lng)
    this.stream.point(x, y)
  },
})
const toPath = geoPath(transform)

// Path data is static, so build it once at module load.
const COUNTRY_PATHS: string[] = land.features
  .map((f) => toPath(f as Parameters<typeof toPath>[0]))
  .filter((d): d is string => !!d)

export function WorldMap({ className }: { className?: string }) {
  const paths = useMemo(() => COUNTRY_PATHS, [])
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn("h-full w-full", className)}
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          vectorEffect="non-scaling-stroke"
          fill="var(--color-card)"
          fillOpacity={0.55}
          stroke="var(--color-muted-foreground)"
          strokeOpacity={0.45}
          strokeWidth={0.6}
        />
      ))}
    </svg>
  )
}
