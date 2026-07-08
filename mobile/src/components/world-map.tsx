import Svg, { Path } from "react-native-svg"
import { useTheme } from "../context/theme-context"
import { MAP_H, MAP_W } from "../lib/geo"
import paths from "../lib/world-paths.json"

// Real continent outlines, pre-projected offline (no map tiles) onto the same
// aspect-correct canvas as lib/geo.ts `project()`, so land lines up with the
// city pins. `meet` preserves the true 2.8:1 proportions (no squashing).
const COUNTRY_PATHS = paths as string[]

export function WorldMap({ width, height, top = 0 }: { width: number; height: number; top?: number }) {
  const t = useTheme()
  if (!width || !height) return null
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="none" style={{ position: "absolute", top }}>
      {COUNTRY_PATHS.map((d, i) => (
        <Path
          key={i}
          d={d}
          fill={t.card}
          fillOpacity={0.55}
          stroke={t.mutedForeground}
          strokeOpacity={0.45}
          strokeWidth={0.5}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </Svg>
  )
}
