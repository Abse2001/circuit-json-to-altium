import { expect, test } from "bun:test"
import { parseAltiumBinaryPcbDoc } from "altiumts"
import { CircuitJsonToAltiumConverter } from "../lib"
import { board, expectValidPcb } from "./fixtures"

test("preserves declared nets without assigning unconnected copper", () => {
  const converter = new CircuitJsonToAltiumConverter([
    board(),
    {
      type: "source_net",
      source_net_id: "source_net_gnd",
      name: "GND",
    },
    {
      type: "source_net",
      source_net_id: "source_net_signal",
      name: "SIGNAL",
    },
    {
      type: "source_trace",
      source_trace_id: "source_trace_gnd",
      connected_source_net_ids: ["source_net_gnd"],
      connected_source_port_ids: [],
    },
    {
      type: "source_trace",
      source_trace_id: "source_trace_unconnected",
      connected_source_net_ids: [],
      connected_source_port_ids: [],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_unconnected",
      source_trace_id: "source_trace_unconnected",
      route: [
        { route_type: "wire", x: -1, y: 0, width: 0.2, layer: "top" },
        { route_type: "wire", x: 1, y: 0, width: 0.2, layer: "top" },
      ],
    },
  ])

  converter.runUntilFinished()
  const document = parseAltiumBinaryPcbDoc(converter.getOutput().pcb.content)
  const unconnectedTrack = document.getRecordsByKind("Track")[0]

  expect(document.nets.map((net) => net.name)).toEqual(["GND", "SIGNAL"])
  expect(unconnectedTrack).toBeDefined()
  if (!unconnectedTrack) throw new Error("Expected an unconnected track")
  expect(document.getNetForRecord(unconnectedTrack)).toBeUndefined()
  expectValidPcb(document)
})
