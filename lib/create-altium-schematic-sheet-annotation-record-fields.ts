import { sanitizeAltiumFieldText } from "altiumts"
import { getAltiumColorFromCss } from "./altium-color"
import type { AltiumSchematicFontTable } from "./create-altium-schematic-font-table"
import { asNumber, asPoint, asString, formatNumber } from "./format"
import { isSchematicSheetAnnotation } from "./is-schematic-sheet-annotation"
import type { CircuitElement, Point, PointTransform } from "./types"

type CreateAltiumSchematicSheetAnnotationRecordFieldsInput = {
  annotation: CircuitElement
  circuitToAltiumSchematicPoint: PointTransform
  fontTable: AltiumSchematicFontTable
}

type SchematicTextAnchor =
  | "bottom_center"
  | "bottom_left"
  | "bottom_right"
  | "center"
  | "center_left"
  | "center_right"
  | "top_center"
  | "top_left"
  | "top_right"

const ALTIUM_UNITS_PER_CIRCUIT_UNIT = 20
const ALTIUM_SCHEMATIC_DEFAULT_COLOR = 0x37_29_1f
const ALTIUM_SCHEMATIC_DEFAULT_FILL_COLOR = 0xff_ff_ff

const ALTIUM_JUSTIFICATION_BY_TEXT_ANCHOR: Record<SchematicTextAnchor, number> =
  {
    bottom_left: 0,
    bottom_center: 1,
    bottom_right: 2,
    center_left: 3,
    center: 4,
    center_right: 5,
    top_left: 6,
    top_center: 7,
    top_right: 8,
  }

function getAltiumLineWidth(annotation: CircuitElement): string {
  return formatNumber(
    Math.max(asNumber(annotation.stroke_width), 0) *
      ALTIUM_UNITS_PER_CIRCUIT_UNIT,
  )
}

function getAltiumColor({
  annotation,
  colorFieldName,
  fallbackAltiumColor,
}: {
  annotation: CircuitElement
  colorFieldName: "color" | "fill_color" | "stroke_color"
  fallbackAltiumColor: number
}): number {
  return getAltiumColorFromCss({
    cssColor: asString(annotation[colorFieldName]),
    fallbackAltiumColor,
  })
}

function createTextRecordFields({
  annotation,
  circuitToAltiumSchematicPoint,
  fontTable,
}: CreateAltiumSchematicSheetAnnotationRecordFieldsInput):
  | string[]
  | undefined {
  const text = sanitizeAltiumFieldText(asString(annotation.text))
  const circuitPosition = asPoint(annotation.position)
  const fontSizeCircuitUnits = asNumber(annotation.font_size)
  const fontId = fontTable.fontIdBySizeCircuitUnits.get(fontSizeCircuitUnits)
  if (!text || !circuitPosition || !fontId) return undefined
  const anchor = asString(annotation.anchor) as SchematicTextAnchor
  const altiumPosition = circuitToAltiumSchematicPoint(circuitPosition)
  const normalizedRotationDegrees =
    ((asNumber(annotation.rotation) % 360) + 360) % 360
  const isVertical =
    normalizedRotationDegrees === 90 || normalizedRotationDegrees === 270

  return [
    "RECORD=4",
    `LOCATION.X=${altiumPosition.x}`,
    `LOCATION.Y=${altiumPosition.y}`,
    `FONTID=${fontId}`,
    `TEXT=${text}`,
    `COLOR=${getAltiumColor({ annotation, colorFieldName: "color", fallbackAltiumColor: ALTIUM_SCHEMATIC_DEFAULT_COLOR })}`,
    `ORIENTATION=${isVertical ? 1 : 0}`,
    `JUSTIFICATION=${ALTIUM_JUSTIFICATION_BY_TEXT_ANCHOR[anchor] ?? 0}`,
  ]
}

function createRectRecordFields({
  annotation,
  circuitToAltiumSchematicPoint,
}: CreateAltiumSchematicSheetAnnotationRecordFieldsInput):
  | string[]
  | undefined {
  const circuitCenter = asPoint(annotation.center)
  const widthCircuitUnits = asNumber(annotation.width)
  const heightCircuitUnits = asNumber(annotation.height)
  if (!circuitCenter || widthCircuitUnits <= 0 || heightCircuitUnits <= 0) {
    return undefined
  }
  const firstCorner = circuitToAltiumSchematicPoint({
    x: circuitCenter.x - widthCircuitUnits / 2,
    y: circuitCenter.y - heightCircuitUnits / 2,
  })
  const secondCorner = circuitToAltiumSchematicPoint({
    x: circuitCenter.x + widthCircuitUnits / 2,
    y: circuitCenter.y + heightCircuitUnits / 2,
  })

  return [
    "RECORD=14",
    `LOCATION.X=${firstCorner.x}`,
    `LOCATION.Y=${firstCorner.y}`,
    `CORNER.X=${secondCorner.x}`,
    `CORNER.Y=${secondCorner.y}`,
    `LINEWIDTH=${getAltiumLineWidth(annotation)}`,
    `COLOR=${getAltiumColor({ annotation, colorFieldName: "color", fallbackAltiumColor: ALTIUM_SCHEMATIC_DEFAULT_COLOR })}`,
    `AREACOLOR=${getAltiumColor({ annotation, colorFieldName: "fill_color", fallbackAltiumColor: ALTIUM_SCHEMATIC_DEFAULT_FILL_COLOR })}`,
    `ISSOLID=${annotation.is_filled === true ? "T" : "F"}`,
  ]
}

function createPathRecordFields({
  annotation,
  circuitToAltiumSchematicPoint,
}: CreateAltiumSchematicSheetAnnotationRecordFieldsInput):
  | string[]
  | undefined {
  if (!Array.isArray(annotation.points)) return undefined
  const circuitPoints = annotation.points.flatMap((point) => {
    const circuitPoint = asPoint(point)
    return circuitPoint ? [circuitPoint] : []
  })
  if (circuitPoints.length < 2) return undefined
  const altiumPoints: Point[] = circuitPoints.map(circuitToAltiumSchematicPoint)
  const isFilled = annotation.is_filled === true

  return [
    `RECORD=${isFilled ? 7 : 6}`,
    `LINEWIDTH=${getAltiumLineWidth(annotation)}`,
    `LOCATIONCOUNT=${altiumPoints.length}`,
    ...altiumPoints.flatMap((point, pointIndex) => [
      `X${pointIndex + 1}=${point.x}`,
      `Y${pointIndex + 1}=${point.y}`,
    ]),
    `COLOR=${getAltiumColor({ annotation, colorFieldName: "stroke_color", fallbackAltiumColor: ALTIUM_SCHEMATIC_DEFAULT_COLOR })}`,
    ...(isFilled
      ? [
          `AREACOLOR=${getAltiumColor({ annotation, colorFieldName: "fill_color", fallbackAltiumColor: ALTIUM_SCHEMATIC_DEFAULT_FILL_COLOR })}`,
          "ISSOLID=T",
        ]
      : []),
  ]
}

export function createAltiumSchematicSheetAnnotationRecordFields(
  input: CreateAltiumSchematicSheetAnnotationRecordFieldsInput,
): string[] | undefined {
  if (!isSchematicSheetAnnotation(input.annotation)) return undefined
  if (input.annotation.type === "schematic_text") {
    return createTextRecordFields(input)
  }
  if (input.annotation.type === "schematic_rect") {
    return createRectRecordFields(input)
  }
  if (input.annotation.type === "schematic_path") {
    return createPathRecordFields(input)
  }
  return undefined
}
