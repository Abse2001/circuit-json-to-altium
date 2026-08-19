import { convertCircuitPcbCcwRotationDegreesToAltium } from "./convert-circuit-pcb-ccw-rotation-degrees-to-altium"
import {
  asNumber,
  asPoint,
  asPositiveNumber,
  asString,
  formatMil,
  formatNumber,
  MILLIMETERS_TO_MILS,
} from "./format"
import type { CircuitElement, Point, PointTransform } from "./types"

type CreatePcbSilkscreenTextRecordParams = {
  altiumComponentIndex?: number
  circuitToAltiumPcbPoint: PointTransform
  silkscreenText: CircuitElement
}

export function createPcbSilkscreenTextRecord({
  altiumComponentIndex,
  circuitToAltiumPcbPoint,
  silkscreenText,
}: CreatePcbSilkscreenTextRecordParams): string {
  const circuitAnchor =
    asPoint(silkscreenText.anchor_position) ??
    asPoint(silkscreenText.center) ??
    ({ x: 0, y: 0 } satisfies Point)
  const altiumPosition = circuitToAltiumPcbPoint(circuitAnchor)
  const isBottomLayer =
    asString(silkscreenText.layer).toLowerCase() === "bottom"
  const isMirrored =
    typeof silkscreenText.is_mirrored === "boolean"
      ? silkscreenText.is_mirrored
      : isBottomLayer
  const fontSizeMm = asPositiveNumber(silkscreenText.font_size, 1)

  return [
    "|RECORD=Text",
    ...(altiumComponentIndex === undefined
      ? []
      : [`COMPONENT=${altiumComponentIndex}`]),
    `LAYER=${isBottomLayer ? "BOTTOMOVERLAY" : "TOPOVERLAY"}`,
    `X=${formatMil(altiumPosition.x)}`,
    `Y=${formatMil(altiumPosition.y)}`,
    `ROTATION=${formatNumber(convertCircuitPcbCcwRotationDegreesToAltium(asNumber(silkscreenText.ccw_rotation)))}`,
    `MIRROR=${isMirrored ? "TRUE" : "FALSE"}`,
    `HEIGHT=${formatMil(fontSizeMm * MILLIMETERS_TO_MILS)}`,
    `WIDTH=${formatMil(Math.max(0.05, fontSizeMm * 0.1) * MILLIMETERS_TO_MILS)}`,
    "USETTFONTS=TRUE",
    "FONTNAME=Arial",
    `JUSTIFICATION=${getAltiumTextJustification(silkscreenText.anchor_alignment)}`,
    `WIDESTRING=${encodeAltiumWideString(asString(silkscreenText.text))}`,
  ].join("|")
}

function getAltiumTextJustification(anchorAlignment: unknown): number {
  switch (anchorAlignment) {
    case "top_left":
      return 1
    case "center_left":
      return 2
    case "bottom_left":
      return 3
    case "top_center":
      return 4
    case "center":
      return 5
    case "bottom_center":
      return 6
    case "top_right":
      return 7
    case "center_right":
      return 8
    case "bottom_right":
      return 9
    default:
      return 5
  }
}

function encodeAltiumWideString(text: string): string {
  const codePoints: number[] = []
  for (const character of text) {
    const codePoint = character.codePointAt(0)
    if (codePoint !== undefined) codePoints.push(codePoint)
  }
  return codePoints.join(",")
}
