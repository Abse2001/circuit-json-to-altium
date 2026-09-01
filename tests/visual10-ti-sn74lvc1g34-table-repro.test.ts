import { expect, test } from "bun:test"
import { readFile } from "node:fs/promises"
import { type AltiumSchDoc, serializeAltiumSheetToSvg } from "altiumts"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import {
  type CircuitElement,
  expectValidSchematic,
  extractArchive,
} from "./fixtures"
import { createSideBySideSvg } from "./fixtures/create-side-by-side-svg"
import { cropSvgViewBox } from "./fixtures/crop-svg-view-box"

const fixtureUrl = new URL(
  "./assets/ti-sn74lvc1g34-buffer-truth-table.circuit.json",
  import.meta.url,
)

function addCanvasBackground(svg: string): string {
  const rootTag = svg.match(/<svg\b[^>]*>/u)?.[0]
  if (!rootTag) throw new Error("Expected an SVG root")
  return svg.replace(
    rootTag,
    `${rootTag}\n  <rect width="100%" height="100%" fill="rgb(245, 241, 237)"/>`,
  )
}

test("reproduces the missing truth table on the TI SN74LVC1G34 buffer", async () => {
  const circuitJson = JSON.parse(
    await readFile(fixtureUrl, "utf8"),
  ) as CircuitJson
  const sourceComponent = circuitJson.find(
    (element) => element.type === "source_component",
  )
  const tables = circuitJson.filter(
    (element) => element.type === "schematic_table",
  )
  const tableCells = circuitJson.filter(
    (element) => element.type === "schematic_table_cell",
  )
  const sourceRectangles = circuitJson.filter(
    (element) => element.type === "schematic_rect",
  )
  expect(sourceComponent?.manufacturer_part_number).toBe("SN74LVC1G34DBVR")
  expect(tables).toHaveLength(1)
  expect(tables[0]?.anchor).toBe("top_left")
  expect(tables[0]?.cell_padding).toBe(0.1)
  expect(tableCells).toHaveLength(6)

  const { schematics } = await extractArchive(circuitJson as CircuitElement[])
  const schematic = schematics[0] as AltiumSchDoc
  expectValidSchematic(schematic)

  const rootRectangles = schematic
    .getRecordsByKind("14")
    .filter((record) => schematic.getParent(record) === undefined)
  expect(rootRectangles).toHaveLength(sourceRectangles.length)

  const tableElements = [...tables, ...tableCells]
  const { schematics: tableSchematics } = await extractArchive(
    tableElements as CircuitElement[],
  )
  const tableSchematic = tableSchematics[0] as AltiumSchDoc
  expect(
    tableSchematic
      .getRecordsByKind("14")
      .filter((record) => tableSchematic.getParent(record) === undefined),
  ).toHaveLength(0)

  const sourceSvg = await convertCircuitJsonToSchematicSvg(circuitJson)
  const altiumSvg = cropSvgViewBox(
    serializeAltiumSheetToSvg(schematic, {
      backgroundColor: "rgb(245, 241, 237)",
      height: 600,
      margin: 0,
      showBorder: false,
      width: 1200,
    }),
    { x: 85, y: 100, width: 240, height: 120 },
  )
  await expect(
    addCanvasBackground(createSideBySideSvg(sourceSvg, altiumSvg)),
  ).toMatchSvgSnapshot(import.meta.path)
})
