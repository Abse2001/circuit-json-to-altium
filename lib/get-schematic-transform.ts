import type { Matrix } from "transformation-matrix"
import { applyToPoint, compose, scale, translate } from "transformation-matrix"
import { ALTIUM_UNITS_PER_CIRCUIT_UNIT } from "./altium-schematic-dimensions"
import { asNumber, asPoint, asString, isCircuitElement } from "./format"
import { isSchematicSheetAnnotation } from "./is-schematic-sheet-annotation"
import { isSchematicSymbolPrimitive } from "./is-schematic-symbol-primitive"
import type {
  CircuitElement,
  LengthTransform,
  Point,
  PointTransform,
} from "./types"

type SchematicTransform = {
  circuitToAltiumSchematicLength: LengthTransform
  circuitToAltiumSchematicPoint: PointTransform
  height: number
  width: number
}

const ALTIUM_SCHEMATIC_CONTENT_PADDING = 40
const ALTIUM_SCHEMATIC_EMPTY_SHEET_HEIGHT = 300
const ALTIUM_SCHEMATIC_EMPTY_SHEET_WIDTH = 400
const ALTIUM_SCHEMATIC_SHEET_ASPECT_RATIO = 2

function getAltiumSchematicPoint(
  circuitPoint: Point,
  circuitToAltiumSchematicMatrix: Matrix,
): Point {
  const altiumPoint = applyToPoint(circuitToAltiumSchematicMatrix, circuitPoint)
  return { x: Math.round(altiumPoint.x), y: Math.round(altiumPoint.y) }
}

function appendSchematicSymbolPrimitivePoints({
  element,
  points,
}: {
  element: CircuitElement
  points: Point[]
}): void {
  if (element.type === "schematic_line") {
    points.push(
      { x: asNumber(element.x1), y: asNumber(element.y1) },
      { x: asNumber(element.x2), y: asNumber(element.y2) },
    )
    return
  }
  if (element.type === "schematic_path" && Array.isArray(element.points)) {
    for (const point of element.points) {
      const circuitPoint = asPoint(point)
      if (circuitPoint) points.push(circuitPoint)
    }
    return
  }
  const center = asPoint(element.center)
  if (!center) return
  if (element.type === "schematic_rect") {
    const width = asNumber(element.width)
    const height = asNumber(element.height)
    points.push(
      { x: center.x - width / 2, y: center.y - height / 2 },
      { x: center.x + width / 2, y: center.y + height / 2 },
    )
    return
  }
  if (element.type === "schematic_circle" || element.type === "schematic_arc") {
    const radius = asNumber(element.radius)
    points.push(
      { x: center.x - radius, y: center.y - radius },
      { x: center.x + radius, y: center.y + radius },
    )
    return
  }
}

export function getSchematicTransform(
  schematicElements: CircuitElement[],
): SchematicTransform {
  const circuitPoints: Point[] = []
  for (const element of schematicElements) {
    const center = asPoint(element.center)
    if (center) circuitPoints.push(center)
    if (element.type === "schematic_component" && center) {
      const size = isCircuitElement(element.size) ? element.size : undefined
      const width = asNumber(size?.width)
      const height = asNumber(size?.height)
      if (width > 0 && height > 0) {
        circuitPoints.push(
          { x: center.x - width / 2, y: center.y - height / 2 },
          { x: center.x + width / 2, y: center.y + height / 2 },
        )
      }
    }
    if (
      isSchematicSymbolPrimitive(element) &&
      (asString(element.schematic_symbol_id) ||
        asString(element.schematic_component_id))
    ) {
      appendSchematicSymbolPrimitivePoints({
        element,
        points: circuitPoints,
      })
    }
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
  const maxX =
    circuitPoints.length > 0
      ? Math.max(...circuitPoints.map((point) => point.x))
      : 0
  const maxY =
    circuitPoints.length > 0
      ? Math.max(...circuitPoints.map((point) => point.y))
      : 0
  const altiumGridMinX =
    Math.round(minX * ALTIUM_UNITS_PER_CIRCUIT_UNIT) /
    ALTIUM_UNITS_PER_CIRCUIT_UNIT
  const altiumGridMinY =
    Math.round(minY * ALTIUM_UNITS_PER_CIRCUIT_UNIT) /
    ALTIUM_UNITS_PER_CIRCUIT_UNIT
  const altiumGridMaxX =
    Math.round(maxX * ALTIUM_UNITS_PER_CIRCUIT_UNIT) /
    ALTIUM_UNITS_PER_CIRCUIT_UNIT
  const altiumGridMaxY =
    Math.round(maxY * ALTIUM_UNITS_PER_CIRCUIT_UNIT) /
    ALTIUM_UNITS_PER_CIRCUIT_UNIT
  const altiumContentWidth = Math.max(
    Math.round(
      (altiumGridMaxX - altiumGridMinX) * ALTIUM_UNITS_PER_CIRCUIT_UNIT,
    ),
    0,
  )
  const altiumContentHeight = Math.max(
    Math.round(
      (altiumGridMaxY - altiumGridMinY) * ALTIUM_UNITS_PER_CIRCUIT_UNIT,
    ),
    0,
  )
  const paddedContentWidth =
    altiumContentWidth + ALTIUM_SCHEMATIC_CONTENT_PADDING * 2
  const paddedContentHeight =
    altiumContentHeight + ALTIUM_SCHEMATIC_CONTENT_PADDING * 2
  const altiumSheetWidth =
    circuitPoints.length === 0
      ? ALTIUM_SCHEMATIC_EMPTY_SHEET_WIDTH
      : Math.max(
          paddedContentWidth,
          paddedContentHeight * ALTIUM_SCHEMATIC_SHEET_ASPECT_RATIO,
        )
  const altiumSheetHeight =
    circuitPoints.length === 0
      ? ALTIUM_SCHEMATIC_EMPTY_SHEET_HEIGHT
      : altiumSheetWidth / ALTIUM_SCHEMATIC_SHEET_ASPECT_RATIO
  const altiumContentOffsetX =
    circuitPoints.length === 0
      ? 100
      : (altiumSheetWidth - altiumContentWidth) / 2
  const altiumContentOffsetY =
    circuitPoints.length === 0
      ? 100
      : (altiumSheetHeight - altiumContentHeight) / 2
  const circuitToAltiumSchematicMatrix = compose(
    translate(altiumContentOffsetX, altiumContentOffsetY),
    scale(ALTIUM_UNITS_PER_CIRCUIT_UNIT, ALTIUM_UNITS_PER_CIRCUIT_UNIT),
    translate(-altiumGridMinX, -altiumGridMinY),
  )
  const altiumOrigin = applyToPoint(circuitToAltiumSchematicMatrix, {
    x: 0,
    y: 0,
  })

  return {
    circuitToAltiumSchematicLength: (circuitLength) => {
      const altiumLengthPoint = applyToPoint(circuitToAltiumSchematicMatrix, {
        x: circuitLength,
        y: 0,
      })
      return Math.abs(altiumLengthPoint.x - altiumOrigin.x)
    },
    circuitToAltiumSchematicPoint: (circuitPoint) =>
      getAltiumSchematicPoint(circuitPoint, circuitToAltiumSchematicMatrix),
    width: altiumSheetWidth,
    height: altiumSheetHeight,
  }
}
