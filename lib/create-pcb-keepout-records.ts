import { distance, pcb_keepout, point } from "circuit-json"
import {
  createAltiumFillRecord,
  createAltiumRegionRecord,
  createAltiumTrackRecords,
  createCirclePoints,
} from "./create-pcb-annotation-primitives"
import { asString } from "./format"
import type { CircuitElement, Point, PointTransform } from "./types"

type CreatePcbKeepoutRecordsOptions = {
  circuitJson: CircuitElement[]
  circuitToAltiumPcbPoint: PointTransform
}

export function createPcbKeepoutRecords({
  circuitJson,
  circuitToAltiumPcbPoint,
}: CreatePcbKeepoutRecordsOptions): string[] {
  const records: string[] = []

  for (const element of circuitJson) {
    if (element.type !== "pcb_keepout") continue
    if (element.shape === "outline") {
      records.push(
        ...createPcbKeepoutOutlineRecords({
          circuitToAltiumPcbPoint,
          element,
        }),
      )
      continue
    }
    const keepout = pcb_keepout.parse(element)
    if (keepout.excluded_pcb_component_ids?.length) {
      throw new Error(
        `PCB keepout ${keepout.pcb_keepout_id} excludes components, which Altium primitive keepouts cannot preserve`,
      )
    }
    for (const layer of keepout.layers.map(getAltiumKeepoutLayer)) {
      if (keepout.shape === "rect") {
        records.push(
          createAltiumFillRecord({
            center: keepout.center,
            circuitToAltiumPcbPoint,
            heightMm: keepout.height,
            isKeepout: true,
            layer,
            widthMm: keepout.width,
          }),
        )
        continue
      }
      if (keepout.shape === "circle") {
        records.push(
          createAltiumRegionRecord({
            circuitPoints: createCirclePoints({
              center: keepout.center,
              radiusMm: keepout.radius,
            }),
            circuitToAltiumPcbPoint,
            isKeepout: true,
            layer,
          }),
        )
      }
    }
  }

  return records
}

function createPcbKeepoutOutlineRecords({
  circuitToAltiumPcbPoint,
  element,
}: {
  circuitToAltiumPcbPoint: PointTransform
  element: CircuitElement
}): string[] {
  const keepoutId = asString(element.pcb_keepout_id)
  if (!keepoutId) throw new Error("PCB keepout outline requires an ID")
  if (
    Array.isArray(element.excluded_pcb_component_ids) &&
    element.excluded_pcb_component_ids.length > 0
  ) {
    throw new Error(
      `PCB keepout ${keepoutId} excludes components, which Altium primitive keepouts cannot preserve`,
    )
  }
  const outline = getPcbKeepoutOutline({ element, keepoutId })
  const strokeWidthMm = distance.parse(element.stroke_width)
  if (strokeWidthMm <= 0) {
    throw new Error(`PCB keepout outline ${keepoutId} requires a stroke width`)
  }
  const circuitLayers = getPcbKeepoutOutlineLayers({ element, keepoutId })

  return circuitLayers.flatMap((circuitLayer) =>
    createAltiumTrackRecords({
      circuitPoints: outline,
      circuitToAltiumPcbPoint,
      isKeepout: true,
      layer: getAltiumKeepoutLayer(circuitLayer),
      strokeWidthMm,
    }),
  )
}

function getPcbKeepoutOutline({
  element,
  keepoutId,
}: {
  element: CircuitElement
  keepoutId: string
}): Point[] {
  if (!Array.isArray(element.outline) || element.outline.length < 2) {
    throw new Error(
      `PCB keepout outline ${keepoutId} requires at least two points`,
    )
  }
  return element.outline.map((outlinePoint) => point.parse(outlinePoint))
}

function getPcbKeepoutOutlineLayers({
  element,
  keepoutId,
}: {
  element: CircuitElement
  keepoutId: string
}): string[] {
  if (
    !Array.isArray(element.layers) ||
    element.layers.some((layer) => typeof layer !== "string")
  ) {
    throw new Error(`PCB keepout outline ${keepoutId} requires string layers`)
  }
  return element.layers
}

function getAltiumKeepoutLayer(circuitLayer: string): string {
  const normalizedLayer = circuitLayer.toLowerCase()
  if (normalizedLayer === "top") return "TOP"
  if (normalizedLayer === "bottom") return "BOTTOM"
  if (normalizedLayer === "all" || normalizedLayer === "multilayer") {
    return "KEEPOUT"
  }
  const innerLayerMatch = /^inner(\d+)$/u.exec(normalizedLayer)
  if (innerLayerMatch?.[1]) {
    return `MID-LAYER${Number(innerLayerMatch[1])}`
  }
  throw new Error(`Unsupported PCB keepout layer: ${circuitLayer}`)
}
