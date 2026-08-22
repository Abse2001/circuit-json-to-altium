import type { AltiumSchDoc } from "altiumts"
import type { CircuitElement } from "../../lib/types"
import {
  getRecordLocation,
  toCircuitPoint,
} from "./altium-schematic-coordinate-utils"

type AppendAltiumNoErcElementsInput = {
  document: AltiumSchDoc
  elements: CircuitElement[]
}

export function appendAltiumNoErcElements({
  document,
  elements,
}: AppendAltiumNoErcElementsInput): void {
  const noErcRecords = document
    .getRecordsByKind("22")
    .filter((record) => document.getParent(record) === undefined)

  for (const [noErcIndex, noErcRecord] of noErcRecords.entries()) {
    elements.push({
      type: "no_erc",
      no_erc_id: `no_erc_${noErcIndex}`,
      center: toCircuitPoint(getRecordLocation(noErcRecord)),
    })
  }
}
