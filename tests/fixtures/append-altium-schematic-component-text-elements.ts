import type { AltiumSchComponentRecord, AltiumSchDoc } from "altiumts"
import type { CircuitElement, SchematicComponentId } from "../../lib/types"
import { getAltiumSchematicTextPresentation } from "./get-altium-schematic-text-presentation"
import { isAltiumSchematicComponentRecordVisible } from "./is-altium-schematic-component-record-visible"

type AppendAltiumSchematicComponentTextElementsInput = {
  component: AltiumSchComponentRecord
  document: AltiumSchDoc
  elements: CircuitElement[]
  schematicComponentId: SchematicComponentId
}

export function appendAltiumSchematicComponentTextElements({
  component,
  document,
  elements,
  schematicComponentId,
}: AppendAltiumSchematicComponentTextElementsInput): void {
  for (const [recordIndex, record] of document.records.entries()) {
    if (
      record.recordKind !== "4" ||
      document.getParent(record) !== component ||
      !isAltiumSchematicComponentRecordVisible({ component, record })
    ) {
      continue
    }
    const text = record.getDecoded("TEXT") ?? ""
    if (!text || record.getBoolean("ISHIDDEN") === true) continue
    elements.push({
      type: "schematic_text",
      schematic_text_id: `schematic_text_component_label_${recordIndex}`,
      schematic_component_id: schematicComponentId,
      text,
      ...getAltiumSchematicTextPresentation({
        document,
        fallbackFontSizePoints: 9,
        record,
      }),
    })
  }
}
