import { expect, test } from "bun:test"
import {
  type AltiumSchDoc,
  AltiumSchNoErcRecord,
  AltiumSchPinRecord,
} from "altiumts"
import {
  board,
  type CircuitElement,
  expectValidSchematic,
  extractArchive,
  sourceComponent,
  sourcePort,
} from "./fixtures"

const noErcSchematicPort: CircuitElement = {
  type: "schematic_port",
  schematic_port_id: "schematic_port_1",
  schematic_component_id: "schematic_component_1",
  source_port_id: "source_port_1",
  center: { x: 2, y: 0 },
  distance_from_component_edge: 0.5,
  facing_direction: "right",
  no_erc: true,
}

const elements: CircuitElement[] = [
  board(),
  sourceComponent("source_component_1", "U1"),
  sourcePort({
    pinNumber: 1,
    sourceComponentId: "source_component_1",
    sourcePortId: "source_port_1",
  }),
  {
    type: "schematic_component",
    schematic_component_id: "schematic_component_1",
    source_component_id: "source_component_1",
    center: { x: 0, y: 0 },
    size: { width: 2, height: 2 },
  },
  noErcSchematicPort,
]

test("writes no ERC directives as native Altium records", async () => {
  const { schematics } = await extractArchive(elements)
  const schematic = schematics[0] as AltiumSchDoc
  const pinRecord = schematic.pins[0]
  if (!(pinRecord instanceof AltiumSchPinRecord) || !pinRecord.position) {
    throw new Error("Expected a native Altium pin record")
  }
  const altiumPinLength = pinRecord.getNumber("PINLENGTH")
  if (altiumPinLength === undefined) {
    throw new Error("Expected the native Altium pin to have a length")
  }
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
    position: {
      x: pinRecord.position.x + altiumPinLength,
      y: pinRecord.position.y,
    },
    suppressAll: true,
    symbol: "Thin Cross",
  })
  expect(schematic.getRecordsByKind("22")).toHaveLength(1)
  expectValidSchematic(schematic)
})
