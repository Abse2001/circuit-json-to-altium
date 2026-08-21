import { resolve } from "node:path"
import {
  AltiumSchDoc,
  parseAltiumFile,
  serializeAltiumSheetToSvg,
} from "altiumts"
import { CircuitJsonToAltiumConverter } from "../../lib"
import { convertAltiumSchematicToCircuitJson } from "./convert-altium-schematic-to-circuit-json"
import { getSchematicRoundTripMetrics } from "./get-schematic-round-trip-metrics"

export type OpenSourceSchematicRoundTrip = ReturnType<
  typeof getSchematicRoundTripMetrics
> & {
  roundTripOffSheetPortFontSizePoints: number[]
  roundTripSvg: string
  sourceOffSheetPortFontSizePoints: number[]
  sourceSvg: string
}

type OpenSourceSchematicRoundTripOptions = {
  filename: string
  projectName: string
}

const ALTIUM_SCHEMATIC_PORT_FALLBACK_FONT_SIZE_POINTS = 8

function getOffSheetPortFontSizePoints(document: AltiumSchDoc): number[] {
  const sheetRecord = document.getRecordsByKind("31")[0]
  return document.ports.map((port) => {
    const fontId = Math.max(Math.round(port.getNumber("FONTID") ?? 1), 1)
    return (
      sheetRecord?.getNumber(`SIZE${fontId}`) ??
      ALTIUM_SCHEMATIC_PORT_FALLBACK_FONT_SIZE_POINTS
    )
  })
}

function parseSchematicDocument(schematicBytes: Uint8Array): AltiumSchDoc {
  const document = parseAltiumFile(schematicBytes).document
  if (!(document instanceof AltiumSchDoc)) {
    throw new Error(
      `Expected an Altium schematic document, got ${document.type}`,
    )
  }
  return document
}

export async function createOpenSourceSchematicRoundTrip({
  filename,
  projectName,
}: OpenSourceSchematicRoundTripOptions): Promise<OpenSourceSchematicRoundTrip> {
  const sourcePath = resolve(
    import.meta.dir,
    "..",
    "..",
    "references",
    filename,
  )
  const sourceBytes = new Uint8Array(await Bun.file(sourcePath).arrayBuffer())
  const sourceDocument = parseSchematicDocument(sourceBytes)
  const sourceCircuitJson = convertAltiumSchematicToCircuitJson(sourceDocument)
  const converter = new CircuitJsonToAltiumConverter(sourceCircuitJson, {
    projectName,
  })
  converter.runUntilFinished()
  const generatedSchematic = converter.getOutput().schematics[0]
  if (!generatedSchematic) {
    throw new Error("Converter did not create a schematic document")
  }
  const roundTripDocument = parseSchematicDocument(generatedSchematic.content)
  const roundTripCircuitJson =
    convertAltiumSchematicToCircuitJson(roundTripDocument)

  return {
    ...getSchematicRoundTripMetrics({
      roundTripCircuitJson,
      sourceCircuitJson,
    }),
    roundTripOffSheetPortFontSizePoints:
      getOffSheetPortFontSizePoints(roundTripDocument),
    roundTripSvg: serializeAltiumSheetToSvg(roundTripDocument),
    sourceOffSheetPortFontSizePoints:
      getOffSheetPortFontSizePoints(sourceDocument),
    sourceSvg: serializeAltiumSheetToSvg(sourceDocument),
  }
}
