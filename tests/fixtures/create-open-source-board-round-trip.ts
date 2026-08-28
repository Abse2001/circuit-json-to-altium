import { resolve } from "node:path"
import {
  AltiumBinaryPcbDoc,
  AltiumPcbDoc,
  type AltiumPcbDocument,
  parseAltiumFile,
  serializeAltiumPcbToSvg,
} from "altiumts"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { CircuitJsonToAltiumConverter } from "../../lib"
import type { CircuitElement } from "../../lib/types"
import { convertAltiumPcbToCircuitJson } from "./convert-altium-pcb-to-circuit-json"
import { getPcbRoundTripMetrics } from "./get-pcb-round-trip-metrics"

export type OpenSourceBoardRoundTrip = ReturnType<
  typeof getPcbRoundTripMetrics
> & {
  roundTripSvg: string
  sourceSvg: string
}

type OpenSourceBoardRoundTripOptions = {
  boardName: string
  filename: string
}

function parsePcbDoc(pcbDocBytes: Uint8Array): AltiumPcbDocument {
  const document = parseAltiumFile(pcbDocBytes).document
  if (
    !(document instanceof AltiumPcbDoc) &&
    !(document instanceof AltiumBinaryPcbDoc)
  ) {
    throw new Error(`Expected an Altium PCB document, got ${document.type}`)
  }
  return document
}

function asPositiveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && value > 0 ? value : fallback
}

function createRenderableSourceCircuitJson(
  circuitJson: CircuitElement[],
): CircuitJson {
  return circuitJson.map((element) => {
    if (element.type === "pcb_smtpad") {
      const width = asPositiveNumber(element.width, 1)
      const height = asPositiveNumber(element.height, width)
      const ccwRotation =
        typeof element.ccw_rotation === "number" ? element.ccw_rotation : 0
      if (element.shape === "circle") {
        return Math.abs(width - height) < 1e-9
          ? { ...element, radius: width / 2 }
          : {
              ...element,
              shape: "rotated_pill",
              ccw_rotation: ccwRotation,
            }
      }
      if (element.shape === "rect" && ccwRotation !== 0) {
        return { ...element, shape: "rotated_rect" }
      }
    }

    if (element.type === "pcb_plated_hole") {
      const outerWidth = asPositiveNumber(element.outer_width, 1.6)
      const outerHeight = asPositiveNumber(element.outer_height, outerWidth)
      const holeWidth = asPositiveNumber(element.hole_width, 0.8)
      const holeHeight = asPositiveNumber(element.hole_height, holeWidth)
      const ccwRotation =
        typeof element.ccw_rotation === "number" ? element.ccw_rotation : 0
      const hasCircularHole = Math.abs(holeWidth - holeHeight) < 1e-9
      const hasCircularPad =
        element.shape === "circle" &&
        Math.abs(outerWidth - outerHeight) < 1e-9

      if (hasCircularPad && hasCircularHole) {
        return {
          ...element,
          shape: "circle",
          outer_diameter: outerWidth,
          hole_diameter: holeWidth,
        }
      }
      if (element.shape === "circle") {
        return { ...element, shape: "pill" }
      }
      if (hasCircularHole) {
        return {
          ...element,
          shape: "circular_hole_with_rect_pad",
          hole_diameter: holeWidth,
          rect_pad_width: outerWidth,
          rect_pad_height: outerHeight,
          rect_ccw_rotation: ccwRotation,
        }
      }
      return {
        ...element,
        shape: "rotated_pill_hole_with_rect_pad",
        hole_ccw_rotation: ccwRotation,
        rect_pad_width: outerWidth,
        rect_pad_height: outerHeight,
        rect_ccw_rotation: ccwRotation,
      }
    }

    if (element.type === "pcb_hole") {
      const holeWidth = asPositiveNumber(element.hole_width, 0.8)
      const holeHeight = asPositiveNumber(element.hole_height, holeWidth)
      return Math.abs(holeWidth - holeHeight) < 1e-9
        ? { ...element, hole_shape: "circle", hole_diameter: holeWidth }
        : { ...element, hole_shape: "rotated_pill" }
    }

    return element
  }) as CircuitJson
}

export async function createOpenSourceBoardRoundTrip({
  boardName,
  filename,
}: OpenSourceBoardRoundTripOptions): Promise<OpenSourceBoardRoundTrip> {
  const sourcePath = resolve(
    import.meta.dir,
    "..",
    "..",
    "references",
    filename,
  )
  const sourceBytes = new Uint8Array(await Bun.file(sourcePath).arrayBuffer())
  const sourceDocument = parsePcbDoc(sourceBytes)
  const sourceCircuitJson = convertAltiumPcbToCircuitJson(sourceDocument)
  const converter = new CircuitJsonToAltiumConverter(sourceCircuitJson, {
    projectName: boardName,
  })
  converter.runUntilFinished()
  const generatedPcb = converter.getOutput().pcb
  const generatedBytes = Uint8Array.from(generatedPcb.content)
  const roundTripDocument = parsePcbDoc(generatedBytes)
  const roundTripCircuitJson = convertAltiumPcbToCircuitJson(roundTripDocument)
  const metrics = getPcbRoundTripMetrics({
    roundTripCircuitJson,
    sourceCircuitJson,
  })

  return {
    ...metrics,
    roundTripSvg: serializeAltiumPcbToSvg(roundTripDocument),
    sourceSvg: convertCircuitJsonToPcbSvg(
      createRenderableSourceCircuitJson(sourceCircuitJson),
      { showCourtyards: true },
    ),
  }
}
