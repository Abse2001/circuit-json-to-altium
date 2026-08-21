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
    type: "schematic_no_connect",
    schematic_no_connect_id: "schematic_no_connect_1",
    center: { x: 2, y: 3 },
  },
]

test("writes schematic no-connect markers as native No ERC records", async () => {
  const { schematics } = await extractArchive(elements)
  const schematic = schematics[0] as AltiumSchDoc
  const noConnectRecord = schematic.getRecordsByKind("22")[0]
  if (!(noConnectRecord instanceof AltiumSchNoErcRecord)) {
    throw new Error("Expected a native Altium No ERC record")
  }

  expect({
    color: noConnectRecord.getNumber("COLOR"),
    isActive: noConnectRecord.getBoolean("ISACTIVE"),
    orientation: noConnectRecord.getNumber("ORIENTATION"),
    ownerPartId: noConnectRecord.getNumber("OWNERPARTID"),
    position: noConnectRecord.position,
    suppressAll: noConnectRecord.getBoolean("SUPPRESSALL"),
    symbol: noConnectRecord.getDecoded("SYMBOL"),
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
