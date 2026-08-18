import { expect, test } from "bun:test"
import { createSideBySideSvg } from "./fixtures/create-side-by-side-svg"

test("places two unchanged SVGs side by side at their declared sizes", () => {
  const sourceSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="20"><rect width="10" height="20" fill="red"/></svg>'
  const roundTripSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8"><circle cx="6" cy="4" r="4" fill="blue"/></svg>'
  const combinedSvg = createSideBySideSvg(sourceSvg, roundTripSvg)
  const embeddedSvgs = [
    ...combinedSvg.matchAll(/href="data:image\/svg\+xml;base64,([^"]+)"/gu),
  ].map((match) => Buffer.from(match[1] ?? "", "base64").toString())

  expect(embeddedSvgs).toEqual([sourceSvg, roundTripSvg])
  expect(combinedSvg).toContain('width="22" height="20" viewBox="0 0 22 20"')
  expect(combinedSvg).toContain('<image x="0" y="0" width="10" height="20"')
  expect(combinedSvg).toContain('<image x="10" y="0" width="12" height="8"')
})
