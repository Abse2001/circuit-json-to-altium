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
import { cropSvgViewBox } from "./fixtures/crop-svg-view-box"

const fixtureUrl = new URL(
  "./assets/sparkfun-mini-spectral-uv-sensor-as7331-qwiic.circuit.json",
  import.meta.url,
)

function cropSourceTable(sourceSvg: string): string {
  const rootTag = sourceSvg.match(/<svg\b[^>]*>/u)?.[0]
  if (!rootTag) throw new Error("Expected an SVG root")
  const viewportWidth = Number(rootTag.match(/\bwidth="([\d.]+)"/u)?.[1])
  const viewportHeight = Number(rootTag.match(/\bheight="([\d.]+)"/u)?.[1])
  if (!(viewportWidth > 0) || !(viewportHeight > 0)) {
    throw new Error("Expected a numeric SVG viewport")
  }
  const sourceSvgWithViewBox = /\bviewBox=/u.test(rootTag)
    ? sourceSvg
    : sourceSvg.replace(
        rootTag,
        rootTag.replace(
          ">",
          ` viewBox="0 0 ${viewportWidth} ${viewportHeight}">`,
        ),
      )
  const border = sourceSvg.match(
    /<rect class="sch-table-border" x="([\d.-]+)" y="([\d.-]+)" width="([\d.-]+)" height="([\d.-]+)"/u,
  )
  if (!border) throw new Error("Expected a schematic table border")
  const [, xText, yText, widthText, heightText] = border
  const x = Number(xText)
  const y = Number(yText)
  const width = Number(widthText)
  const height = Number(heightText)
  const padding = Math.max(width, height) * 0.12
  return cropSvgViewBox(sourceSvgWithViewBox, {
    x: x - padding,
    y: y - padding,
    width: width + padding * 2,
    height: height + padding * 2,
  })
}

function createPositionAndDetailComparison({
  detailAltiumSvg,
  detailSourceSvg,
  fullAltiumSvg,
  fullSourceSvg,
}: {
  detailAltiumSvg: string
  detailSourceSvg: string
  fullAltiumSvg: string
  fullSourceSvg: string
}): string {
  const toDataUrl = (svg: string) =>
    `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
  const sourceSize = fullSourceSvg.match(
    /<svg\b[^>]*\bwidth="([\d.]+)"[^>]*\bheight="([\d.]+)"/u,
  )
  if (!sourceSize) throw new Error("Expected a numeric source SVG size")
  const width = Number(sourceSize[1])
  const height = Number(sourceSize[2])
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * 2}" height="${height * 2}" viewBox="0 0 ${width * 2} ${height * 2}">
  <rect width="100%" height="100%" fill="rgb(245, 241, 237)"/>
  <image x="0" y="0" width="${width}" height="${height}" href="${toDataUrl(fullSourceSvg)}"/>
  <image x="${width}" y="0" width="${width}" height="${height}" href="${toDataUrl(fullAltiumSvg)}"/>
  <image x="0" y="${height}" width="${width}" height="${height}" href="${toDataUrl(detailSourceSvg)}"/>
  <image x="${width}" y="${height}" width="${width}" height="${height}" href="${toDataUrl(detailAltiumSvg)}"/>
</svg>`
}

test("reproduces missing tables on the open-source SparkFun AS7331 schematic", async () => {
  const circuitJson = JSON.parse(
    await readFile(fixtureUrl, "utf8"),
  ) as CircuitJson
  const tables = circuitJson.filter(
    (element) => element.type === "schematic_table",
  )
  const tableCells = circuitJson.filter(
    (element) => element.type === "schematic_table_cell",
  )
  const sourceRectangles = circuitJson.filter(
    (element) => element.type === "schematic_rect",
  )
  expect(tables).toHaveLength(1)
  expect(tables[0]?.cell_padding).toBe(0.08)
  expect(tableCells).toHaveLength(15)

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

  const fullSourceSvg = await convertCircuitJsonToSchematicSvg(circuitJson)
  const fullAltiumSvg = serializeAltiumSheetToSvg(schematic, {
    backgroundColor: "rgb(245, 241, 237)",
    height: 600,
    margin: 0,
    showBorder: false,
    width: 1200,
  })
  const detailSourceSvg = cropSourceTable(
    await convertCircuitJsonToSchematicSvg(tableElements as CircuitJson),
  )
  const detailAltiumSvg = serializeAltiumSheetToSvg(tableSchematic, {
    backgroundColor: "rgb(245, 241, 237)",
    height: 600,
    margin: 0,
    showBorder: false,
    width: 1200,
  })
  await expect(
    createPositionAndDetailComparison({
      detailAltiumSvg,
      detailSourceSvg,
      fullAltiumSvg,
      fullSourceSvg,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
