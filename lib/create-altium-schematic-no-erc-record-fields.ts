import type { Point } from "./types"

type SchematicNoErcRecordFieldsInput = {
  altiumNoErcPosition: Point
}

const ALTIUM_NO_ERC_COLOR = 255

export function createAltiumSchematicNoErcRecordFields({
  altiumNoErcPosition,
}: SchematicNoErcRecordFieldsInput): string[] {
  return [
    "RECORD=22",
    `LOCATION.X=${altiumNoErcPosition.x}`,
    `LOCATION.Y=${altiumNoErcPosition.y}`,
    "ISACTIVE=T",
    "SYMBOL=Thin Cross",
    "ORIENTATION=1",
    "OWNERPARTID=-1",
    `COLOR=${ALTIUM_NO_ERC_COLOR}`,
    "SUPPRESSALL=T",
  ]
}
