import type { AltiumSchDoc } from "altiumts"
import { asPoint, asString } from "../../lib/format"
import type { CircuitElement, SourcePortId } from "../../lib/types"
import {
  getRecordLocation,
  toCircuitPoint,
} from "./altium-schematic-coordinate-utils"

type ApplyAltiumNoConnectToSourcePortsInput = {
  document: AltiumSchDoc
  elements: CircuitElement[]
}

type CircuitSchematicPointKey = string

function getCircuitSchematicPointKey({
  x,
  y,
}: {
  x: number
  y: number
}): CircuitSchematicPointKey {
  return `${x}:${y}`
}

export function applyAltiumNoConnectToSourcePorts({
  document,
  elements,
}: ApplyAltiumNoConnectToSourcePortsInput): void {
  const noConnectPointKeys = new Set<CircuitSchematicPointKey>(
    document
      .getRecordsByKind("22")
      .filter((record) => document.getParent(record) === undefined)
      .map((record) =>
        getCircuitSchematicPointKey(toCircuitPoint(getRecordLocation(record))),
      ),
  )
  const sourcePortsById = new Map<SourcePortId, CircuitElement>(
    elements
      .filter((element) => element.type === "source_port")
      .map((sourcePort) => [asString(sourcePort.source_port_id), sourcePort]),
  )

  for (const schematicPort of elements) {
    if (schematicPort.type !== "schematic_port") continue
    const schematicPortCenter = asPoint(schematicPort.center)
    if (
      !schematicPortCenter ||
      !noConnectPointKeys.has(getCircuitSchematicPointKey(schematicPortCenter))
    ) {
      continue
    }
    const sourcePort = sourcePortsById.get(
      asString(schematicPort.source_port_id),
    )
    if (sourcePort) sourcePort.do_not_connect = true
  }
}
