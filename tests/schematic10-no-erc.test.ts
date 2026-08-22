import { expect, test } from "bun:test"
import { type AltiumSchDoc, AltiumSchNoErcRecord } from "altiumts"
import {
  board,
  type CircuitElement,
  expectValidSchematic,
  extractArchive,
} from "./fixtures"

const elements: CircuitElement[] = [
  board(),
  {
    type: "no_erc",
    no_erc_id: "no_erc_1",
    center: { x: 2, y: 3 },
  },
]

test("writes no ERC directives as native Altium records", async () => {
  const { schematics } = await extractArchive(elements)
  const schematic = schematics[0] as AltiumSchDoc
  const noErcRecord = schematic.getRecordsByKind("22")[0]
  if (!(noErcRecord instanceof AltiumSchNoErcRecord)) {
    throw new Error("Expected a native Altium No ERC record")
  }

  expect({
    color: noErcRecord.getNumber("COLOR"),
    isActive: noErcRecord.getBoolean("ISACTIVE"),
    orientation: noErcRecord.getNumber("ORIENTATION"),
    ownerPartId: noErcRecord.getNumber("OWNERPARTID"),
    position: noErcRecord.position,
    suppressAll: noErcRecord.getBoolean("SUPPRESSALL"),
    symbol: noErcRecord.getDecoded("SYMBOL"),
  }).toEqual({
    color: 255,
    isActive: true,
    orientation: 1,
    ownerPartId: -1,
    position: { x: 100, y: 100 },
    suppressAll: true,
    symbol: "Thin Cross",
  })
  expectValidSchematic(schematic)
})
