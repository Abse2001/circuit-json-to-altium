import { createHash } from "node:crypto"
import { resolve } from "node:path"

type OpenSourceReference = {
  bytes: number
  filename: string
  kind: "board" | "schematic"
  license: "CERN-OHL-P" | "MIT"
  repository: string
  sha256: string
}

const openSourceReferences: OpenSourceReference[] = [
  {
    bytes: 4_480_512,
    filename: "nodemcu-esp12.PcbDoc",
    kind: "board",
    license: "MIT",
    repository:
      "nodemcu/nodemcu-devkit@b0f19d6d1c49b6db4aef56ddba789a7f92f6ecce",
    sha256: "5060fb6f0e80af09c8d5af376038a4e55044b28ae1d4dfa6a1fa354a6ea1e2f2",
  },
  {
    bytes: 3_618_816,
    filename: "ebaz4205.PcbDoc",
    kind: "board",
    license: "MIT",
    repository: "xjtuecho/EBAZ4205@05cdb45035a06fc5b4db16babf0ac6f4ee4497be",
    sha256: "1dbeba2537bdf83e77bc9c5a7a6f2f7bf1104193f3dc2547d020dbd8018b4e62",
  },
  {
    bytes: 6_072_320,
    filename: "heron-payload-ssm.PcbDoc",
    kind: "board",
    license: "CERN-OHL-P",
    repository: "utat-ss/HERON-pcbs@7ce0d62ee6159ad9d74eb4ae941792dc0e2e4820",
    sha256: "47a72219ab21c8eebb5beeab97e8aeca2121efb8561fca1d5f732215d233575d",
  },
  {
    bytes: 201_847,
    filename: "simplefoc-mini.PcbDoc",
    kind: "board",
    license: "MIT",
    repository:
      "simplefoc/SimpleFOCMini@8e10d4ba398624bd0ef970e82c03d7a6bcc2220d",
    sha256: "8328cebe97ba8623fb2b707490e3473c6f7dc13fb0502b596b0e40c7e1613d24",
  },
  {
    bytes: 362_916,
    filename: "simplefoc-shield-v3.PcbDoc",
    kind: "board",
    license: "MIT",
    repository:
      "simplefoc/Arduino-SimpleFOCShield@2a83626b86debd5fc5f309ba06b3fb36e3b25533",
    sha256: "507a0feb04cf539edd110ff1fe6da8ca8025009140b1934a6fc4df78308bfec5",
  },
  {
    bytes: 258_048,
    filename: "nodemcu-esp12.SchDoc",
    kind: "schematic",
    license: "MIT",
    repository:
      "nodemcu/nodemcu-devkit@b0f19d6d1c49b6db4aef56ddba789a7f92f6ecce",
    sha256: "cd415e8afcc7b47f2a0d7acf1e3a41d2304c4c4f02a70744d710ce24ba09707d",
  },
  {
    bytes: 235_520,
    filename: "heron-pay-ssm-top.SchDoc",
    kind: "schematic",
    license: "CERN-OHL-P",
    repository: "utat-ss/HERON-pcbs@7ce0d62ee6159ad9d74eb4ae941792dc0e2e4820",
    sha256: "948eca8d0b9e306909755c11ad94d84eda7e60164d7ecc848dfbe8b77cdc2903",
  },
  {
    bytes: 83_458,
    filename: "simplefoc-mini.SchDoc",
    kind: "schematic",
    license: "MIT",
    repository:
      "simplefoc/SimpleFOCMini@8e10d4ba398624bd0ef970e82c03d7a6bcc2220d",
    sha256: "bc2039ef59eabe030fea68eedb87e3924c8e6711fb774e2d80b880cf468100ef",
  },
  {
    bytes: 235_809,
    filename: "simplefoc-shield-v3.SchDoc",
    kind: "schematic",
    license: "MIT",
    repository:
      "simplefoc/Arduino-SimpleFOCShield@2a83626b86debd5fc5f309ba06b3fb36e3b25533",
    sha256: "84419ed6b8755c6490415cf3e439405d0d10a5855304db7ca8e8052f2add3af8",
  },
  {
    bytes: 180_736,
    filename: "heron-systems-pcb.SchDoc",
    kind: "schematic",
    license: "CERN-OHL-P",
    repository: "utat-ss/HERON-pcbs@7ce0d62ee6159ad9d74eb4ae941792dc0e2e4820",
    sha256: "2fd2d93806602a290cfc9afd7d523ac0f4faa8e5d993d70537f070e850fd6d6b",
  },
]

const referencesDirectory = resolve(import.meta.dir, "..", "references")

for (const reference of openSourceReferences) {
  const file = Bun.file(resolve(referencesDirectory, reference.filename))
  if (!(await file.exists())) {
    throw new Error(`Missing vendored ${reference.kind}: ${reference.filename}`)
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.byteLength !== reference.bytes) {
    throw new Error(
      `${reference.filename} size mismatch: expected ${reference.bytes}, got ${bytes.byteLength}`,
    )
  }

  const actualHash = createHash("sha256").update(bytes).digest("hex")
  if (actualHash !== reference.sha256) {
    throw new Error(
      `${reference.filename} SHA-256 mismatch: expected ${reference.sha256}, got ${actualHash}`,
    )
  }

  console.log(
    `Verified ${reference.filename} from ${reference.repository} (${reference.license})`,
  )
}
