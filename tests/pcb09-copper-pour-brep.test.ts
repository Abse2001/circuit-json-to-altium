import { expect, test } from "bun:test"
import { parseAltiumBinaryPcbDoc } from "altiumts"
import { CircuitJsonToAltiumConverter } from "../lib"
import { board, expectValidPcb } from "./fixtures"

test("exports BRep copper pours with curved edges, holes, and mask openings", () => {
  const converter = new CircuitJsonToAltiumConverter([
    board(),
    {
      type: "source_net",
      source_net_id: "source_net_vcc",
      name: "VCC",
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pcb_copper_pour_brep",
      source_net_id: "source_net_vcc",
      covered_with_solder_mask: false,
      shape: "brep",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: -5, y: -3, bulge: 0.25 },
            { x: 5, y: -3 },
            { x: 5, y: 3 },
            { x: -5, y: 3 },
          ],
        },
        inner_rings: [
          {
            vertices: [
              { x: -1, y: -1 },
              { x: 1, y: -1 },
              { x: 1, y: 1 },
              { x: -1, y: 1 },
            ],
          },
        ],
      },
      layer: "top",
    },
  ])
  converter.runUntilFinished()
  const document = parseAltiumBinaryPcbDoc(converter.getOutput().pcb.content)
  const copperRegion = document.regions.find((region) => region.layer === "TOP")
  const solderMaskOpening = document.regions.find(
    (region) => region.layer === "TOPSOLDER",
  )

  expect(document.polygons).toHaveLength(1)
  expect(document.regions).toHaveLength(2)
  expect(copperRegion?.netIndex).toBe(0)
  expect(copperRegion?.geometry.outline.vertices.length).toBeGreaterThan(5)
  expect(copperRegion?.geometry.holes).toHaveLength(1)
  expect(copperRegion?.geometry.holes[0]?.vertices).toHaveLength(4)
  expect(solderMaskOpening?.netIndex).toBe(65_535)
  expect(solderMaskOpening?.polygonIndex).toBe(65_535)
  expectValidPcb(document)
})
