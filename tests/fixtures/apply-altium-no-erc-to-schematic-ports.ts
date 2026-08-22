import type { AltiumSchDoc } from "altiumts"
import { asPoint } from "../../lib/format"
import type { CircuitElement } from "../../lib/types"
import {
  getRecordLocation,
  toCircuitPoint,
} from "./altium-schematic-coordinate-utils"

type ApplyAltiumNoErcToSchematicPortsInput = {
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

export function applyAltiumNoErcToSchematicPorts({
  document,
  elements,
}: ApplyAltiumNoErcToSchematicPortsInput): void {
  const noErcPointKeys = new Set<CircuitSchematicPointKey>(
    document
      .getRecordsByKind("22")
      .filter((record) => document.getParent(record) === undefined)
      .map((record) =>
        getCircuitSchematicPointKey(toCircuitPoint(getRecordLocation(record))),
      ),
  )

  for (const schematicPort of elements) {
    if (schematicPort.type !== "schematic_port") continue
    const portCenter = asPoint(schematicPort.center)
    if (
      portCenter &&
      noErcPointKeys.has(getCircuitSchematicPointKey(portCenter))
    ) {
      schematicPort.no_erc = true
    }
  }
}
