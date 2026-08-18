import { expect, test } from "bun:test"
import { createOpenSourceBoardRoundTrip } from "./fixtures/create-open-source-board-round-trip"

test("round-trips the open-source EBAZ4205 Altium board", async () => {
  const result = await createOpenSourceBoardRoundTrip({
    boardName: "EBAZ4205",
    filename: "ebaz4205.PcbDoc",
  })

  expect(result.roundTripCounts).toEqual(result.sourceCounts)
  expect(result.geometryMaxDeltaMm).toBeLessThan(0.03)
  expect(result.rotationMismatchCount).toBe(0)
  expect(result.sourcePrimitiveTotal).toBeGreaterThan(5_000)
  await expect(result.sourceSvg).toMatchSvgSnapshot(import.meta.path, "source")
  await expect(result.roundTripSvg).toMatchSvgSnapshot(
    import.meta.path,
    "round-trip",
  )
})
