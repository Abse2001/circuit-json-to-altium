import type {
  PcbFabricationNoteDimension,
  PcbNoteDimension,
} from "circuit-json"
import {
  formatMil,
  formatNumber,
  MILLIMETERS_TO_MILS,
  sanitizeField,
} from "./format"
import type { Point, PointTransform } from "./types"

type PcbDocumentationDimension = PcbFabricationNoteDimension | PcbNoteDimension

export function createPcbDimensionRecord({
  altiumComponentIndex,
  circuitToAltiumPcbPoint,
  dimension,
  layer,
}: {
  altiumComponentIndex?: number
  circuitToAltiumPcbPoint: PointTransform
  dimension: PcbDocumentationDimension
  layer: string
}): string {
  const deltaX = dimension.to.x - dimension.from.x
  const deltaY = dimension.to.y - dimension.from.y
  const measuredDistanceMm = Math.hypot(deltaX, deltaY)
  if (measuredDistanceMm === 0) {
    throw new Error("A PCB dimension requires distinct from and to points")
  }
  const offsetDirection = getNormalizedOffsetDirection({
    deltaX,
    deltaY,
    offsetDirection: dimension.offset_direction,
  })
  const legacyOffsetMm = "offset" in dimension ? dimension.offset : undefined
  const offsetDistanceMm = dimension.offset_distance ?? legacyOffsetMm ?? 0
  const circuitLineStart = {
    x: dimension.from.x + offsetDirection.x * offsetDistanceMm,
    y: dimension.from.y + offsetDirection.y * offsetDistanceMm,
  }
  const circuitLineEnd = {
    x: dimension.to.x + offsetDirection.x * offsetDistanceMm,
    y: dimension.to.y + offsetDirection.y * offsetDistanceMm,
  }
  const altiumReferenceStart = circuitToAltiumPcbPoint(dimension.from)
  const altiumReferenceEnd = circuitToAltiumPcbPoint(dimension.to)
  const altiumLineStart = circuitToAltiumPcbPoint(circuitLineStart)
  const altiumLineEnd = circuitToAltiumPcbPoint(circuitLineEnd)
  const altiumTextPosition = {
    x: (altiumLineStart.x + altiumLineEnd.x) / 2,
    y: (altiumLineStart.y + altiumLineEnd.y) / 2,
  }
  const fontSizeMm = dimension.font_size
  const arrowSizeMm = dimension.arrow_size

  return [
    "|RECORD=Dimension",
    ...(altiumComponentIndex === undefined
      ? []
      : [`COMPONENT=${altiumComponentIndex}`]),
    `LAYER=${layer}`,
    "DIMENSIONKIND=0",
    `TEXTFORMAT=${dimension.text ? sanitizeField(dimension.text) : "<>"}`,
    `HEIGHT=${formatMil(Math.abs(offsetDistanceMm) * MILLIMETERS_TO_MILS)}`,
    `LINEWIDTH=${formatMil(Math.max(0.05, fontSizeMm * 0.1) * MILLIMETERS_TO_MILS)}`,
    `TEXTHEIGHT=${formatMil(fontSizeMm * MILLIMETERS_TO_MILS)}`,
    `TEXTLINEWIDTH=${formatMil(Math.max(0.05, fontSizeMm * 0.1) * MILLIMETERS_TO_MILS)}`,
    "TEXTPRECISION=3",
    "TEXTBOLD=FALSE",
    "ITALIC=FALSE",
    `TEXTGAP=${formatMil(fontSizeMm * 0.2 * MILLIMETERS_TO_MILS)}`,
    `ARROWSIZE=${formatMil(arrowSizeMm * MILLIMETERS_TO_MILS)}`,
    "TEXTPOSITION=Manual",
    `X1=${formatMil(altiumLineStart.x)}`,
    `Y1=${formatMil(altiumLineStart.y)}`,
    "REFERENCES_COUNT=2",
    `REFERENCE0POINTX=${formatMil(altiumReferenceStart.x)}`,
    `REFERENCE0POINTY=${formatMil(altiumReferenceStart.y)}`,
    `REFERENCE1POINTX=${formatMil(altiumReferenceEnd.x)}`,
    `REFERENCE1POINTY=${formatMil(altiumReferenceEnd.y)}`,
    `TEXT1X=${formatMil(altiumTextPosition.x)}`,
    `TEXT1Y=${formatMil(altiumTextPosition.y)}`,
    "TEXTDIMENSIONUNIT=Millimeters",
    "TEXTSUFFIX=mm",
    `ANGLE=${formatNumber(
      getAltiumLineAngleDegrees({
        end: altiumLineEnd,
        start: altiumLineStart,
      }),
    )}`,
  ].join("|")
}

function getNormalizedOffsetDirection({
  deltaX,
  deltaY,
  offsetDirection,
}: {
  deltaX: number
  deltaY: number
  offsetDirection?: Point
}): Point {
  const direction = offsetDirection ?? { x: -deltaY, y: deltaX }
  const directionLength = Math.hypot(direction.x, direction.y)
  if (directionLength === 0) {
    throw new Error("A PCB dimension offset direction cannot be zero")
  }
  return {
    x: direction.x / directionLength,
    y: direction.y / directionLength,
  }
}

function getAltiumLineAngleDegrees({
  end,
  start,
}: {
  end: Point
  start: Point
}): number {
  const angleDegrees =
    (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI
  return ((angleDegrees % 360) + 360) % 360
}
