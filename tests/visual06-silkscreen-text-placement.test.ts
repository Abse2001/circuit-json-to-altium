import { expect, test } from "bun:test"
import { parseAltiumBinaryPcbDoc, serializeAltiumPcbToSvg } from "altiumts"
import {
  type CircuitJson,
  pcb_board,
  pcb_silkscreen_path,
  pcb_silkscreen_text,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { CircuitJsonToAltiumConverter } from "../lib"
import { createSideBySideSvg } from "./fixtures/create-side-by-side-svg"

const silkscreenTextExamples = [
  { anchorAlignment: "top_left", label: "TL", anchorPosition: { x: -6, y: 3 } },
  {
    anchorAlignment: "top_center",
    label: "TC",
    anchorPosition: { x: 0, y: 3 },
  },
  { anchorAlignment: "top_right", label: "TR", anchorPosition: { x: 6, y: 3 } },
  {
    anchorAlignment: "center_left",
    label: "CL",
    anchorPosition: { x: -6, y: 0 },
  },
  { anchorAlignment: "center", label: "C", anchorPosition: { x: 0, y: 0 } },
  {
    anchorAlignment: "center_right",
    label: "CR",
    anchorPosition: { x: 6, y: 0 },
  },
  {
    anchorAlignment: "bottom_left",
    label: "BL",
    anchorPosition: { x: -6, y: -3 },
  },
  {
    anchorAlignment: "bottom_center",
    label: "BC",
    anchorPosition: { x: 0, y: -3 },
  },
  {
    anchorAlignment: "bottom_right",
    label: "BR",
    anchorPosition: { x: 6, y: -3 },
  },
] as const

test("snapshots Circuit JSON and Altium silkscreen text placement", async () => {
  const anchorMarkers = silkscreenTextExamples.flatMap(
    ({ anchorPosition }, index) => {
      return [
        pcb_silkscreen_path.parse({
          type: "pcb_silkscreen_path",
          pcb_silkscreen_path_id: `horizontal_anchor_marker_${index}`,
          pcb_component_id: "pcb_component_0",
          layer: "top",
          route: [
            { x: anchorPosition.x - 0.2, y: anchorPosition.y },
            { x: anchorPosition.x + 0.2, y: anchorPosition.y },
          ],
          stroke_width: 0.08,
        }),
        pcb_silkscreen_path.parse({
          type: "pcb_silkscreen_path",
          pcb_silkscreen_path_id: `vertical_anchor_marker_${index}`,
          pcb_component_id: "pcb_component_0",
          layer: "top",
          route: [
            { x: anchorPosition.x, y: anchorPosition.y - 0.2 },
            { x: anchorPosition.x, y: anchorPosition.y + 0.2 },
          ],
          stroke_width: 0.08,
        }),
      ]
    },
  )
  const circuitJson = [
    pcb_board.parse({
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 18,
      height: 12,
    }),
    ...anchorMarkers,
    ...silkscreenTextExamples.map(
      ({ anchorAlignment, anchorPosition, label }, index) =>
        pcb_silkscreen_text.parse({
          type: "pcb_silkscreen_text",
          pcb_silkscreen_text_id: `pcb_silkscreen_text_${index}`,
          pcb_component_id: "pcb_component_0",
          anchor_position: anchorPosition,
          anchor_alignment: anchorAlignment,
          text: label,
          font: "tscircuit2024",
          font_size: 0.8,
          layer: "top",
        }),
    ),
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
