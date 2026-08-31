import { expect, test } from "bun:test"
import type { AltiumSchDoc } from "altiumts"
import {
  board,
  type CircuitElement,
  expectValidSchematic,
  extractArchive,
} from "./fixtures"

test("writes standalone schematic boxes as native Altium graphics", async () => {
  const elements: CircuitElement[] = [
    board(),
    {
      type: "schematic_box",
      width: 2,
      height: 1,
      x: -3,
      y: 0,
      is_dashed: false,
    },
    {
      type: "schematic_box",
      width: 3,
      height: 2,
      x: 3,
      y: 0,
      is_dashed: true,
    },
  ]

  const { schematics } = await extractArchive(elements)
  const schematic = schematics[0] as AltiumSchDoc
  const rectangle = schematic.getRecordsByKind("14")[0]
  const dashedBox = schematic.getRecordsByKind("6")[0]

  expect({
    height: Math.abs(
      (rectangle?.getNumber("CORNER.Y") ?? 0) -
        (rectangle?.getNumber("LOCATION.Y") ?? 0),
    ),
    isSolid: rectangle?.getBoolean("ISSOLID"),
    width: Math.abs(
      (rectangle?.getNumber("CORNER.X") ?? 0) -
        (rectangle?.getNumber("LOCATION.X") ?? 0),
    ),
  }).toEqual({ height: 20, isSolid: false, width: 40 })
  expect({
    lineStyle: dashedBox?.getNumber("LINESTYLE"),
    pointCount: dashedBox?.getNumber("LOCATIONCOUNT"),
    startsAndEndsAtSameX:
      dashedBox?.getNumber("X1") === dashedBox?.getNumber("X5"),
    startsAndEndsAtSameY:
      dashedBox?.getNumber("Y1") === dashedBox?.getNumber("Y5"),
  }).toEqual({
    lineStyle: 1,
    pointCount: 5,
    startsAndEndsAtSameX: true,
    startsAndEndsAtSameY: true,
  })
  expectValidSchematic(schematic)
})
