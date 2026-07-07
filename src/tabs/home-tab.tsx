import { MapStage } from "@/components/map-stage"
import { ActionRail } from "@/components/action-rail"
import { useUi } from "@/lib/ui-context"

export function HomeTab() {
  const { focusMode } = useUi()
  return (
    <div className="flex flex-1 overflow-hidden">
      <MapStage />
      {!focusMode && <ActionRail />}
    </div>
  )
}
