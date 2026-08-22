import type { Point } from "./types"

type NoErcRecordFieldsInput = {
  altiumNoErcPosition: Point
}

const ALTIUM_NO_ERC_COLOR = 255

export function createAltiumNoErcRecordFields({
  altiumNoErcPosition,
}: NoErcRecordFieldsInput): string[] {
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
