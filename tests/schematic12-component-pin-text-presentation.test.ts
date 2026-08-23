import { expect, test } from "bun:test"
import type { AltiumRecord } from "altiumts"
import { getSchematicTransform } from "../lib/get-schematic-transform"
import {
  board,
  type CircuitElement,
  expectValidSchematic,
  extractArchive,
  sourceComponent,
  sourcePort,
} from "./fixtures"
import { getRecordLocation } from "./fixtures/altium-schematic-coordinate-utils"

function getFontSizePoints({
  fontId,
  sheetRecord,
}: {
  fontId: number | undefined
  sheetRecord: AltiumRecord
}): number | undefined {
  return sheetRecord.getNumber(`SIZE${fontId ?? 1}`)
}

test("preserves component and pin text presentation", async () => {
  const elements: CircuitElement[] = [
    board(),
    sourceComponent("source_capacitor", "C1"),
    sourcePort({
      sourcePortId: "source_port_1",
      sourceComponentId: "source_capacitor",
      pinNumber: 1,
    }),
    sourcePort({
      sourcePortId: "source_port_2",
      sourceComponentId: "source_capacitor",
      pinNumber: 2,
    }),
    {
      type: "schematic_component",
      schematic_component_id: "schematic_capacitor",
      source_component_id: "source_capacitor",
      center: { x: 0, y: 0 },
      size: { width: 2, height: 1 },
      symbol_display_value: "10uF",
    },
    {
      type: "schematic_text",
      schematic_text_id: "schematic_text_designator",
      schematic_component_id: "schematic_capacitor",
      text: "C1",
      position: { x: -0.8, y: 0.8 },
      font_size: 0.5,
      rotation: -90,
      anchor: "top_right",
      color: "#123456",
    },
    {
      type: "schematic_text",
      schematic_text_id: "schematic_text_value",
      schematic_component_id: "schematic_capacitor",
      text: "10uF",
      position: { x: 0.8, y: -0.8 },
      font_size: 0.45,
      rotation: 0,
      anchor: "center",
      color: "#654321",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_1",
      schematic_component_id: "schematic_capacitor",
      source_port_id: "source_port_1",
      center: { x: -1, y: 0 },
      facing_direction: "left",
      distance_from_component_edge: 0.2,
      display_pin_label: "positive",
      pin_number: 1,
      is_pin_name_visible: true,
      is_pin_number_visible: false,
      pin_text_font_size: 0.35,
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_2",
      schematic_component_id: "schematic_capacitor",
      source_port_id: "source_port_2",
      center: { x: 1, y: 0 },
      facing_direction: "right",
      distance_from_component_edge: 0.2,
      display_pin_label: "negative",
      pin_number: 2,
      is_pin_name_visible: false,
      is_pin_number_visible: true,
      pin_text_font_size: 0.4,
    },
  ]
  const schematicElements = elements.filter(
    (element) => element.type?.startsWith("schematic_") === true,
  )
  const pointTransform =
    getSchematicTransform(schematicElements).circuitToAltiumSchematicPoint
  const expectedDesignatorPosition = pointTransform({ x: -0.8, y: 0.8 })
  const expectedValuePosition = pointTransform({ x: 0.8, y: -0.8 })

  const { schematics } = await extractArchive(elements)
  const schematic = schematics[0]
  if (!schematic) throw new Error("Expected one generated schematic")
  const sheetRecord = schematic.getRecordsByKind("31")[0]
  const component = schematic.components[0]
  if (!sheetRecord || !component) {
    throw new Error("Expected a sheet record and one component")
  }
  const ownedRecords = schematic.getOwnedRecords(component)
  const designator = ownedRecords.find((record) => record.recordKind === "34")
  const value = ownedRecords.find((record) => record.recordKind === "41")
  const pins = ownedRecords.filter((record) => record.recordKind === "2")
  expect({
    designator: {
      color: designator?.getNumber("COLOR"),
      fontSizePoints: getFontSizePoints({
        fontId: designator?.getNumber("FONTID"),
        sheetRecord,
      }),
      justification: designator?.getNumber("JUSTIFICATION"),
      orientation: designator?.getNumber("ORIENTATION"),
      position: designator ? getRecordLocation(designator) : undefined,
    },
    pins: pins.map((pin) => ({
      fontSizePoints: getFontSizePoints({
        fontId: pin.getNumber("FONTID"),
        sheetRecord,
      }),
      pinConglomerate: pin.getNumber("PINCONGLOMERATE"),
    })),
    value: {
      color: value?.getNumber("COLOR"),
      fontSizePoints: getFontSizePoints({
        fontId: value?.getNumber("FONTID"),
        sheetRecord,
      }),
      justification: value?.getNumber("JUSTIFICATION"),
      orientation: value?.getNumber("ORIENTATION"),
      position: value ? getRecordLocation(value) : undefined,
    },
  }).toEqual({
    designator: {
      color: 0x56_34_12,
      fontSizePoints: 10,
      justification: 8,
      orientation: 1,
      position: expectedDesignatorPosition,
    },
    pins: [
      { fontSizePoints: 7, pinConglomerate: 42 },
      { fontSizePoints: 8, pinConglomerate: 48 },
    ],
    value: {
      color: 0x21_43_65,
      fontSizePoints: 9,
      justification: 4,
      orientation: 0,
      position: expectedValuePosition,
    },
  })
  expectValidSchematic(schematic)
})
