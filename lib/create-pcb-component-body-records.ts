import { applyToPoint, compose, rotate, translate } from "transformation-matrix"
import {
  asNumber,
  asPoint,
  asString,
  byType,
  formatMil,
  isCircuitElement,
  MILLIMETERS_TO_MILS,
} from "./format"
import type {
  CircuitElement,
  PcbComponentId,
  Point,
  PointTransform,
} from "./types"

type Point3 = Point & { z: number }

type CreatePcbComponentBodyRecordsInput = {
  circuitJson: CircuitElement[]
  circuitToAltiumPcbPoint: PointTransform
  componentIndex: Map<PcbComponentId, number>
}

export function createPcbComponentBodyRecords({
  circuitJson,
  circuitToAltiumPcbPoint,
  componentIndex,
}: CreatePcbComponentBodyRecordsInput): string[] {
  const boardThicknessMm = getBoardThicknessMm(circuitJson)
  const records: string[] = []

  for (const cadComponent of byType(circuitJson, "cad_component")) {
    const altiumComponentIndex = componentIndex.get(
      asString(cadComponent.pcb_component_id),
    )
    if (altiumComponentIndex === undefined) continue

    const position = asPoint3(cadComponent.position)
    const size = asPoint3(cadComponent.size)
    if (!position || !size) continue
    assertValidBodySize(size, asString(cadComponent.cad_component_id))

    const layer = getCadComponentLayer(cadComponent)
    const bodyOutline = createBodyOutline({
      position,
      rotationDegrees: getCadComponentRotationDegrees(cadComponent),
      size,
    }).map(circuitToAltiumPcbPoint)
    const bodyStandoffHeightMm = getBodyStandoffHeightMm({
      boardThicknessMm,
      layer,
      positionZMm: position.z,
      sizeZMm: size.z,
    })

    records.push(
      [
        "|RECORD=ComponentBody",
        `LAYER=${layer === "bottom" ? "MECHANICAL14" : "MECHANICAL13"}`,
        "LOCKED=FALSE",
        "KEEPOUT=FALSE",
        "NET=65535",
        "POLYGON=65535",
        `COMPONENT=${altiumComponentIndex}`,
        "TEARDROP=FALSE",
        "HOLECOUNT=0",
        "ISSHAPEBASED=TRUE",
        "KIND=0",
        `STANDOFFHEIGHT=${formatMil(bodyStandoffHeightMm * MILLIMETERS_TO_MILS)}`,
        `OVERALLHEIGHT=${formatMil(size.z * MILLIMETERS_TO_MILS)}`,
        `BODYOPACITY3D=${cadComponent.show_as_translucent_model === true ? "0.5" : "1"}`,
        `V7_LAYER=${layer === "bottom" ? "14" : "13"}`,
        ...bodyOutline.flatMap((point, pointIndex) => [
          `KIND${pointIndex}=0`,
          `VX${pointIndex}=${formatMil(point.x)}`,
          `VY${pointIndex}=${formatMil(point.y)}`,
        ]),
      ].join("|"),
    )
  }

  return records
}

function asPoint3(input: unknown): Point3 | undefined {
  if (!isCircuitElement(input)) return undefined
  const point = asPoint(input)
  if (!point || typeof input.z !== "number" || !Number.isFinite(input.z)) {
    return undefined
  }
  return { ...point, z: input.z }
}

function assertValidBodySize(size: Point3, cadComponentId: string): void {
  if (size.x > 0 && size.y > 0 && size.z >= 0) return
  throw new Error(
    `CAD component ${JSON.stringify(cadComponentId)} has an invalid body size`,
  )
}

function createBodyOutline({
  position,
  rotationDegrees,
  size,
}: {
  position: Point3
  rotationDegrees: number
  size: Point3
}): Point[] {
  const localToCircuit = compose(
    translate(position.x, position.y),
    rotate((rotationDegrees * Math.PI) / 180),
  )
  const halfWidthMm = size.x / 2
  const halfHeightMm = size.y / 2
  const localOutline = [
    { x: -halfWidthMm, y: -halfHeightMm },
    { x: halfWidthMm, y: -halfHeightMm },
    { x: halfWidthMm, y: halfHeightMm },
    { x: -halfWidthMm, y: halfHeightMm },
    { x: -halfWidthMm, y: -halfHeightMm },
  ]
  return localOutline.map((point) => applyToPoint(localToCircuit, point))
}

function getBoardThicknessMm(circuitJson: CircuitElement[]): number {
  const board = byType(circuitJson, "pcb_board")[0]
  return Math.max(asNumber(board?.thickness), 0)
}

function getCadComponentLayer(cadComponent: CircuitElement): "bottom" | "top" {
  return asString(cadComponent.layer).toLowerCase() === "bottom"
    ? "bottom"
    : "top"
}

function getCadComponentRotationDegrees(cadComponent: CircuitElement): number {
  if (!isCircuitElement(cadComponent.rotation)) return 0
  return asNumber(cadComponent.rotation.z)
}

function getBodyStandoffHeightMm({
  boardThicknessMm,
  layer,
  positionZMm,
  sizeZMm,
}: {
  boardThicknessMm: number
  layer: "bottom" | "top"
  positionZMm: number
  sizeZMm: number
}): number {
  const boardSurfaceZMm =
    layer === "bottom" ? -boardThicknessMm / 2 : boardThicknessMm / 2
  const outwardDistanceMm =
    layer === "bottom"
      ? boardSurfaceZMm - positionZMm
      : positionZMm - boardSurfaceZMm
  return outwardDistanceMm - sizeZMm / 2
}
