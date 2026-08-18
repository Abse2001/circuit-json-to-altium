import { expect, test } from "bun:test"
import { createOpenSourceBoardRoundTrip } from "./fixtures/create-open-source-board-round-trip"
import { createSideBySideSvg } from "./fixtures/create-side-by-side-svg"

test("round-trips the open-source Novena eDP adapter Altium board", async () => {
  const result = await createOpenSourceBoardRoundTrip({
    boardName: "Novena eDP Adapter",
    filename: "novena-edp-adapter.PcbDoc",
  })

  expect(result.roundTripCounts).toEqual(result.sourceCounts)
  expect(result.geometryMaxDeltaMm).toBeLessThan(0.03)
  expect(result.rotationMismatchCount).toBe(0)
  expect(result.sourcePrimitiveTotal).toBeGreaterThan(5_000)
  await expect(
    createSideBySideSvg(result.sourceSvg, result.roundTripSvg),
  ).toMatchSvgSnapshot(import.meta.path)
})
