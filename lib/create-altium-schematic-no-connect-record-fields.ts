import type { Point } from "./types"

type SchematicNoConnectRecordFieldsInput = {
  altiumNoConnectPosition: Point
}

const ALTIUM_NO_CONNECT_COLOR = 255

export function createAltiumSchematicNoConnectRecordFields({
  altiumNoConnectPosition,
}: SchematicNoConnectRecordFieldsInput): string[] {
  return [
    "RECORD=22",
    `LOCATION.X=${altiumNoConnectPosition.x}`,
    `LOCATION.Y=${altiumNoConnectPosition.y}`,
    "ISACTIVE=T",
    "SYMBOL=Thin Cross",
    "ORIENTATION=1",
    "OWNERPARTID=-1",
    `COLOR=${ALTIUM_NO_CONNECT_COLOR}`,
    "SUPPRESSALL=T",
  ]
}
