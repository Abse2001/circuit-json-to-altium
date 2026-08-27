import {
  AltiumComponentBodyRecord,
  type AltiumComponentRecord,
  type AltiumPcbDocument,
  type AltiumPoint,
  getPcbContour,
} from "altiumts"
import type { CircuitElement } from "../../lib/types"

type AxisAlignedRectangle = {
  center: AltiumPoint
  heightMils: number
  widthMils: number
}

type ConvertAltiumPcbComponentBodiesInput = {
  componentIds: Map<AltiumComponentRecord, string>
  document: AltiumPcbDocument
  toCircuitLength: (mils: number) => number
  toCircuitPoint: (point: AltiumPoint) => { x: number; y: number }
}

export function convertAltiumPcbComponentBodiesToCircuitJson({
  componentIds,
  document,
  toCircuitLength,
  toCircuitPoint,
}: ConvertAltiumPcbComponentBodiesInput): CircuitElement[] {
  const elements: CircuitElement[] = []
  for (const [bodyIndex, body] of document
    .getRecordsByKind("ComponentBody")
    .entries()) {
    if (!(body instanceof AltiumComponentBodyRecord)) continue
    const rectangle = getAxisAlignedRectangle(body)
    const component = document.getComponentForRecord(body)
    const pcbComponentId = component ? componentIds.get(component) : undefined
    if (!rectangle || !pcbComponentId) continue

    const layer = body.getDecoded("LAYER")?.toUpperCase().includes("14")
      ? "bottom"
      : "top"
    const heightMils = body.overallHeightMils ?? 0
    const standoffHeightMils = body.standoffHeightMils ?? 0
    const center = toCircuitPoint(rectangle.center)
    const bodyCenterDistanceFromBoardSurfaceMm = toCircuitLength(
      standoffHeightMils + heightMils / 2,
    )

    elements.push({
      type: "cad_component",
      cad_component_id: `cad_component_${bodyIndex}`,
      pcb_component_id: pcbComponentId,
      source_component_id: pcbComponentId.replace(
        "pcb_component",
        "source_component",
      ),
      position: {
        ...center,
        z:
          layer === "bottom"
            ? -bodyCenterDistanceFromBoardSurfaceMm
            : bodyCenterDistanceFromBoardSurfaceMm,
      },
      rotation: { x: 0, y: 0, z: 0 },
      size: {
        x: toCircuitLength(rectangle.widthMils),
        y: toCircuitLength(rectangle.heightMils),
        z: toCircuitLength(heightMils),
      },
      layer,
      anchor_alignment: "center",
      model_object_fit: "contain_within_bounds",
      ...(body.opacity !== undefined && body.opacity < 1
        ? { show_as_translucent_model: true }
        : {}),
    })
  }
  return elements
}

function getAxisAlignedRectangle(
  body: AltiumComponentBodyRecord,
): AxisAlignedRectangle | undefined {
  const points = getPcbContour(body).points
  const uniquePoints = points.filter(
    (point, pointIndex) =>
      points.findIndex(
        (candidate) => candidate.x === point.x && candidate.y === point.y,
      ) === pointIndex,
  )
  if (uniquePoints.length !== 4) return undefined

  const xCoordinates = [...new Set(uniquePoints.map((point) => point.x))]
  const yCoordinates = [...new Set(uniquePoints.map((point) => point.y))]
  if (xCoordinates.length !== 2 || yCoordinates.length !== 2) return undefined
  if (
    !xCoordinates.every((x) =>
      yCoordinates.every((y) =>
        uniquePoints.some((point) => point.x === x && point.y === y),
      ),
    )
  ) {
    return undefined
  }

  const minX = Math.min(...xCoordinates)
  const maxX = Math.max(...xCoordinates)
  const minY = Math.min(...yCoordinates)
  const maxY = Math.max(...yCoordinates)
  return {
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    heightMils: maxY - minY,
    widthMils: maxX - minX,
  }
}
