import { expect, test } from "bun:test"
import { createOpenSourceBoardRoundTrip } from "./fixtures/create-open-source-board-round-trip"

test("round-trips the open-source Elk Pi Altium board", async () => {
  const result = await createOpenSourceBoardRoundTrip({
    boardName: "Elk Pi",
    filename: "elk-pi.PcbDoc",
  })

  expect(result.roundTripCounts).toEqual(result.sourceCounts)
  expect(result.geometryMaxDeltaMm).toBeLessThan(0.03)
  expect(result.rotationMismatchCount).toBe(0)
  expect(result.sourcePrimitiveTotal).toBeGreaterThan(5_000)
  await expect(result.comparisonSvg).toMatchSvgSnapshot(import.meta.path)
})
