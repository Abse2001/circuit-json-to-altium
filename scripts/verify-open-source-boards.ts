import { createHash } from "node:crypto"
import { resolve } from "node:path"

type BoardReference = {
  bytes: number
  filename: string
  license: "CERN-OHL-P" | "MIT"
  repository: string
  sha256: string
}

const boardReferences: BoardReference[] = [
  {
    bytes: 4_480_512,
    filename: "nodemcu-esp12.PcbDoc",
    license: "MIT",
    repository:
      "nodemcu/nodemcu-devkit@b0f19d6d1c49b6db4aef56ddba789a7f92f6ecce",
    sha256: "5060fb6f0e80af09c8d5af376038a4e55044b28ae1d4dfa6a1fa354a6ea1e2f2",
  },
  {
    bytes: 3_618_816,
    filename: "ebaz4205.PcbDoc",
    license: "MIT",
    repository: "xjtuecho/EBAZ4205@05cdb45035a06fc5b4db16babf0ac6f4ee4497be",
    sha256: "1dbeba2537bdf83e77bc9c5a7a6f2f7bf1104193f3dc2547d020dbd8018b4e62",
  },
  {
    bytes: 6_072_320,
    filename: "heron-payload-ssm.PcbDoc",
    license: "CERN-OHL-P",
    repository: "utat-ss/HERON-pcbs@7ce0d62ee6159ad9d74eb4ae941792dc0e2e4820",
    sha256: "47a72219ab21c8eebb5beeab97e8aeca2121efb8561fca1d5f732215d233575d",
  },
  {
    bytes: 201_847,
    filename: "simplefoc-mini.PcbDoc",
    license: "MIT",
    repository:
      "simplefoc/SimpleFOCMini@8e10d4ba398624bd0ef970e82c03d7a6bcc2220d",
    sha256: "8328cebe97ba8623fb2b707490e3473c6f7dc13fb0502b596b0e40c7e1613d24",
  },
  {
    bytes: 362_916,
    filename: "simplefoc-shield-v3.PcbDoc",
    license: "MIT",
    repository:
      "simplefoc/Arduino-SimpleFOCShield@2a83626b86debd5fc5f309ba06b3fb36e3b25533",
    sha256: "507a0feb04cf539edd110ff1fe6da8ca8025009140b1934a6fc4df78308bfec5",
  },
]

const referencesDirectory = resolve(import.meta.dir, "..", "references")

for (const reference of boardReferences) {
  const file = Bun.file(resolve(referencesDirectory, reference.filename))
  if (!(await file.exists())) {
    throw new Error(`Missing vendored board: ${reference.filename}`)
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
