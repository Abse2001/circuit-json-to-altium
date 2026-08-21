import { asPoint, asString, isCircuitElement } from "../../lib/format"
import type { CircuitElement, Point } from "../../lib/types"
import {
  getSchematicConnectivitySignature,
  type SchematicConnectivitySignature,
} from "./get-schematic-connectivity-signature"

const preservedElementTypes = [
  "source_component",
  "source_port",
  "source_net",
  "schematic_component",
  "schematic_port",
  "schematic_net_label",
] as const

type PreservedElementType = (typeof preservedElementTypes)[number]

type CircuitSize = {
  height: number
  width: number
}

export type SchematicPrimitiveCounts = Record<PreservedElementType, number> & {
  junction: number
  wire_segment: number
}

export type SchematicRoundTripMetrics = {
  componentSizeMaxDeltaCircuitUnits: number
  geometryMaxDeltaCircuitUnits: number
  roundTripComponentNames: string[]
  roundTripConnectivity: SchematicConnectivitySignature
  roundTripCounts: SchematicPrimitiveCounts
  roundTripNetLabelTexts: string[]
  roundTripPortNames: string[]
  sourceComponentNames: string[]
  sourceConnectivity: SchematicConnectivitySignature
  sourceCounts: SchematicPrimitiveCounts
  sourceNetLabelTexts: string[]
  sourcePortNames: string[]
  sourceSupportedPrimitiveTotal: number
}

function countSchematicPrimitives(
  circuitJson: CircuitElement[],
): SchematicPrimitiveCounts {
  const getElementCount = (type: PreservedElementType): number =>
    circuitJson.filter((element) => element.type === type).length
  let junctionCount = 0
  let wireSegmentCount = 0
  for (const element of circuitJson) {
    if (element.type !== "schematic_trace") continue
    junctionCount += Array.isArray(element.junctions)
      ? element.junctions.length
      : 0
    wireSegmentCount += Array.isArray(element.edges) ? element.edges.length : 0
  }
  return {
    junction: junctionCount,
    schematic_component: getElementCount("schematic_component"),
    schematic_net_label: getElementCount("schematic_net_label"),
    schematic_port: getElementCount("schematic_port"),
    source_component: getElementCount("source_component"),
    source_net: getElementCount("source_net"),
    source_port: getElementCount("source_port"),
    wire_segment: wireSegmentCount,
  }
}

function getStringFields({
  circuitJson,
  elementType,
  fieldName,
}: {
  circuitJson: CircuitElement[]
  elementType: PreservedElementType
  fieldName: string
}): string[] {
  return circuitJson
    .filter((element) => element.type === elementType)
    .map((element) => asString(element[fieldName]))
}

function getSchematicGeometryPoints(circuitJson: CircuitElement[]): Point[] {
  const points: Point[] = []
  for (const element of circuitJson) {
    if (
      element.type === "schematic_component" ||
      element.type === "schematic_port"
    ) {
      const center = asPoint(element.center)
      if (center) points.push(center)
      continue
    }
    if (element.type === "schematic_net_label") {
      const anchor = asPoint(element.anchor_position) ?? asPoint(element.center)
      if (anchor) points.push(anchor)
      continue
    }
    if (element.type !== "schematic_trace") continue
    if (Array.isArray(element.edges)) {
      for (const edge of element.edges) {
        if (!isCircuitElement(edge)) continue
        const from = asPoint(edge.from)
        const to = asPoint(edge.to)
        if (from) points.push(from)
        if (to) points.push(to)
      }
    }
    if (Array.isArray(element.junctions)) {
      for (const junction of element.junctions) {
        const point = asPoint(junction)
        if (point) points.push(point)
      }
    }
  }
  return points
}

function getGeometryMaxDelta(
  sourceCircuitJson: CircuitElement[],
  roundTripCircuitJson: CircuitElement[],
): number {
  const sourcePoints = getSchematicGeometryPoints(sourceCircuitJson)
  const roundTripPoints = getSchematicGeometryPoints(roundTripCircuitJson)
  if (sourcePoints.length !== roundTripPoints.length) {
    return Number.POSITIVE_INFINITY
  }
  const sourceAnchor = sourcePoints[0]
  const roundTripAnchor = roundTripPoints[0]
  if (!sourceAnchor || !roundTripAnchor) return 0

  let maximumDelta = 0
  for (const [pointIndex, sourcePoint] of sourcePoints.entries()) {
    const roundTripPoint = roundTripPoints[pointIndex]
    if (!roundTripPoint) return Number.POSITIVE_INFINITY
    maximumDelta = Math.max(
      maximumDelta,
      Math.abs(
        sourcePoint.x - sourceAnchor.x - (roundTripPoint.x - roundTripAnchor.x),
      ),
      Math.abs(
        sourcePoint.y - sourceAnchor.y - (roundTripPoint.y - roundTripAnchor.y),
      ),
    )
  }
  return maximumDelta
}

function getComponentSizes(circuitJson: CircuitElement[]): CircuitSize[] {
  return circuitJson.flatMap((element) => {
    if (element.type !== "schematic_component") return []
    if (!isCircuitElement(element.size)) return []
    const { height, width } = element.size
    return typeof height === "number" && typeof width === "number"
      ? [{ height, width }]
      : []
  })
}

function getComponentSizeMaxDelta(
  sourceCircuitJson: CircuitElement[],
  roundTripCircuitJson: CircuitElement[],
): number {
  const sourceSizes = getComponentSizes(sourceCircuitJson)
  const roundTripSizes = getComponentSizes(roundTripCircuitJson)
  if (sourceSizes.length !== roundTripSizes.length) {
    return Number.POSITIVE_INFINITY
  }
  return sourceSizes.reduce((maximumDelta, sourceSize, sizeIndex) => {
    const roundTripSize = roundTripSizes[sizeIndex]
    if (!roundTripSize) return Number.POSITIVE_INFINITY
    return Math.max(
      maximumDelta,
      Math.abs(sourceSize.width - roundTripSize.width),
      Math.abs(sourceSize.height - roundTripSize.height),
    )
  }, 0)
}

export function getSchematicRoundTripMetrics({
  roundTripCircuitJson,
  sourceCircuitJson,
}: {
  roundTripCircuitJson: CircuitElement[]
  sourceCircuitJson: CircuitElement[]
}): SchematicRoundTripMetrics {
  const sourceCounts = countSchematicPrimitives(sourceCircuitJson)
  const roundTripCounts = countSchematicPrimitives(roundTripCircuitJson)
  return {
    componentSizeMaxDeltaCircuitUnits: getComponentSizeMaxDelta(
      sourceCircuitJson,
      roundTripCircuitJson,
    ),
    geometryMaxDeltaCircuitUnits: getGeometryMaxDelta(
      sourceCircuitJson,
      roundTripCircuitJson,
    ),
    roundTripComponentNames: getStringFields({
      circuitJson: roundTripCircuitJson,
      elementType: "source_component",
      fieldName: "name",
    }),
    roundTripConnectivity:
      getSchematicConnectivitySignature(roundTripCircuitJson),
    roundTripCounts,
    roundTripNetLabelTexts: getStringFields({
      circuitJson: roundTripCircuitJson,
      elementType: "schematic_net_label",
      fieldName: "text",
    }),
    roundTripPortNames: getStringFields({
      circuitJson: roundTripCircuitJson,
      elementType: "source_port",
      fieldName: "name",
    }),
    sourceComponentNames: getStringFields({
      circuitJson: sourceCircuitJson,
      elementType: "source_component",
      fieldName: "name",
    }),
    sourceConnectivity: getSchematicConnectivitySignature(sourceCircuitJson),
    sourceCounts,
    sourceNetLabelTexts: getStringFields({
      circuitJson: sourceCircuitJson,
      elementType: "schematic_net_label",
      fieldName: "text",
    }),
    sourcePortNames: getStringFields({
      circuitJson: sourceCircuitJson,
      elementType: "source_port",
      fieldName: "name",
    }),
    sourceSupportedPrimitiveTotal:
      sourceCounts.schematic_component +
      sourceCounts.schematic_port +
      sourceCounts.schematic_net_label +
      sourceCounts.wire_segment +
      sourceCounts.junction,
  }
}
