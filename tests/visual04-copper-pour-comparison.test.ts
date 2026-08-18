import { expect, test } from "bun:test"
import { parseAltiumBinaryPcbDoc, serializeAltiumPcbToSvg } from "altiumts"
import {
  type CircuitJson,
  pcb_board,
  pcb_copper_pour,
  source_net,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { CircuitJsonToAltiumConverter } from "../lib"
import { createSideBySideSvg } from "./fixtures/create-side-by-side-svg"

test("snapshots Circuit JSON and Altium copper pours side by side", async () => {
  const circuitJson = [
    pcb_board.parse({
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 12,
    }),
    source_net.parse({
      type: "source_net",
      source_net_id: "source_net_gnd",
      name: "GND",
      member_source_group_ids: [],
    }),
    pcb_copper_pour.parse({
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pcb_copper_pour_0",
      source_net_id: "source_net_gnd",
      covered_with_solder_mask: true,
      shape: "brep",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: -8, y: -4 },
            { x: 8, y: -4, bulge: 0.2 },
            { x: 8, y: 4 },
            { x: -8, y: 4 },
          ],
        },
        inner_rings: [
          {
            vertices: [
              { x: -2, y: -1.5 },
              { x: 2, y: -1.5 },
              { x: 2, y: 1.5 },
              { x: -2, y: 1.5 },
            ],
          },
        ],
      },
      layer: "top",
    }),
  ] satisfies CircuitJson
  const converter = new CircuitJsonToAltiumConverter(circuitJson)
  converter.runUntilFinished()
  const altiumDocument = parseAltiumBinaryPcbDoc(
    converter.getOutput().pcb.content,
  )
  const sourceSvg = await convertCircuitJsonToPcbSvg(circuitJson)
  const altiumSvg = serializeAltiumPcbToSvg(altiumDocument)

  await expect(createSideBySideSvg(sourceSvg, altiumSvg)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
