import type { AltiumSchDoc } from "altiumts"
import type { CircuitElement } from "../../lib/types"
import {
  getRecordLocation,
  toCircuitPoint,
} from "./altium-schematic-coordinate-utils"

type AppendAltiumSchematicNoErcElementsInput = {
  document: AltiumSchDoc
  elements: CircuitElement[]
}

export function appendAltiumSchematicNoErcElements({
  document,
  elements,
}: AppendAltiumSchematicNoErcElementsInput): void {
  const noErcRecords = document
    .getRecordsByKind("22")
    .filter((record) => document.getParent(record) === undefined)

  for (const [noErcIndex, noErcRecord] of noErcRecords.entries()) {
    elements.push({
      type: "schematic_no_erc",
      schematic_no_erc_id: `schematic_no_erc_${noErcIndex}`,
      center: toCircuitPoint(getRecordLocation(noErcRecord)),
    })
  }
}
