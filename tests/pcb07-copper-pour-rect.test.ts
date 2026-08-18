import { expect, test } from "bun:test"
import { parseAltiumBinaryPcbDoc } from "altiumts"
import { CircuitJsonToAltiumConverter } from "../lib"
import { board, expectValidPcb } from "./fixtures"

test("exports rectangular copper pours with their source net", () => {
  const converter = new CircuitJsonToAltiumConverter([
    board(),
    {
      type: "source_net",
      source_net_id: "source_net_gnd",
      name: "GND",
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pcb_copper_pour_rect",
      source_net_id: "source_net_gnd",
      covered_with_solder_mask: true,
      shape: "rect",
      center: { x: 0, y: 0 },
      width: 8,
      height: 4,
      rotation: 30,
      layer: "top",
    },
  ])
  converter.runUntilFinished()
  const document = parseAltiumBinaryPcbDoc(converter.getOutput().pcb.content)
  const polygon = document.polygons[0]
  const region = document.regions[0]

  expect(document.nets.map((net) => net.name)).toEqual(["GND"])
  expect(document.polygons).toHaveLength(1)
  expect(document.regions).toHaveLength(1)
  expect(polygon?.netIndex).toBe(0)
  expect(polygon?.layer).toBe("TOP")
  expect(region?.netIndex).toBe(0)
  expect(region?.polygonIndex).toBe(0)
  expect(region?.geometry.outline.isExplicitlyClosed).toBeTrue()
  expect(region?.geometry.outline.vertices).toHaveLength(5)
  const bounds = region?.geometry.outline.bounds
  expect(bounds ? bounds.maxX - bounds.minX : 0).toBeCloseTo(351.5, 1)
  expect(bounds ? bounds.maxY - bounds.minY : 0).toBeCloseTo(293.9, 1)
  expectValidPcb(document)
})
