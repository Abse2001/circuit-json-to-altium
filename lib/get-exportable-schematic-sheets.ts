import { asString, byType } from "./format"
import type {
  CircuitElement,
  NormalizedCircuitJson,
  SchematicSheetId,
} from "./types"

function isEditableSchematicElement(element: CircuitElement): boolean {
  const elementType = element.type ?? ""
  return (
    elementType.startsWith("schematic_") &&
    elementType !== "schematic_sheet" &&
    elementType !== "schematic_graphic" &&
    !elementType.endsWith("_warning") &&
    !elementType.endsWith("_error")
  )
}

export function getExportableSchematicSheets(
  circuitJson: NormalizedCircuitJson,
): CircuitElement[] {
  const sheetIdsWithGraphics = new Set<SchematicSheetId>()
  const sheetIdsWithEditableContent = new Set<SchematicSheetId>()

  for (const element of circuitJson) {
    const schematicSheetId = asString(element.schematic_sheet_id)
    if (!schematicSheetId) continue
    if (element.type === "schematic_graphic") {
      sheetIdsWithGraphics.add(schematicSheetId)
    } else if (isEditableSchematicElement(element)) {
      sheetIdsWithEditableContent.add(schematicSheetId)
    }
  }

  return byType(circuitJson, "schematic_sheet").filter((sheet) => {
    const schematicSheetId = asString(sheet.schematic_sheet_id)
    return !(
      sheetIdsWithGraphics.has(schematicSheetId) &&
      !sheetIdsWithEditableContent.has(schematicSheetId)
    )
  })
}
