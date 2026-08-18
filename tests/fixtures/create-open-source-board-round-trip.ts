import { resolve } from "node:path"
import { Parser } from "altium-toolkit"
import { parseAltiumBinaryPcbDoc, serializeAltiumPcbToSvg } from "altiumts"
import { CircuitJsonToAltiumConverter } from "../../lib"
import type { CircuitElement } from "../../lib/types"
import { getPcbRoundTripMetrics } from "./get-pcb-round-trip-metrics"

type IndependentAltiumDocument = Record<string, unknown> & {
  model: CircuitElement[]
}

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

async function parsePcbDoc(
  filename: string,
  pcbDocBytes: ArrayBuffer,
): Promise<IndependentAltiumDocument> {
  return (await Parser.parseAsync(
    { data: pcbDocBytes, fileName: filename },
    { worker: false },
  )) as IndependentAltiumDocument
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
  const sourceDocument = await parsePcbDoc(filename, sourceBytes.buffer)
  const converter = new CircuitJsonToAltiumConverter(sourceDocument.model, {
    projectName: boardName,
  })
  converter.runUntilFinished()
  const generatedPcb = converter.getOutput().pcb
  const generatedBytes = Uint8Array.from(generatedPcb.content)
  const generatedDocument = await parsePcbDoc(
    generatedPcb.filename,
    generatedBytes.buffer,
  )
  const metrics = getPcbRoundTripMetrics({
    roundTripCircuitJson: generatedDocument.model,
    sourceCircuitJson: sourceDocument.model,
  })

  return {
    ...metrics,
    roundTripSvg: renderPcbDoc(generatedBytes),
    sourceSvg: renderPcbDoc(sourceBytes),
  }
}
