import { resolve } from "node:path"
import { Parser, PcbSvgRenderer } from "altium-toolkit"
import { CircuitJsonToAltiumConverter } from "../../lib"
import type { CircuitElement } from "../../lib/types"
import { createAltiumRoundTripComparisonSvg } from "./create-altium-round-trip-comparison-svg"
import { getPcbRoundTripMetrics } from "./get-pcb-round-trip-metrics"

type IndependentAltiumDocument = Record<string, unknown> & {
  model: CircuitElement[]
}

export type OpenSourceBoardRoundTrip = ReturnType<
  typeof getPcbRoundTripMetrics
> & {
  comparisonSvg: string
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
  const sourceDocument = await parsePcbDoc(
    filename,
    await Bun.file(sourcePath).arrayBuffer(),
  )
  const converter = new CircuitJsonToAltiumConverter(sourceDocument.model, {
    projectName: boardName,
  })
  converter.runUntilFinished()
  const generatedPcb = converter.getOutput().pcb
  const generatedDocument = await parsePcbDoc(
    generatedPcb.filename,
    Uint8Array.from(generatedPcb.content).buffer,
  )
  const metrics = getPcbRoundTripMetrics({
    roundTripCircuitJson: generatedDocument.model,
    sourceCircuitJson: sourceDocument.model,
  })

  return {
    ...metrics,
    comparisonSvg: createAltiumRoundTripComparisonSvg({
      boardName,
      generatedAltiumSvg: PcbSvgRenderer.render(generatedDocument),
      originalAltiumSvg: PcbSvgRenderer.render(sourceDocument),
      primitiveCounts: metrics.sourceCounts,
    }),
  }
}
