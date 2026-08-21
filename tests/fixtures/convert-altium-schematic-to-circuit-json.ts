import {
  type AltiumPoint,
  type AltiumRecord,
  type AltiumSchComponentRecord,
  type AltiumSchDoc,
  AltiumSchPinRecord,
  getSchematicRecordPoints,
} from "altiumts"
import type { CircuitElement } from "../../lib/types"
import { addSchematicTraceConnectivity } from "./add-schematic-trace-connectivity"

const ALTIUM_UNITS_PER_CIRCUIT_UNIT = 20

type CircuitPoint = {
  x: number
  y: number
}

type AltiumBounds = {
  maxX: number
  maxY: number
  minX: number
  minY: number
}

const PIN_FACING_DIRECTION_BY_ORIENTATION = [
  "right",
  "up",
  "left",
  "down",
] as const

function getSchematicCoordinate({
  fallback = 0,
  key,
  record,
}: {
  fallback?: number
  key: string
  record: AltiumRecord
}): number {
  const integer = Number(record.getCaseInsensitive(key) ?? fallback)
  const fraction = record.getCaseInsensitive(`${key}_FRAC`)
  if (!Number.isFinite(integer) || fraction === undefined) {
    return Number.isFinite(integer) ? integer : fallback
  }
  const fractionValue = Number(`0.${fraction.replace(/^[+-]/u, "")}`)
  if (!Number.isFinite(fractionValue)) return integer
  return integer < 0 ? integer - fractionValue : integer + fractionValue
}

function toCircuitPoint(point: AltiumPoint): CircuitPoint {
  return {
    x: point.x / ALTIUM_UNITS_PER_CIRCUIT_UNIT,
    y: point.y / ALTIUM_UNITS_PER_CIRCUIT_UNIT,
  }
}

function toCircuitLength(altiumLength: number): number {
  return altiumLength / ALTIUM_UNITS_PER_CIRCUIT_UNIT
}

function getRecordLocation(record: AltiumRecord): AltiumPoint {
  return {
    x: getSchematicCoordinate({ key: "LOCATION.X", record }),
    y: getSchematicCoordinate({ key: "LOCATION.Y", record }),
  }
}

function getRecordCorner(record: AltiumRecord): AltiumPoint {
  return {
    x: getSchematicCoordinate({ key: "CORNER.X", record }),
    y: getSchematicCoordinate({ key: "CORNER.Y", record }),
  }
}

function getGraphicRecordPoints(record: AltiumRecord): AltiumPoint[] {
  if (record.recordKind === "6" || record.recordKind === "7") {
    return getSchematicRecordPoints(record)
  }

  if (record.recordKind === "10" || record.recordKind === "14") {
    return [getRecordLocation(record), getRecordCorner(record)]
  }

  if (record.recordKind === "13") {
    return [getRecordLocation(record), getRecordCorner(record)]
  }

  if (
    record.recordKind === "8" ||
    record.recordKind === "11" ||
    record.recordKind === "12"
  ) {
    const center = getRecordLocation(record)
    const radiusX = getSchematicCoordinate({
      fallback: 1,
      key: "RADIUS",
      record,
    })
    const radiusY = getSchematicCoordinate({
      fallback: radiusX,
      key: "SECONDARYRADIUS",
      record,
    })
    return [
      { x: center.x - radiusX, y: center.y - radiusY },
      { x: center.x + radiusX, y: center.y + radiusY },
    ]
  }

  return []
}

function isRecordVisibleForComponent(
  component: AltiumSchComponentRecord,
  record: AltiumRecord,
): boolean {
  const ownerPartId = record.getNumber("OWNERPARTID")
  const currentPartId = component.getNumber("CURRENTPARTID") ?? 1
  const partMatches =
    ownerPartId === undefined ||
    ownerPartId <= 0 ||
    ownerPartId === currentPartId
  const ownerPartDisplayMode = record.getNumber("OWNERPARTDISPLAYMODE")
  return (
    partMatches &&
    (ownerPartDisplayMode === undefined || ownerPartDisplayMode === 0)
  )
}

function getComponentBounds(
  document: AltiumSchDoc,
  component: AltiumSchComponentRecord,
): AltiumBounds {
  const points = document
    .getOwnedRecords(component)
    .filter((record) => isRecordVisibleForComponent(component, record))
    .flatMap(getGraphicRecordPoints)

  if (points.length === 0) {
    const center = component.position ?? { x: 0, y: 0 }
    return {
      maxX: center.x + 10,
      maxY: center.y + 10,
      minX: center.x - 10,
      minY: center.y - 10,
    }
  }

  return {
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y)),
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
  }
}

function getOwnedParameterText({
  component,
  document,
  parameterName,
  requireVisible = false,
}: {
  component: AltiumSchComponentRecord
  document: AltiumSchDoc
  parameterName: string
  requireVisible?: boolean
}): string | undefined {
  const parameter = document
    .getOwnedRecords(component)
    .find(
      (record) =>
        record.getDecoded("NAME")?.toLowerCase() ===
          parameterName.toLowerCase() &&
        (!requireVisible || record.getBoolean("ISHIDDEN") !== true),
    )
  return parameter?.getDecoded("TEXT")
}

function isVisiblePin(
  component: AltiumSchComponentRecord,
  pin: AltiumSchPinRecord,
): boolean {
  const pinConglomerate = pin.getNumber("PINCONGLOMERATE")
  const isHidden =
    pin.hidden === true ||
    (pinConglomerate !== undefined && (pinConglomerate & 0x04) !== 0)
  return !isHidden && isRecordVisibleForComponent(component, pin)
}

function getPinOrientation(pin: AltiumSchPinRecord): number {
  const pinConglomerate = pin.getNumber("PINCONGLOMERATE")
  const orientation = pinConglomerate ?? pin.getNumber("ORIENTATION") ?? 0
  return ((Math.round(orientation) % 4) + 4) % 4
}

function getPinTerminal(pin: AltiumSchPinRecord): AltiumPoint {
  const body = pin.position ?? { x: 0, y: 0 }
  const length = Math.max(
    getSchematicCoordinate({ fallback: 10, key: "PINLENGTH", record: pin }),
    1,
  )
  const orientation = getPinOrientation(pin)
  const direction = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
  ][orientation] ?? { x: 1, y: 0 }
  return {
    x: body.x + direction.x * length,
    y: body.y + direction.y * length,
  }
}

function getNumericPinNumber(
  pinDesignator: string | undefined,
): number | undefined {
  if (!pinDesignator || !/^\d+$/u.test(pinDesignator)) return undefined
  const pinNumber = Number(pinDesignator)
  return Number.isSafeInteger(pinNumber) ? pinNumber : undefined
}

function appendComponentElements({
  component,
  componentIndex,
  document,
  elements,
}: {
  component: AltiumSchComponentRecord
  componentIndex: number
  document: AltiumSchDoc
  elements: CircuitElement[]
}): void {
  const sourceComponentId = `source_component_${componentIndex}`
  const schematicComponentId = `schematic_component_${componentIndex}`
  const bounds = getComponentBounds(document, component)
  const center = toCircuitPoint({
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  })
  const designator =
    getOwnedParameterText({
      component,
      document,
      parameterName: "Designator",
    }) ?? `U${componentIndex + 1}`
  const comment = getOwnedParameterText({
    component,
    document,
    parameterName: "Comment",
    requireVisible: true,
  })

  elements.push(
    {
      type: "source_component",
      source_component_id: sourceComponentId,
      name: designator,
    },
    {
      type: "schematic_component",
      schematic_component_id: schematicComponentId,
      source_component_id: sourceComponentId,
      center,
      size: {
        width: toCircuitLength(Math.max(bounds.maxX - bounds.minX, 1)),
        height: toCircuitLength(Math.max(bounds.maxY - bounds.minY, 1)),
      },
      symbol_name: component.libraryReference ?? designator,
      ...(comment ? { symbol_display_value: comment } : {}),
    },
  )

  const visiblePins = document
    .getOwnedRecords(component)
    .filter(
      (record): record is AltiumSchPinRecord =>
        record instanceof AltiumSchPinRecord && isVisiblePin(component, record),
    )
  for (const [pinIndex, pin] of visiblePins.entries()) {
    const sourcePortId = `source_port_${componentIndex}_${pinIndex}`
    const pinNumber = getNumericPinNumber(pin.designator)
    const orientation = getPinOrientation(pin)
    elements.push(
      {
        type: "source_port",
        source_port_id: sourcePortId,
        source_component_id: sourceComponentId,
        name: pin.name || pin.designator || `Pin ${pinIndex + 1}`,
        ...(pinNumber === undefined ? {} : { pin_number: pinNumber }),
      },
      {
        type: "schematic_port",
        schematic_port_id: `schematic_port_${componentIndex}_${pinIndex}`,
        schematic_component_id: schematicComponentId,
        source_port_id: sourcePortId,
        center: toCircuitPoint(getPinTerminal(pin)),
        distance_from_component_edge: toCircuitLength(
          Math.max(
            getSchematicCoordinate({
              fallback: 10,
              key: "PINLENGTH",
              record: pin,
            }),
            1,
          ),
        ),
        facing_direction:
          PIN_FACING_DIRECTION_BY_ORIENTATION[orientation] ?? "right",
        ...(pin.name ? { display_pin_label: pin.name } : {}),
      },
    )
  }
}

function appendWireElements(
  document: AltiumSchDoc,
  elements: CircuitElement[],
): void {
  for (const [wireIndex, wire] of document.wires.entries()) {
    const points = getSchematicRecordPoints(wire).map(toCircuitPoint)
    const edges: Array<{ from: CircuitPoint; to: CircuitPoint }> = []
    for (let pointIndex = 1; pointIndex < points.length; pointIndex++) {
      const from = points[pointIndex - 1]
      const to = points[pointIndex]
      if (from && to) edges.push({ from, to })
    }
    if (edges.length === 0) continue
    const sourceTraceId = `source_trace_wire_${wireIndex}`
    elements.push(
      {
        type: "source_trace",
        source_trace_id: sourceTraceId,
        connected_source_port_ids: [],
        connected_source_net_ids: [],
      },
      {
        type: "schematic_trace",
        schematic_trace_id: `schematic_trace_wire_${wireIndex}`,
        source_trace_id: sourceTraceId,
        edges,
        junctions: [],
      },
    )
  }

  const junctions = document
    .getRecordsByKind("29")
    .filter((junction) => document.getParent(junction) === undefined)
    .map((junction) => toCircuitPoint(getRecordLocation(junction)))
  if (junctions.length > 0) {
    elements.push({
      type: "schematic_trace",
      schematic_trace_id: "schematic_trace_junctions",
      edges: [],
      junctions,
    })
  }
}

function appendNetLabelElements(
  document: AltiumSchDoc,
  elements: CircuitElement[],
): void {
  const sourceNets: Array<{ id: string; name: string }> = []
  for (const [labelIndex, label] of document.netLabels.entries()) {
    const text = label.text ?? ""
    if (!text) continue
    let sourceNetId = sourceNets.find(
      (sourceNet) => sourceNet.name === text,
    )?.id
    if (!sourceNetId) {
      sourceNetId = `source_net_${sourceNets.length}`
      sourceNets.push({ id: sourceNetId, name: text })
      elements.push({
        type: "source_net",
        source_net_id: sourceNetId,
        name: text,
        member_source_group_ids: [],
      })
    }
    const position = toCircuitPoint(label.position ?? { x: 0, y: 0 })
    elements.push({
      type: "schematic_net_label",
      schematic_net_label_id: `schematic_net_label_${labelIndex}`,
      source_net_id: sourceNetId,
      center: position,
      anchor_position: position,
      anchor_side: "left",
      text,
    })
  }
}

export function convertAltiumSchematicToCircuitJson(
  document: AltiumSchDoc,
): CircuitElement[] {
  const elements: CircuitElement[] = []
  for (const [componentIndex, component] of document.components.entries()) {
    appendComponentElements({
      component,
      componentIndex,
      document,
      elements,
    })
  }
  appendWireElements(document, elements)
  appendNetLabelElements(document, elements)
  return addSchematicTraceConnectivity(elements)
}
