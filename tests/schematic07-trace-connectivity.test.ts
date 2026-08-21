import { expect, test } from "bun:test"
import type {
  CircuitElement,
  Point,
  SourcePortId,
  SourceTraceId,
} from "../lib/types"
import { addSchematicTraceConnectivity } from "./fixtures/add-schematic-trace-connectivity"
import { getSchematicConnectivitySignature } from "./fixtures/get-schematic-connectivity-signature"

type SchematicPortFixture = {
  center: Point
  sourcePortId: SourcePortId
}

type SchematicTraceFixture = {
  from: Point
  sourceTraceId: SourceTraceId
  to: Point
}

const schematicPortFixtures: SchematicPortFixture[] = [
  { center: { x: 0, y: 0 }, sourcePortId: "source_port_1" },
  { center: { x: 2, y: 0 }, sourcePortId: "source_port_2" },
  { center: { x: 4, y: 0 }, sourcePortId: "source_port_3" },
  { center: { x: 6, y: 0 }, sourcePortId: "source_port_4" },
  { center: { x: 1, y: -1 }, sourcePortId: "source_port_5" },
  { center: { x: 1, y: 1 }, sourcePortId: "source_port_6" },
  { center: { x: 2, y: 0.5 }, sourcePortId: "source_port_7" },
  { center: { x: 10, y: 10 }, sourcePortId: "source_port_8" },
]

const schematicTraceFixtures: SchematicTraceFixture[] = [
  {
    from: { x: 0, y: 0 },
    sourceTraceId: "source_trace_1",
    to: { x: 2, y: 0 },
  },
  {
    from: { x: 4, y: 0 },
    sourceTraceId: "source_trace_2",
    to: { x: 6, y: 0 },
  },
  {
    from: { x: 1, y: -1 },
    sourceTraceId: "source_trace_3",
    to: { x: 1, y: 1 },
  },
  {
    from: { x: 1, y: 0.5 },
    sourceTraceId: "source_trace_4",
    to: { x: 2, y: 0.5 },
  },
  {
    from: { x: 10, y: 10 },
    sourceTraceId: "source_trace_5",
    to: { x: 10, y: 10 },
  },
]

const circuitJson: CircuitElement[] = [
  {
    type: "source_net",
    source_net_id: "source_net_signal",
    name: "SIGNAL",
  },
  ...schematicPortFixtures.map(
    ({ center, sourcePortId }, schematicPortIndex) => ({
      type: "schematic_port",
      schematic_port_id: `schematic_port_${schematicPortIndex + 1}`,
      source_port_id: sourcePortId,
      center,
    }),
  ),
  {
    type: "schematic_net_label",
    schematic_net_label_id: "schematic_net_label_1",
    source_net_id: "source_net_signal",
    anchor_position: { x: 0.5, y: 0 },
    text: "SIGNAL",
  },
  {
    type: "schematic_net_label",
    schematic_net_label_id: "schematic_net_label_2",
    source_net_id: "source_net_signal",
    anchor_position: { x: 5, y: 0 },
    text: "SIGNAL",
  },
  ...schematicTraceFixtures.flatMap(
    ({ from, sourceTraceId, to }, schematicTraceIndex) => [
      {
        type: "source_trace",
        source_trace_id: sourceTraceId,
        connected_source_net_ids: [],
        connected_source_port_ids: [],
      },
      {
        type: "schematic_trace",
        schematic_trace_id: `schematic_trace_${schematicTraceIndex + 1}`,
        source_trace_id: sourceTraceId,
        edges: [{ from, to }],
        junctions: [],
      },
    ],
  ),
]

test("derives canonical schematic trace connectivity", () => {
  const connectedCircuitJson = addSchematicTraceConnectivity(circuitJson)

  expect(getSchematicConnectivitySignature(connectedCircuitJson)).toEqual({
    connectedSourcePortIds: [
      "source_port_1",
      "source_port_2",
      "source_port_3",
      "source_port_4",
      "source_port_5",
      "source_port_6",
      "source_port_7",
      "source_port_8",
    ],
    namedNetSourcePorts: [
      {
        sourceNetName: "SIGNAL",
        sourcePortIds: [
          "source_port_1",
          "source_port_2",
          "source_port_3",
          "source_port_4",
        ],
      },
    ],
    sourcePortIdGroups: [
      ["source_port_1", "source_port_2", "source_port_3", "source_port_4"],
      ["source_port_5", "source_port_6", "source_port_7"],
    ],
    sourceTraceConnections: [
      {
        sourceNetIds: ["source_net_signal"],
        sourcePortIds: [
          "source_port_1",
          "source_port_2",
          "source_port_3",
          "source_port_4",
        ],
      },
      {
        sourceNetIds: [],
        sourcePortIds: ["source_port_5", "source_port_6", "source_port_7"],
      },
      {
        sourceNetIds: [],
        sourcePortIds: ["source_port_8"],
      },
    ],
  })
})
