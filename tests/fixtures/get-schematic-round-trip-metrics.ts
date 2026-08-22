import { asNumber, asPoint, asString, isCircuitElement } from "../../lib/format"
import type { CircuitElement, Point, SourcePortId } from "../../lib/types"

const preservedElementTypes = [
  "source_component",
  "source_port",
  "source_net",
  "schematic_component",
  "schematic_port",
  "schematic_net_label",
  "schematic_no_erc",
  "schematic_path",
  "schematic_rect",
  "schematic_text",
] as const

type PreservedElementType = (typeof preservedElementTypes)[number]

type CircuitSize = {
  height: number
  width: number
}

export type SchematicPrimitiveCounts = Record<PreservedElementType, number> & {
  junction: number
  off_sheet_port: number
  power_port: number
  wire_segment: number
}

export type SchematicOffSheetPortSignature = {
  facingDirection: string
  hasInputArrow: boolean
  hasOutputArrow: boolean
  name: string
}

export type SchematicAnnotationSignature =
  | {
      anchor: string
      color: string
      fontSizeCircuitUnits: number
      rotationDegrees: number
      text: string
      type: "schematic_text"
    }
  | {
      color: string
      fillColor: string
      isFilled: boolean
      strokeWidthCircuitUnits: number
      type: "schematic_rect"
    }
  | {
      fillColor: string
      isFilled: boolean
      pointCount: number
      strokeColor: string
      strokeWidthCircuitUnits: number
      type: "schematic_path"
    }

export type SchematicRoundTripMetrics = {
  componentSizeMaxDeltaCircuitUnits: number
  geometryMaxDeltaCircuitUnits: number
  roundTripAnnotationSignatures: SchematicAnnotationSignature[]
  roundTripComponentNames: string[]
  roundTripCounts: SchematicPrimitiveCounts
  roundTripNetLabelTexts: string[]
  roundTripOffSheetPortSignatures: SchematicOffSheetPortSignature[]
  roundTripPowerPortSymbolNames: string[]
  roundTripPortNames: string[]
  sourceComponentNames: string[]
  sourceAnnotationSignatures: SchematicAnnotationSignature[]
  sourceCounts: SchematicPrimitiveCounts
  sourceNetLabelTexts: string[]
  sourceOffSheetPortSignatures: SchematicOffSheetPortSignature[]
  sourcePowerPortSymbolNames: string[]
  sourcePortNames: string[]
  sourceSupportedPrimitiveTotal: number
}

function getOffSheetPortSignatures(
  circuitJson: CircuitElement[],
): SchematicOffSheetPortSignature[] {
  const sourcePortNames = new Map<SourcePortId, string>(
    circuitJson
      .filter((element) => element.type === "source_port")
      .map((sourcePort) => [
        asString(sourcePort.source_port_id),
        asString(sourcePort.name),
      ]),
  )
  return circuitJson.flatMap((schematicPort) => {
    if (
      schematicPort.type !== "schematic_port" ||
      asString(schematicPort.schematic_component_id)
    ) {
      return []
    }
    return [
      {
        facingDirection: asString(schematicPort.facing_direction),
        hasInputArrow: schematicPort.has_input_arrow === true,
        hasOutputArrow: schematicPort.has_output_arrow === true,
        name:
          asString(schematicPort.display_pin_label) ||
          sourcePortNames.get(asString(schematicPort.source_port_id)) ||
          "",
      },
    ]
  })
}

function getPowerPortSymbolNames(circuitJson: CircuitElement[]): string[] {
  return circuitJson.flatMap((element) => {
    if (element.type !== "schematic_net_label") return []
    const symbolName = asString(element.symbol_name)
    return symbolName.startsWith("rail_") || symbolName.startsWith("ground_")
      ? [symbolName]
      : []
  })
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
    off_sheet_port: getOffSheetPortSignatures(circuitJson).length,
    power_port: getPowerPortSymbolNames(circuitJson).length,
    schematic_component: getElementCount("schematic_component"),
    schematic_net_label: getElementCount("schematic_net_label"),
    schematic_no_erc: getElementCount("schematic_no_erc"),
    schematic_path: getElementCount("schematic_path"),
    schematic_port: getElementCount("schematic_port"),
    schematic_rect: getElementCount("schematic_rect"),
    schematic_text: getElementCount("schematic_text"),
    source_component: getElementCount("source_component"),
    source_net: getElementCount("source_net"),
    source_port: getElementCount("source_port"),
    wire_segment: wireSegmentCount,
  }
}

function getSchematicAnnotationSignatures(
  circuitJson: CircuitElement[],
): SchematicAnnotationSignature[] {
  const signatures: SchematicAnnotationSignature[] = []
  for (const element of circuitJson) {
    if (element.type === "schematic_text") {
      signatures.push({
        anchor: asString(element.anchor),
        color: asString(element.color),
        fontSizeCircuitUnits: asNumber(element.font_size),
        rotationDegrees: asNumber(element.rotation),
        text: asString(element.text),
        type: element.type,
      })
      continue
    }
    if (element.type === "schematic_rect") {
      signatures.push({
        color: asString(element.color),
        fillColor: asString(element.fill_color),
        isFilled: element.is_filled === true,
        strokeWidthCircuitUnits: asNumber(element.stroke_width),
        type: element.type,
      })
      continue
    }
    if (element.type === "schematic_path") {
      signatures.push({
        fillColor: asString(element.fill_color),
        isFilled: element.is_filled === true,
        pointCount: Array.isArray(element.points) ? element.points.length : 0,
        strokeColor: asString(element.stroke_color),
        strokeWidthCircuitUnits: asNumber(element.stroke_width),
        type: element.type,
      })
    }
  }
  return signatures
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
      element.type === "schematic_no_erc" ||
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
    if (element.type === "schematic_text") {
      const position = asPoint(element.position)
      if (position) points.push(position)
      continue
    }
    if (element.type === "schematic_rect") {
      const center = asPoint(element.center)
      const width = asNumber(element.width)
      const height = asNumber(element.height)
      if (center) {
        points.push(
          { x: center.x - width / 2, y: center.y - height / 2 },
          { x: center.x + width / 2, y: center.y + height / 2 },
        )
      }
      continue
    }
    if (element.type === "schematic_path") {
      if (Array.isArray(element.points)) {
        for (const point of element.points) {
          const circuitPoint = asPoint(point)
          if (circuitPoint) points.push(circuitPoint)
        }
      }
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
    roundTripAnnotationSignatures:
      getSchematicAnnotationSignatures(roundTripCircuitJson),
    roundTripComponentNames: getStringFields({
      circuitJson: roundTripCircuitJson,
      elementType: "source_component",
      fieldName: "name",
    }),
    roundTripCounts,
    roundTripNetLabelTexts: getStringFields({
      circuitJson: roundTripCircuitJson,
      elementType: "schematic_net_label",
      fieldName: "text",
    }),
    roundTripOffSheetPortSignatures:
      getOffSheetPortSignatures(roundTripCircuitJson),
    roundTripPowerPortSymbolNames:
      getPowerPortSymbolNames(roundTripCircuitJson),
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
    sourceAnnotationSignatures:
      getSchematicAnnotationSignatures(sourceCircuitJson),
    sourceCounts,
    sourceNetLabelTexts: getStringFields({
      circuitJson: sourceCircuitJson,
      elementType: "schematic_net_label",
      fieldName: "text",
    }),
    sourceOffSheetPortSignatures: getOffSheetPortSignatures(sourceCircuitJson),
    sourcePowerPortSymbolNames: getPowerPortSymbolNames(sourceCircuitJson),
    sourcePortNames: getStringFields({
      circuitJson: sourceCircuitJson,
      elementType: "source_port",
      fieldName: "name",
    }),
    sourceSupportedPrimitiveTotal:
      sourceCounts.schematic_component +
      sourceCounts.schematic_no_erc +
      sourceCounts.schematic_port +
      sourceCounts.schematic_net_label +
      sourceCounts.schematic_path +
      sourceCounts.schematic_rect +
      sourceCounts.schematic_text +
      sourceCounts.wire_segment +
      sourceCounts.junction,
  }
}
