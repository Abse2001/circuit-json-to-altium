import { asPoint, asString, isCircuitElement } from "../../lib/format"
import { TraceConnectivity } from "../../lib/trace-connectivity"
import type {
  CircuitElement,
  Point,
  SourceNetId,
  SourcePortId,
  SourceTraceId,
} from "../../lib/types"

const SCHEMATIC_COORDINATE_TOLERANCE_CIRCUIT_UNITS = 1e-6

type SchematicEdge = {
  from: Point
  to: Point
}

type SchematicTraceGeometry = {
  edges: SchematicEdge[]
  sourceTraceId?: SourceTraceId
  traceIndex: SchematicTraceIndex
}

type PositionedSourceNet = {
  point: Point
  sourceNetId: SourceNetId
}

type PositionedSourcePort = {
  point: Point
  sourcePortId: SourcePortId
}

type TraceRootIndex = number
type SchematicTraceIndex = number

type SourceTraceConnections = {
  sourceNetIds: Set<SourceNetId>
  sourcePortIds: Set<SourcePortId>
}

function getSchematicEdges(schematicTrace: CircuitElement): SchematicEdge[] {
  if (!Array.isArray(schematicTrace.edges)) return []
  return schematicTrace.edges.flatMap((edge) => {
    if (!isCircuitElement(edge)) return []
    const from = asPoint(edge.from)
    const to = asPoint(edge.to)
    return from && to ? [{ from, to }] : []
  })
}

function getSchematicTraceGeometries(
  circuitJson: CircuitElement[],
): SchematicTraceGeometry[] {
  return circuitJson
    .filter((element) => element.type === "schematic_trace")
    .flatMap((schematicTrace) => {
      const edges = getSchematicEdges(schematicTrace)
      if (edges.length === 0) return []
      const sourceTraceId = asString(schematicTrace.source_trace_id)
      return [
        {
          edges,
          ...(sourceTraceId ? { sourceTraceId } : {}),
        },
      ]
    })
    .map((schematicTrace, traceIndex) => ({ ...schematicTrace, traceIndex }))
}

function getSchematicJunctions(circuitJson: CircuitElement[]): Point[] {
  return circuitJson.flatMap((element) => {
    if (element.type !== "schematic_trace") return []
    if (!Array.isArray(element.junctions)) return []
    return element.junctions.flatMap((junction) => {
      const point = asPoint(junction)
      return point ? [point] : []
    })
  })
}

function getPositionedSourcePorts(
  circuitJson: CircuitElement[],
): PositionedSourcePort[] {
  return circuitJson.flatMap((element) => {
    if (element.type !== "schematic_port") return []
    const point = asPoint(element.center)
    const sourcePortId = asString(element.source_port_id)
    return point && sourcePortId ? [{ point, sourcePortId }] : []
  })
}

function getPositionedSourceNets(
  circuitJson: CircuitElement[],
): PositionedSourceNet[] {
  return circuitJson.flatMap((element) => {
    if (element.type !== "schematic_net_label") return []
    const point = asPoint(element.anchor_position) ?? asPoint(element.center)
    const sourceNetId = asString(element.source_net_id)
    return point && sourceNetId ? [{ point, sourceNetId }] : []
  })
}

function isPointOnSchematicEdge({
  edge,
  point,
}: {
  edge: SchematicEdge
  point: Point
}): boolean {
  const edgeX = edge.to.x - edge.from.x
  const edgeY = edge.to.y - edge.from.y
  const pointX = point.x - edge.from.x
  const pointY = point.y - edge.from.y
  const squaredLength = edgeX * edgeX + edgeY * edgeY
  if (
    squaredLength <=
    SCHEMATIC_COORDINATE_TOLERANCE_CIRCUIT_UNITS *
      SCHEMATIC_COORDINATE_TOLERANCE_CIRCUIT_UNITS
  ) {
    return (
      pointX * pointX + pointY * pointY <=
      SCHEMATIC_COORDINATE_TOLERANCE_CIRCUIT_UNITS *
        SCHEMATIC_COORDINATE_TOLERANCE_CIRCUIT_UNITS
    )
  }
  const crossProduct = edgeX * pointY - edgeY * pointX
  const scaledTolerance =
    SCHEMATIC_COORDINATE_TOLERANCE_CIRCUIT_UNITS *
    Math.max(1, Math.abs(edgeX), Math.abs(edgeY))
  if (Math.abs(crossProduct) > scaledTolerance) return false

  const dotProduct = pointX * edgeX + pointY * edgeY
  if (dotProduct < -SCHEMATIC_COORDINATE_TOLERANCE_CIRCUIT_UNITS) return false
  return (
    dotProduct <= squaredLength + SCHEMATIC_COORDINATE_TOLERANCE_CIRCUIT_UNITS
  )
}

function doesSchematicEdgeTouchEdge(
  leftEdge: SchematicEdge,
  rightEdge: SchematicEdge,
): boolean {
  return (
    isPointOnSchematicEdge({ edge: rightEdge, point: leftEdge.from }) ||
    isPointOnSchematicEdge({ edge: rightEdge, point: leftEdge.to }) ||
    isPointOnSchematicEdge({ edge: leftEdge, point: rightEdge.from }) ||
    isPointOnSchematicEdge({ edge: leftEdge, point: rightEdge.to })
  )
}

function doSchematicTracesTouch(
  leftTrace: SchematicTraceGeometry,
  rightTrace: SchematicTraceGeometry,
): boolean {
  return leftTrace.edges.some((leftEdge) =>
    rightTrace.edges.some((rightEdge) =>
      doesSchematicEdgeTouchEdge(leftEdge, rightEdge),
    ),
  )
}

function getTraceIndexesAtPoint({
  point,
  schematicTraces,
}: {
  point: Point
  schematicTraces: SchematicTraceGeometry[]
}): SchematicTraceIndex[] {
  return schematicTraces.flatMap((schematicTrace) =>
    schematicTrace.edges.some((edge) => isPointOnSchematicEdge({ edge, point }))
      ? [schematicTrace.traceIndex]
      : [],
  )
}

function connectTraceIndexes(
  traceIndexes: SchematicTraceIndex[],
  traceConnectivity: TraceConnectivity,
): void {
  const firstTraceIndex = traceIndexes[0]
  if (firstTraceIndex === undefined) return
  for (const traceIndex of traceIndexes.slice(1)) {
    traceConnectivity.connect(firstTraceIndex, traceIndex)
  }
}

function connectTouchingTraces(
  schematicTraces: SchematicTraceGeometry[],
  traceConnectivity: TraceConnectivity,
): void {
  for (const [leftIndex, leftTrace] of schematicTraces.entries()) {
    for (const rightTrace of schematicTraces.slice(leftIndex + 1)) {
      if (doSchematicTracesTouch(leftTrace, rightTrace)) {
        traceConnectivity.connect(leftTrace.traceIndex, rightTrace.traceIndex)
      }
    }
  }
}

function connectTracesAtPoints({
  points,
  schematicTraces,
  traceConnectivity,
}: {
  points: Point[]
  schematicTraces: SchematicTraceGeometry[]
  traceConnectivity: TraceConnectivity
}): void {
  for (const point of points) {
    connectTraceIndexes(
      getTraceIndexesAtPoint({ point, schematicTraces }),
      traceConnectivity,
    )
  }
}

function connectTracesBySourceNet({
  positionedSourceNets,
  schematicTraces,
  traceConnectivity,
}: {
  positionedSourceNets: PositionedSourceNet[]
  schematicTraces: SchematicTraceGeometry[]
  traceConnectivity: TraceConnectivity
}): void {
  const firstTraceIndexBySourceNetId = new Map<
    SourceNetId,
    SchematicTraceIndex
  >()
  for (const { point, sourceNetId } of positionedSourceNets) {
    const traceIndexes = getTraceIndexesAtPoint({ point, schematicTraces })
    connectTraceIndexes(traceIndexes, traceConnectivity)
    const firstTraceIndex = traceIndexes[0]
    if (firstTraceIndex === undefined) continue
    const existingTraceIndex = firstTraceIndexBySourceNetId.get(sourceNetId)
    if (existingTraceIndex === undefined) {
      firstTraceIndexBySourceNetId.set(sourceNetId, firstTraceIndex)
    } else {
      traceConnectivity.connect(existingTraceIndex, firstTraceIndex)
    }
  }
}

function getOrCreateTraceConnections({
  traceConnectionsByRoot,
  traceConnectivity,
  traceIndex,
}: {
  traceConnectionsByRoot: Map<TraceRootIndex, SourceTraceConnections>
  traceConnectivity: TraceConnectivity
  traceIndex: SchematicTraceIndex
}): SourceTraceConnections {
  const rootTraceIndex = traceConnectivity.getRoot(traceIndex)
  const existingConnections = traceConnectionsByRoot.get(rootTraceIndex)
  if (existingConnections) return existingConnections
  const connections: SourceTraceConnections = {
    sourceNetIds: new Set<SourceNetId>(),
    sourcePortIds: new Set<SourcePortId>(),
  }
  traceConnectionsByRoot.set(rootTraceIndex, connections)
  return connections
}

function getTraceConnectionsByRoot({
  positionedSourceNets,
  positionedSourcePorts,
  schematicTraces,
  traceConnectivity,
}: {
  positionedSourceNets: PositionedSourceNet[]
  positionedSourcePorts: PositionedSourcePort[]
  schematicTraces: SchematicTraceGeometry[]
  traceConnectivity: TraceConnectivity
}): Map<TraceRootIndex, SourceTraceConnections> {
  const traceConnectionsByRoot = new Map<
    TraceRootIndex,
    SourceTraceConnections
  >()

  for (const { point, sourcePortId } of positionedSourcePorts) {
    for (const traceIndex of getTraceIndexesAtPoint({
      point,
      schematicTraces,
    })) {
      getOrCreateTraceConnections({
        traceConnectionsByRoot,
        traceConnectivity,
        traceIndex,
      }).sourcePortIds.add(sourcePortId)
    }
  }
  for (const { point, sourceNetId } of positionedSourceNets) {
    for (const traceIndex of getTraceIndexesAtPoint({
      point,
      schematicTraces,
    })) {
      getOrCreateTraceConnections({
        traceConnectionsByRoot,
        traceConnectivity,
        traceIndex,
      }).sourceNetIds.add(sourceNetId)
    }
  }
  return traceConnectionsByRoot
}

export function addSchematicTraceConnectivity(
  circuitJson: CircuitElement[],
): CircuitElement[] {
  const schematicTraces = getSchematicTraceGeometries(circuitJson)
  const traceConnectivity = new TraceConnectivity(schematicTraces.length)
  const positionedSourcePorts = getPositionedSourcePorts(circuitJson)
  const positionedSourceNets = getPositionedSourceNets(circuitJson)

  connectTouchingTraces(schematicTraces, traceConnectivity)
  connectTracesAtPoints({
    points: getSchematicJunctions(circuitJson),
    schematicTraces,
    traceConnectivity,
  })
  connectTracesAtPoints({
    points: positionedSourcePorts.map(({ point }) => point),
    schematicTraces,
    traceConnectivity,
  })
  connectTracesBySourceNet({
    positionedSourceNets,
    schematicTraces,
    traceConnectivity,
  })

  const traceConnectionsByRoot = getTraceConnectionsByRoot({
    positionedSourceNets,
    positionedSourcePorts,
    schematicTraces,
    traceConnectivity,
  })
  const traceConnectionsBySourceTraceId = new Map<
    SourceTraceId,
    SourceTraceConnections
  >()
  for (const schematicTrace of schematicTraces) {
    if (!schematicTrace.sourceTraceId) continue
    const rootTraceIndex = traceConnectivity.getRoot(schematicTrace.traceIndex)
    const connections = traceConnectionsByRoot.get(rootTraceIndex)
    if (connections) {
      traceConnectionsBySourceTraceId.set(
        schematicTrace.sourceTraceId,
        connections,
      )
    }
  }

  return circuitJson.map((element) => {
    if (element.type !== "source_trace") return element
    const sourceTraceId = asString(element.source_trace_id)
    const connections = traceConnectionsBySourceTraceId.get(sourceTraceId)
    return {
      ...element,
      connected_source_net_ids: connections
        ? [...connections.sourceNetIds].sort()
        : [],
      connected_source_port_ids: connections
        ? [...connections.sourcePortIds].sort()
        : [],
    }
  })
}
