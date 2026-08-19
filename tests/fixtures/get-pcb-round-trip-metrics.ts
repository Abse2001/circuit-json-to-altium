import type { CircuitElement } from "../../lib/types"

const preservedPrimitiveTypes = [
  "source_component",
  "pcb_component",
  "source_port",
  "pcb_port",
  "pcb_smtpad",
  "pcb_plated_hole",
  "pcb_hole",
  "source_trace",
  "pcb_trace",
  "pcb_via",
  "pcb_copper_pour",
] as const

const geometryElementTypes = [
  "pcb_component",
  "pcb_smtpad",
  "pcb_plated_hole",
  "pcb_hole",
  "pcb_trace",
  "pcb_via",
] as const

const rotationElementTypes = [
  "pcb_component",
  "pcb_smtpad",
  "pcb_plated_hole",
  "pcb_hole",
] as const

type PreservedPrimitiveType = (typeof preservedPrimitiveTypes)[number]
type GeometryElementType = (typeof geometryElementTypes)[number]
type RotationElementType = (typeof rotationElementTypes)[number]

export type PreservedPrimitiveCounts = Record<PreservedPrimitiveType, number>

export type PcbRoundTripMetrics = {
  geometryMaxDeltaMm: number
  rotationMismatchCount: number
  roundTripCounts: PreservedPrimitiveCounts
  sourceCounts: PreservedPrimitiveCounts
  sourcePrimitiveTotal: number
}

function countPreservedPrimitives(
  circuitJson: CircuitElement[],
): PreservedPrimitiveCounts {
  const counts = Object.fromEntries(
    preservedPrimitiveTypes.map((type) => [
      type,
      circuitJson.filter((element) => element.type === type).length,
    ]),
  )
  return counts as PreservedPrimitiveCounts
}

function getGeometryPoints(
  circuitJson: CircuitElement[],
  elementType: GeometryElementType,
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = []
  for (const element of circuitJson) {
    if (element.type !== elementType) continue
    if (elementType === "pcb_trace" && Array.isArray(element.route)) {
      for (const routePoint of element.route) {
        if (
          typeof routePoint === "object" &&
          routePoint !== null &&
          "x" in routePoint &&
          "y" in routePoint &&
          typeof routePoint.x === "number" &&
          typeof routePoint.y === "number"
        ) {
          points.push({ x: routePoint.x, y: routePoint.y })
        }
      }
      continue
    }
    if (
      elementType === "pcb_component" &&
      typeof element.center === "object" &&
      element.center !== null &&
      "x" in element.center &&
      "y" in element.center &&
      typeof element.center.x === "number" &&
      typeof element.center.y === "number"
    ) {
      points.push({ x: element.center.x, y: element.center.y })
      continue
    }
    if (
      elementType !== "pcb_component" &&
      elementType !== "pcb_trace" &&
      typeof element.x === "number" &&
      typeof element.y === "number"
    ) {
      points.push({ x: element.x, y: element.y })
    }
  }
  return points
}

function getGeometryMaxDeltaMm(
  sourceCircuitJson: CircuitElement[],
  roundTripCircuitJson: CircuitElement[],
): number {
  let maxDeltaMm = 0
  for (const elementType of geometryElementTypes) {
    const sourcePoints = getGeometryPoints(sourceCircuitJson, elementType)
    const roundTripPoints = getGeometryPoints(roundTripCircuitJson, elementType)
    const sourceAnchor = sourcePoints[0]
    const roundTripAnchor = roundTripPoints[0]
    if (sourcePoints.length !== roundTripPoints.length) {
      return Number.POSITIVE_INFINITY
    }
    if (!sourceAnchor || !roundTripAnchor) continue

    for (const [index, sourcePoint] of sourcePoints.entries()) {
      const roundTripPoint = roundTripPoints[index]
      if (!roundTripPoint) return Number.POSITIVE_INFINITY
      maxDeltaMm = Math.max(
        maxDeltaMm,
        Math.abs(
          sourcePoint.x -
            sourceAnchor.x -
            (roundTripPoint.x - roundTripAnchor.x),
        ),
        Math.abs(
          sourcePoint.y -
            sourceAnchor.y -
            (roundTripPoint.y - roundTripAnchor.y),
        ),
      )
    }
  }
  return maxDeltaMm
}

function getCcwRotationsDegrees(
  circuitJson: CircuitElement[],
  elementType: RotationElementType,
): number[] {
  return circuitJson
    .filter((element) => element.type === elementType)
    .flatMap((element) => {
      const ccwRotationDegrees = element.rotation ?? element.ccw_rotation ?? 0
      return typeof ccwRotationDegrees === "number" ? [ccwRotationDegrees] : []
    })
}

function getRotationMismatchCount(
  sourceCircuitJson: CircuitElement[],
  roundTripCircuitJson: CircuitElement[],
): number {
  let mismatchCount = 0
  for (const elementType of rotationElementTypes) {
    const sourceCcwRotationsDegrees = getCcwRotationsDegrees(
      sourceCircuitJson,
      elementType,
    )
    const roundTripCcwRotationsDegrees = getCcwRotationsDegrees(
      roundTripCircuitJson,
      elementType,
    )
    if (
      sourceCcwRotationsDegrees.length !== roundTripCcwRotationsDegrees.length
    ) {
      return Number.POSITIVE_INFINITY
    }
    mismatchCount += sourceCcwRotationsDegrees.reduce(
      (typeMismatchCount, ccwRotationDegrees, index) => {
        return (
          typeMismatchCount +
          (ccwRotationDegrees === roundTripCcwRotationsDegrees[index] ? 0 : 1)
        )
      },
      0,
    )
  }
  return mismatchCount
}

export function getPcbRoundTripMetrics({
  roundTripCircuitJson,
  sourceCircuitJson,
}: {
  roundTripCircuitJson: CircuitElement[]
  sourceCircuitJson: CircuitElement[]
}): PcbRoundTripMetrics {
  const sourceCounts = countPreservedPrimitives(sourceCircuitJson)
  const roundTripCounts = countPreservedPrimitives(roundTripCircuitJson)

  return {
    geometryMaxDeltaMm: getGeometryMaxDeltaMm(
      sourceCircuitJson,
      roundTripCircuitJson,
    ),
    rotationMismatchCount: getRotationMismatchCount(
      sourceCircuitJson,
      roundTripCircuitJson,
    ),
    roundTripCounts,
    sourceCounts,
    sourcePrimitiveTotal: Object.values(sourceCounts).reduce(
      (sum, count) => sum + count,
      0,
    ),
  }
}
