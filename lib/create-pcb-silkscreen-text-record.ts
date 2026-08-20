import { createPcbTextRecord } from "./create-pcb-text-record"
import { asString } from "./format"
import type { CircuitElement, PointTransform } from "./types"

type CreatePcbSilkscreenTextRecordOptions = {
  altiumComponentIndex?: number
  circuitToAltiumPcbPoint: PointTransform
  silkscreenText: CircuitElement
}

export function createPcbSilkscreenTextRecord({
  altiumComponentIndex,
  circuitToAltiumPcbPoint,
  silkscreenText,
}: CreatePcbSilkscreenTextRecordOptions): string {
  const isBottomLayer =
    asString(silkscreenText.layer).toLowerCase() === "bottom"
  return createPcbTextRecord({
    altiumComponentIndex,
    circuitText: silkscreenText,
    circuitToAltiumPcbPoint,
    layer: isBottomLayer ? "BOTTOMOVERLAY" : "TOPOVERLAY",
  })
}
