import {
  type PcbCopperPour,
  type PointWithBulge,
  pcb_copper_pour,
} from "circuit-json"
import { applyToPoint, compose, rotate, translate } from "transformation-matrix"
import type { PcbNetEntry } from "./create-pcb-net-entries"
import { formatMil, pointsEqual } from "./format"
import type {
  CircuitElement,
  Point,
  PointTransform,
  SourceNetId,
} from "./types"

type CopperPourRings = {
  innerRings: Point[][]
  outerRing: Point[]
}

type CreatePcbCopperPourRecordsOptions = {
  circuitJson: CircuitElement[]
  circuitToAltiumPcbPoint: PointTransform
  netEntries: PcbNetEntry[]
}

const MAXIMUM_ARC_STEP_RADIANS = Math.PI / 24

export function createPcbCopperPourRecords({
  circuitJson,
  circuitToAltiumPcbPoint,
  netEntries,
}: CreatePcbCopperPourRecordsOptions): string[] {
  const netBySourceNetId = new Map<SourceNetId, PcbNetEntry>(
    netEntries.flatMap((netEntry) =>
      netEntry.sourceNetIds.map(
        (sourceNetId) => [sourceNetId, netEntry] as const,
      ),
    ),
  )
  const copperPours = circuitJson.flatMap((element) => {
    if (element.type !== "pcb_copper_pour") return []
    return [pcb_copper_pour.parse(element)]
  })
  const records: string[] = []

  for (const [polygonIndex, copperPour] of copperPours.entries()) {
    const circuitRings = getCopperPourRings(copperPour)
    const altiumRings = {
      outerRing: circuitRings.outerRing.map(circuitToAltiumPcbPoint),
      innerRings: circuitRings.innerRings.map((ring) =>
        ring.map(circuitToAltiumPcbPoint),
      ),
    }
    const layer = getAltiumCopperLayer(copperPour.layer)
    const net = copperPour.source_net_id
      ? netBySourceNetId.get(copperPour.source_net_id)
      : undefined

    records.push(
      createPolygonRecord({
        layer,
        net,
        outerRing: altiumRings.outerRing,
        polygonIndex,
      }),
      createRegionRecord({
        innerRings: altiumRings.innerRings,
        layer,
        net,
        outerRing: altiumRings.outerRing,
        polygonIndex,
      }),
    )

    if (!copperPour.covered_with_solder_mask && isOuterCopperLayer(layer)) {
      records.push(
        createRegionRecord({
          innerRings: altiumRings.innerRings,
          layer: layer === "TOP" ? "TOPSOLDER" : "BOTTOMSOLDER",
          outerRing: altiumRings.outerRing,
        }),
      )
    }
  }

  return records
}

function getCopperPourRings(copperPour: PcbCopperPour): CopperPourRings {
  if (copperPour.shape === "rect") {
    return {
      innerRings: [],
      outerRing: closeRing(getRotatedRectPoints(copperPour)),
    }
  }
  if (copperPour.shape === "polygon") {
    return { innerRings: [], outerRing: closeRing(copperPour.points) }
  }
  return {
    innerRings: copperPour.brep_shape.inner_rings.map((ring) =>
      removeClosingPoint(flattenBulgedRing(ring.vertices)),
    ),
    outerRing: closeRing(
      flattenBulgedRing(copperPour.brep_shape.outer_ring.vertices),
    ),
  }
}

function getRotatedRectPoints(
  copperPour: Extract<PcbCopperPour, { shape: "rect" }>,
): Point[] {
  const centerToCircuit = compose(
    translate(copperPour.center.x, copperPour.center.y),
    rotate(((copperPour.rotation ?? 0) * Math.PI) / 180),
  )
  const halfWidth = copperPour.width / 2
  const halfHeight = copperPour.height / 2
  return [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ].map((corner) => applyToPoint(centerToCircuit, corner))
}

function flattenBulgedRing(vertices: PointWithBulge[]): Point[] {
  const ring = removeClosingPoint(vertices)
  if (ring.length < 3) {
    throw new Error("A PCB copper pour ring requires at least three vertices")
  }
  const points: Point[] = []
  for (const [vertexIndex, start] of ring.entries()) {
    const end = ring[(vertexIndex + 1) % ring.length]
    if (!end) continue
    appendDistinctPoint(points, start)
    for (const point of approximateBulgedSegment({
      bulge: start.bulge ?? 0,
      end,
      start,
    })) {
      appendDistinctPoint(points, point)
    }
  }
  return closeRing(points)
}

function approximateBulgedSegment({
  bulge,
  end,
  start,
}: {
  bulge: number
  end: Point
  start: Point
}): Point[] {
  if (Math.abs(bulge) < 1e-12 || pointsEqual(start, end)) return [end]
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const centerScale = (1 - bulge * bulge) / (4 * bulge)
  const center = {
    x: (start.x + end.x) / 2 - deltaY * centerScale,
    y: (start.y + end.y) / 2 + deltaX * centerScale,
  }
  const radius = Math.hypot(start.x - center.x, start.y - center.y)
  const startAngleRadians = Math.atan2(start.y - center.y, start.x - center.x)
  const sweepRadians = 4 * Math.atan(bulge)
  const segmentCount = Math.max(
    2,
    Math.ceil(Math.abs(sweepRadians) / MAXIMUM_ARC_STEP_RADIANS),
  )
  return Array.from({ length: segmentCount }, (_, segmentIndex) => {
    const angleRadians =
      startAngleRadians + (sweepRadians * (segmentIndex + 1)) / segmentCount
    return {
      x: center.x + radius * Math.cos(angleRadians),
      y: center.y + radius * Math.sin(angleRadians),
    }
  })
}

function closeRing(points: readonly Point[]): Point[] {
  const ring: Point[] = []
  for (const point of points) appendDistinctPoint(ring, point)
  const firstPoint = ring[0]
  if (firstPoint && !pointsEqual(firstPoint, ring.at(-1) ?? firstPoint)) {
    ring.push(firstPoint)
  }
  if (ring.length < 4) {
    throw new Error("A PCB copper pour ring requires at least three vertices")
  }
  return ring
}

function removeClosingPoint<T extends Point>(points: readonly T[]): T[] {
  const ring = [...points]
  const firstPoint = ring[0]
  const lastPoint = ring.at(-1)
  if (firstPoint && lastPoint && pointsEqual(firstPoint, lastPoint)) ring.pop()
  return ring
}

function appendDistinctPoint(points: Point[], point: Point): void {
  const previousPoint = points.at(-1)
  if (!previousPoint || !pointsEqual(previousPoint, point)) points.push(point)
}

function getAltiumCopperLayer(layer: PcbCopperPour["layer"]): string {
  if (layer === "top") return "TOP"
  if (layer === "bottom") return "BOTTOM"
  const innerLayerMatch = /^inner(\d+)$/u.exec(layer)
  if (!innerLayerMatch?.[1]) {
    throw new Error(`Unsupported PCB copper pour layer: ${layer}`)
  }
  return `MID-LAYER${Number(innerLayerMatch[1])}`
}

function isOuterCopperLayer(layer: string): boolean {
  return layer === "TOP" || layer === "BOTTOM"
}

function createPolygonRecord({
  layer,
  net,
  outerRing,
  polygonIndex,
}: {
  layer: string
  net?: PcbNetEntry
  outerRing: Point[]
  polygonIndex: number
}): string {
  return [
    "|RECORD=Polygon",
    `NET=${net?.index ?? 65_535}`,
    `ID=${polygonIndex}`,
    "POLYGONTYPE=Polygon",
    "POUROVERSTYLE=1",
    "HATCHSTYLE=Solid",
    "SELECTION=FALSE",
    `LAYER=${layer}`,
    "LOCKED=FALSE",
    ...createContourFields(outerRing),
  ].join("|")
}

function createRegionRecord({
  innerRings,
  layer,
  net,
  outerRing,
  polygonIndex,
}: {
  innerRings: Point[][]
  layer: string
  net?: PcbNetEntry
  outerRing: Point[]
  polygonIndex?: number
}): string {
  return [
    "|RECORD=Region",
    ...(net ? [`NET=${net.index}`] : []),
    ...(polygonIndex === undefined ? [] : [`POLYGON=${polygonIndex}`]),
    `LAYER=${layer}`,
    "LOCKED=FALSE",
    "KEEPOUT=FALSE",
    "TEARDROP=FALSE",
    "REGIONKIND=COPPER",
    `HOLECOUNT=${innerRings.length}`,
    ...createContourFields(outerRing),
    ...innerRings.flatMap(createHoleFields),
  ].join("|")
}

function createContourFields(points: Point[]): string[] {
  return points.flatMap((point, vertexIndex) => [
    `KIND${vertexIndex}=0`,
    `VX${vertexIndex}=${formatMil(point.x)}`,
    `VY${vertexIndex}=${formatMil(point.y)}`,
  ])
}

function createHoleFields(points: Point[], holeIndex: number): string[] {
  return [
    `HOLE${holeIndex}COUNT=${points.length}`,
    ...points.flatMap((point, vertexIndex) => [
      `HOLE${holeIndex}VX${vertexIndex}=${formatMil(point.x)}`,
      `HOLE${holeIndex}VY${vertexIndex}=${formatMil(point.y)}`,
    ]),
  ]
}
