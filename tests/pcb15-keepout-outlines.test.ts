import { expect, test } from "bun:test"
import { serializeAltiumPcbToSvg } from "altiumts"
import { board, type CircuitElement, extractArchive } from "./fixtures"

test("writes PCB keepout outlines as native Altium keepout tracks", async () => {
  const elements: CircuitElement[] = [
    board({ width: 20, height: 16 }),
    {
      type: "pcb_keepout",
      pcb_keepout_id: "pcb_keepout_board_edge",
      shape: "outline",
      outline: [
        { x: -7, y: -5 },
        { x: 5, y: -5 },
        { x: 7, y: -3 },
        { x: 7, y: 5 },
        { x: -7, y: 5 },
        { x: -7, y: -5 },
      ],
      stroke_width: "0.25mm",
      layers: ["all"],
    },
  ]
  const { pcb } = await extractArchive(elements)
  const tracks = pcb.getRecordsByKind("Track")

  expect(tracks).toHaveLength(5)
  expect(tracks.every((track) => track.get("LAYER") === "KEEPOUT")).toBe(true)
  expect(tracks.every((track) => track.getBoolean("KEEPOUT") === true)).toBe(
    true,
  )
  await expect(serializeAltiumPcbToSvg(pcb)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
