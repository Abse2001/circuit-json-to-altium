import type { Point } from "./types"

type AltiumPowerPortDirection = "down" | "left" | "right" | "up"
type AltiumPowerPortSymbolFamily = "ground" | "rail"

type AltiumPowerPortStyle = {
  orientationIndex: number
  styleIndex: number
}

type SchematicNetLabelRecordFieldsInput = {
  altiumLabelPosition: Point
  labelText: string
  symbolName: string
}

const ALTIUM_SCHEMATIC_LABEL_FONT_ID = 2
const ALTIUM_SCHEMATIC_POWER_PORT_COLOR_INDEX = 128

const ALTIUM_ORIENTATION_INDEX_BY_POWER_PORT_DIRECTION: Record<
  AltiumPowerPortDirection,
  number
> = {
  right: 0,
  up: 1,
  left: 2,
  down: 3,
}

const ALTIUM_STYLE_INDEX_BY_POWER_PORT_SYMBOL_FAMILY: Record<
  AltiumPowerPortSymbolFamily,
  number
> = {
  rail: 2,
  ground: 4,
}

function isAltiumPowerPortDirection(
  direction: string,
): direction is AltiumPowerPortDirection {
  return direction in ALTIUM_ORIENTATION_INDEX_BY_POWER_PORT_DIRECTION
}

function isAltiumPowerPortSymbolFamily(
  symbolFamily: string,
): symbolFamily is AltiumPowerPortSymbolFamily {
  return symbolFamily in ALTIUM_STYLE_INDEX_BY_POWER_PORT_SYMBOL_FAMILY
}

function getAltiumPowerPortStyle(
  symbolName: string,
): AltiumPowerPortStyle | undefined {
  const directionSeparatorIndex = symbolName.lastIndexOf("_")
  if (directionSeparatorIndex < 1) return undefined
  const symbolFamily = symbolName.slice(0, directionSeparatorIndex)
  const direction = symbolName.slice(directionSeparatorIndex + 1)
  if (
    !isAltiumPowerPortSymbolFamily(symbolFamily) ||
    !isAltiumPowerPortDirection(direction)
  ) {
    return undefined
  }
  return {
    orientationIndex:
      ALTIUM_ORIENTATION_INDEX_BY_POWER_PORT_DIRECTION[direction],
    styleIndex: ALTIUM_STYLE_INDEX_BY_POWER_PORT_SYMBOL_FAMILY[symbolFamily],
  }
}

export function createAltiumSchematicNetLabelRecordFields({
  altiumLabelPosition,
  labelText,
  symbolName,
}: SchematicNetLabelRecordFieldsInput): string[] {
  const powerPortStyle = getAltiumPowerPortStyle(symbolName)
  if (powerPortStyle) {
    return [
      "RECORD=17",
      `LOCATION.X=${altiumLabelPosition.x}`,
      `LOCATION.Y=${altiumLabelPosition.y}`,
      `FONTID=${ALTIUM_SCHEMATIC_LABEL_FONT_ID}`,
      `ORIENTATION=${powerPortStyle.orientationIndex}`,
      `STYLE=${powerPortStyle.styleIndex}`,
      `COLOR=${ALTIUM_SCHEMATIC_POWER_PORT_COLOR_INDEX}`,
      "SHOWNETNAME=T",
      `TEXT=${labelText}`,
    ]
  }

  return [
    "RECORD=25",
    `LOCATION.X=${altiumLabelPosition.x}`,
    `LOCATION.Y=${altiumLabelPosition.y}`,
    `FONTID=${ALTIUM_SCHEMATIC_LABEL_FONT_ID}`,
    "ORIENTATION=0",
    "JUSTIFICATION=0",
    `TEXT=${labelText}`,
  ]
}
