import { expect, test } from "bun:test"
import {
  board,
  type CircuitElement,
  expectValidSchematic,
  extractArchive,
  sourceComponent,
} from "./fixtures"

test("omits graphic-only child sheets without removing ordinary empty sheets", async () => {
  const elements: CircuitElement[] = [
    board(),
    {
      type: "schematic_sheet",
      schematic_sheet_id: "graphic-sheet",
      name: "graphic_only",
      sheet_index: 0,
    },
    {
      type: "schematic_graphic",
      schematic_graphic_id: "system-diagram",
      schematic_sheet_id: "graphic-sheet",
      asset: {
        project_relative_path: "inline",
        url: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E",
        mimetype: "image/svg+xml",
      },
    },
    {
      type: "schematic_sheet",
      schematic_sheet_id: "empty-sheet",
      name: "empty",
      sheet_index: 1,
    },
    {
      type: "schematic_sheet",
      schematic_sheet_id: "detail-sheet",
      name: "detail",
      sheet_index: 2,
    },
    sourceComponent("source-component", "U1"),
    {
      type: "schematic_component",
      schematic_component_id: "schematic-component",
      schematic_sheet_id: "detail-sheet",
      source_component_id: "source-component",
      center: { x: 0, y: 0 },
    },
  ]

  const result = await extractArchive(elements, "graphic-only")
  expect(result.schematicSources.map(({ filename }) => filename)).toEqual([
    "graphic-only-01.SchDoc",
    "graphic-only-02.SchDoc",
    "graphic-only.SchDoc",
  ])
  const rootSchematic = result.schematics.find(
    (_, index) =>
      result.schematicSources[index]?.filename === "graphic-only.SchDoc",
  )
  expect(
    rootSchematic?.sheetLinks.map(({ fileName, name }) => ({ fileName, name })),
  ).toEqual([
    { fileName: "graphic-only-01.SchDoc", name: "empty" },
    { fileName: "graphic-only-02.SchDoc", name: "detail" },
  ])
  for (const schematic of result.schematics) expectValidSchematic(schematic)
})
