import { expect, test } from "bun:test"
import { createOpenSourceBoardRoundTrip } from "./fixtures/create-open-source-board-round-trip"

test("round-trips the open-source NodeMCU ESP-12 Altium board", async () => {
  const result = await createOpenSourceBoardRoundTrip({
    boardName: "NodeMCU ESP-12",
    filename: "nodemcu-esp12.PcbDoc",
  })

  expect(result.roundTripCounts).toEqual(result.sourceCounts)
  expect(result.geometryMaxDeltaMm).toBeLessThan(0.03)
  expect(result.rotationMismatchCount).toBe(0)
  expect(result.sourcePrimitiveTotal).toBeGreaterThan(5_000)
  await expect(result.comparisonSvg).toMatchSvgSnapshot(import.meta.path)
})
