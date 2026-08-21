import { expect, test } from "bun:test"
import { createOpenSourceSchematicRoundTrip } from "./fixtures/create-open-source-schematic-round-trip"
import { createSideBySideSvg } from "./fixtures/create-side-by-side-svg"

test("round-trips the open-source HERON PAY-SSM Altium schematic", async () => {
  const result = await createOpenSourceSchematicRoundTrip({
    filename: "heron-pay-ssm-top.SchDoc",
    projectName: "HERON PAY-SSM schematic",
  })

  expect(result.roundTripCounts).toEqual(result.sourceCounts)
  expect(result.roundTripConnectivity).toEqual(result.sourceConnectivity)
  expect(result.roundTripComponentNames).toEqual(result.sourceComponentNames)
  expect(result.roundTripPortNames).toEqual(result.sourcePortNames)
  expect(result.roundTripNetLabelTexts).toEqual(result.sourceNetLabelTexts)
  expect(result.geometryMaxDeltaCircuitUnits).toBeLessThan(0.06)
  expect(result.componentSizeMaxDeltaCircuitUnits).toBeLessThan(0.06)
  expect(result.sourceSupportedPrimitiveTotal).toBeGreaterThan(300)
  expect(
    result.sourceConnectivity.connectedSourcePortIds.length,
  ).toBeGreaterThan(10)
  await expect(
    createSideBySideSvg(result.sourceSvg, result.roundTripSvg),
  ).toMatchSvgSnapshot(import.meta.path)
})
