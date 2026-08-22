import type { AltiumSchDoc } from "altiumts"
import type { CircuitElement } from "../../lib/types"
import {
  getRecordLocation,
  toCircuitPoint,
} from "./altium-schematic-coordinate-utils"

type AppendAltiumSchematicNoConnectElementsInput = {
  document: AltiumSchDoc
  elements: CircuitElement[]
}

export function appendAltiumSchematicNoConnectElements({
  document,
  elements,
}: AppendAltiumSchematicNoConnectElementsInput): void {
  const noConnectRecords = document
    .getRecordsByKind("22")
    .filter((record) => document.getParent(record) === undefined)

  for (const [noConnectIndex, noConnectRecord] of noConnectRecords.entries()) {
    elements.push({
      type: "schematic_no_connect",
      schematic_no_connect_id: `schematic_no_connect_${noConnectIndex}`,
      center: toCircuitPoint(getRecordLocation(noConnectRecord)),
    })
  }
}
