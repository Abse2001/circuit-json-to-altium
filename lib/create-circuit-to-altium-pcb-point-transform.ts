import { applyToPoint, compose, scale, translate } from "transformation-matrix"
import { MILLIMETERS_TO_MILS } from "./format"
import type { Point, PointTransform } from "./types"

export function createCircuitToAltiumPcbPointTransform(
  outline: Point[],
): PointTransform {
  const minX = Math.min(...outline.map((point) => point.x))
  const maxY = Math.max(...outline.map((point) => point.y))
  // Circuit JSON uses positive Y upward; Altium PCB coordinates use it downward.
  const circuitToAltiumPcbMatrix = compose(
    translate(1_000, 1_000),
    scale(MILLIMETERS_TO_MILS, -MILLIMETERS_TO_MILS),
    translate(-minX, -maxY),
  )

  return (circuitPoint) => applyToPoint(circuitToAltiumPcbMatrix, circuitPoint)
}
