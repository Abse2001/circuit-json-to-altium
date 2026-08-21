import type { Matrix } from "transformation-matrix"
import { applyToPoint, compose, scale, translate } from "transformation-matrix"
import { asNumber, asPoint, isCircuitElement } from "./format"
import { isSchematicSheetAnnotation } from "./is-schematic-sheet-annotation"
import type { CircuitElement, Point, PointTransform } from "./types"

type SchematicTransform = {
  circuitToAltiumSchematicPoint: PointTransform
  height: number
  width: number
}

function getAltiumSchematicPoint(
  circuitPoint: Point,
  circuitToAltiumSchematicMatrix: Matrix,
): Point {
  const altiumPoint = applyToPoint(circuitToAltiumSchematicMatrix, circuitPoint)
  return { x: Math.round(altiumPoint.x), y: Math.round(altiumPoint.y) }
}

export function getSchematicTransform(
  schematicElements: CircuitElement[],
): SchematicTransform {
  const circuitPoints: Point[] = []
  for (const element of schematicElements) {
    const center = asPoint(element.center)
    if (center) circuitPoints.push(center)
    const anchor = asPoint(element.anchor_position)
    if (anchor) circuitPoints.push(anchor)
    const isSheetAnnotation = isSchematicSheetAnnotation(element)
    const position = isSheetAnnotation ? asPoint(element.position) : undefined
    if (position) circuitPoints.push(position)
    if (isSheetAnnotation && element.type === "schematic_rect") {
      const width = asNumber(element.width)
      const height = asNumber(element.height)
      if (center && width > 0 && height > 0) {
        circuitPoints.push(
          { x: center.x - width / 2, y: center.y - height / 2 },
          { x: center.x + width / 2, y: center.y + height / 2 },
        )
      }
    }
    if (
      isSheetAnnotation &&
      element.type === "schematic_path" &&
      Array.isArray(element.points)
    ) {
      for (const point of element.points) {
        const circuitPoint = asPoint(point)
        if (circuitPoint) circuitPoints.push(circuitPoint)
      }
    }
    if (element.type === "schematic_trace" && Array.isArray(element.edges)) {
      for (const edge of element.edges) {
        if (!isCircuitElement(edge)) continue
        const from = asPoint(edge.from)
        const to = asPoint(edge.to)
        if (from) circuitPoints.push(from)
        if (to) circuitPoints.push(to)
      }
    }
    if (
      element.type === "schematic_trace" &&
      Array.isArray(element.junctions)
    ) {
      for (const junction of element.junctions) {
        const circuitPoint = asPoint(junction)
        if (circuitPoint) circuitPoints.push(circuitPoint)
      }
    }
  }
  const minX =
    circuitPoints.length > 0
      ? Math.min(...circuitPoints.map((point) => point.x))
      : 0
  const minY =
    circuitPoints.length > 0
      ? Math.min(...circuitPoints.map((point) => point.y))
      : 0
  const circuitToAltiumSchematicMatrix = compose(
    translate(100, 100),
    scale(20, 20),
    translate(-minX, -minY),
  )
  const altiumPoints = circuitPoints.map((circuitPoint) =>
    getAltiumSchematicPoint(circuitPoint, circuitToAltiumSchematicMatrix),
  )

  return {
    circuitToAltiumSchematicPoint: (circuitPoint) =>
      getAltiumSchematicPoint(circuitPoint, circuitToAltiumSchematicMatrix),
    width: Math.max(400, ...altiumPoints.map((point) => point.x + 100)),
    height: Math.max(300, ...altiumPoints.map((point) => point.y + 100)),
  }
}
