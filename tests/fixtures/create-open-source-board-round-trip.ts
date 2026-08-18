import { resolve } from "node:path"
import { parseAltiumBinaryPcbDoc, serializeAltiumPcbToSvg } from "altiumts"
import { CircuitJsonToAltiumConverter } from "../../lib"
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

function renderPcbDoc(pcbDocBytes: Uint8Array): string {
  return serializeAltiumPcbToSvg(parseAltiumBinaryPcbDoc(pcbDocBytes))
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
  const sourceDocument = parseAltiumBinaryPcbDoc(sourceBytes)
  const sourceCircuitJson = convertAltiumPcbToCircuitJson(sourceDocument)
  const converter = new CircuitJsonToAltiumConverter(sourceCircuitJson, {
    projectName: boardName,
  })
  converter.runUntilFinished()
  const generatedPcb = converter.getOutput().pcb
  const generatedBytes = Uint8Array.from(generatedPcb.content)
  const roundTripCircuitJson = convertAltiumPcbToCircuitJson(
    parseAltiumBinaryPcbDoc(generatedBytes),
  )
  const metrics = getPcbRoundTripMetrics({
    roundTripCircuitJson,
    sourceCircuitJson,
  })

  return {
    ...metrics,
    roundTripSvg: renderPcbDoc(generatedBytes),
    sourceSvg: renderPcbDoc(sourceBytes),
  }
}
