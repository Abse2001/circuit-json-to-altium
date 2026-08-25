import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

type ReferenceSpec = {
  filename: string
  sha256: string
  source: string
  url: string
}

const references: ReferenceSpec[] = [
  {
    filename: "nodemcu-esp12.PcbDoc",
    sha256: "5060fb6f0e80af09c8d5af376038a4e55044b28ae1d4dfa6a1fa354a6ea1e2f2",
    source:
      "nodemcu/nodemcu-devkit@b0f19d6d1c49b6db4aef56ddba789a7f92f6ecce (MIT)",
    url: "https://raw.githubusercontent.com/nodemcu/nodemcu-devkit/b0f19d6d1c49b6db4aef56ddba789a7f92f6ecce/NODEMCU_ESP12.PcbDoc",
  },
  {
    filename: "nodemcu-esp12.SchDoc",
    sha256: "cd415e8afcc7b47f2a0d7acf1e3a41d2304c4c4f02a70744d710ce24ba09707d",
    source:
      "nodemcu/nodemcu-devkit@b0f19d6d1c49b6db4aef56ddba789a7f92f6ecce (MIT)",
    url: "https://raw.githubusercontent.com/nodemcu/nodemcu-devkit/b0f19d6d1c49b6db4aef56ddba789a7f92f6ecce/NODEMCU_ESP12.SchDoc",
  },
  {
    filename: "ebaz4205.PcbDoc",
    sha256: "1dbeba2537bdf83e77bc9c5a7a6f2f7bf1104193f3dc2547d020dbd8018b4e62",
    source: "xjtuecho/EBAZ4205@05cdb45035a06fc5b4db16babf0ac6f4ee4497be (MIT)",
    url: "https://raw.githubusercontent.com/xjtuecho/EBAZ4205/05cdb45035a06fc5b4db16babf0ac6f4ee4497be/HW/ebaz4205/altium/ebit_ad.PcbDoc",
  },
  {
    filename: "heron-payload-ssm.PcbDoc",
    sha256: "47a72219ab21c8eebb5beeab97e8aeca2121efb8561fca1d5f732215d233575d",
    source:
      "utat-ss/HERON-pcbs@7ce0d62ee6159ad9d74eb4ae941792dc0e2e4820 (CERN-OHL-P)",
    url: "https://raw.githubusercontent.com/utat-ss/HERON-pcbs/7ce0d62ee6159ad9d74eb4ae941792dc0e2e4820/payload/pay-ssm/pay-ssm-v3.PcbDoc",
  },
  {
    filename: "heron-pay-ssm-top.SchDoc",
    sha256: "948eca8d0b9e306909755c11ad94d84eda7e60164d7ecc848dfbe8b77cdc2903",
    source:
      "utat-ss/HERON-pcbs@7ce0d62ee6159ad9d74eb4ae941792dc0e2e4820 (CERN-OHL-P)",
    url: "https://raw.githubusercontent.com/utat-ss/HERON-pcbs/7ce0d62ee6159ad9d74eb4ae941792dc0e2e4820/payload/pay-ssm/TOP.SchDoc",
  },
  {
    filename: "heron-pay-ssm.PrjPCB",
    sha256: "000882c19f01aa0e0374650ba216c81cae5b99b77fa9620ae9f3f0d94f62345b",
    source:
      "utat-ss/HERON-pcbs@7ce0d62ee6159ad9d74eb4ae941792dc0e2e4820 (CERN-OHL-P)",
    url: "https://raw.githubusercontent.com/utat-ss/HERON-pcbs/7ce0d62ee6159ad9d74eb4ae941792dc0e2e4820/payload/pay-ssm/pay-ssm.PrjPCB",
  },
  {
    filename: "heron-systems-pcb.SchDoc",
    sha256: "2fd2d93806602a290cfc9afd7d523ac0f4faa8e5d993d70537f070e850fd6d6b",
    source:
      "utat-ss/HERON-pcbs@7ce0d62ee6159ad9d74eb4ae941792dc0e2e4820 (CERN-OHL-P)",
    url: "https://raw.githubusercontent.com/utat-ss/HERON-pcbs/7ce0d62ee6159ad9d74eb4ae941792dc0e2e4820/systems/systems_pcb/systems_pcb.SchDoc",
  },
  {
    filename: "heron-systems-pcb.PrjPCB",
    sha256: "c4d7222c4e31eef1c6f1d8989d6cf9906bc5fc0c8f6fa51c4b9c82d5e538e5b9",
    source:
      "utat-ss/HERON-pcbs@7ce0d62ee6159ad9d74eb4ae941792dc0e2e4820 (CERN-OHL-P)",
    url: "https://raw.githubusercontent.com/utat-ss/HERON-pcbs/7ce0d62ee6159ad9d74eb4ae941792dc0e2e4820/systems/systems_pcb/systems_pcb.PrjPCB",
  },
  {
    filename: "simplefoc-mini.PcbDoc",
    sha256: "8328cebe97ba8623fb2b707490e3473c6f7dc13fb0502b596b0e40c7e1613d24",
    source:
      "simplefoc/SimpleFOCMini@8e10d4ba398624bd0ef970e82c03d7a6bcc2220d (MIT)",
    url: "https://raw.githubusercontent.com/simplefoc/SimpleFOCMini/8e10d4ba398624bd0ef970e82c03d7a6bcc2220d/Altium/simplefocmini_2024-04-26.pcbdoc",
  },
  {
    filename: "simplefoc-mini.SchDoc",
    sha256: "bc2039ef59eabe030fea68eedb87e3924c8e6711fb774e2d80b880cf468100ef",
    source:
      "simplefoc/SimpleFOCMini@8e10d4ba398624bd0ef970e82c03d7a6bcc2220d (MIT)",
    url: "https://raw.githubusercontent.com/simplefoc/SimpleFOCMini/8e10d4ba398624bd0ef970e82c03d7a6bcc2220d/Altium/simplefocmini_2024-04-26.schdoc",
  },
  {
    filename: "simplefoc-shield-v3.PcbDoc",
    sha256: "507a0feb04cf539edd110ff1fe6da8ca8025009140b1934a6fc4df78308bfec5",
    source:
      "simplefoc/Arduino-SimpleFOCShield@2a83626b86debd5fc5f309ba06b3fb36e3b25533 (MIT)",
    url: "https://raw.githubusercontent.com/simplefoc/Arduino-SimpleFOCShield/2a83626b86debd5fc5f309ba06b3fb36e3b25533/altium/SimpleFOCShieldV3.PcbDoc_2024-06-23.pcbdoc",
  },
  {
    filename: "simplefoc-shield-v3.SchDoc",
    sha256: "84419ed6b8755c6490415cf3e439405d0d10a5855304db7ca8e8052f2add3af8",
    source:
      "simplefoc/Arduino-SimpleFOCShield@2a83626b86debd5fc5f309ba06b3fb36e3b25533 (MIT)",
    url: "https://raw.githubusercontent.com/simplefoc/Arduino-SimpleFOCShield/2a83626b86debd5fc5f309ba06b3fb36e3b25533/altium/SimpleFOCShieldV3.SchDoc_2024-06-23.schdoc",
  },
]

const referencesDirectory = resolve(import.meta.dir, "..", "references")

async function downloadReference(reference: ReferenceSpec): Promise<void> {
  const response = await fetch(reference.url)
  if (!response.ok) {
    throw new Error(
      `${reference.url} (${response.status} ${response.statusText})`,
    )
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  const actualHash = createHash("sha256").update(bytes).digest("hex")
  if (actualHash !== reference.sha256) {
    throw new Error(
      `${reference.filename} SHA-256 mismatch: expected ${reference.sha256}, got ${actualHash}`,
    )
  }

  await writeFile(resolve(referencesDirectory, reference.filename), bytes)
  console.log(
    `Saved ${reference.filename} (${bytes.byteLength} bytes) from ${reference.source}`,
  )
}

await mkdir(referencesDirectory, { recursive: true })
await Promise.all(references.map(downloadReference))
