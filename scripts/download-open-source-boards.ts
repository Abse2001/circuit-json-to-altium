import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

type BoardReference = {
  filename: string
  sha256: string
  source: string
  url: string
}

const boardReferences: BoardReference[] = [
  {
    filename: "nodemcu-esp12.PcbDoc",
    sha256: "5060fb6f0e80af09c8d5af376038a4e55044b28ae1d4dfa6a1fa354a6ea1e2f2",
    source:
      "nodemcu/nodemcu-devkit@b0f19d6d1c49b6db4aef56ddba789a7f92f6ecce (MIT)",
    url: "https://raw.githubusercontent.com/nodemcu/nodemcu-devkit/b0f19d6d1c49b6db4aef56ddba789a7f92f6ecce/NODEMCU_ESP12.PcbDoc",
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
    filename: "elk-pi.PcbDoc",
    sha256: "8d61c6c9b9eff6748340794db203a86057857b8ce0348b7510859d73e3bce210",
    source:
      "elk-audio/elk-pi-hardware@770960ce5e520cf450182160cd8cff9690a0a869 (CC BY-SA 4.0)",
    url: "https://media.githubusercontent.com/media/elk-audio/elk-pi-hardware/770960ce5e520cf450182160cd8cff9690a0a869/Altium_files/ElkPi.PcbDoc",
  },
  {
    filename: "novena-edp-adapter.PcbDoc",
    sha256: "17896fdfeaac33a84ac3063db063d0a4d211c127c997632c8000837c0ce6fc12",
    source:
      "KiCad/kicad-source-mirror@c2a91caacf90b4d07261658ef44c0230116e667b (GPL-3.0-or-later mirror; Novena open-hardware fixture)",
    url: "https://raw.githubusercontent.com/KiCad/kicad-source-mirror/c2a91caacf90b4d07261658ef44c0230116e667b/qa/data/pcbnew/plugins/altium/eDP_adapter_dvt1_source/eDP_adapter_dvt1.PcbDoc",
  },
]

const referencesDirectory = resolve(import.meta.dir, "..", "references")

function verifySha256(
  label: string,
  bytes: Uint8Array,
  expectedHash: string,
): void {
  const actualHash = createHash("sha256").update(bytes).digest("hex")
  if (actualHash !== expectedHash) {
    throw new Error(
      `${label} SHA-256 mismatch: expected ${expectedHash}, got ${actualHash}`,
    )
  }
}

async function downloadBoard(reference: BoardReference): Promise<void> {
  const response = await fetch(reference.url)
  if (!response.ok) {
    throw new Error(
      `${reference.url} (${response.status} ${response.statusText})`,
    )
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  verifySha256(reference.filename, bytes, reference.sha256)
  await writeFile(resolve(referencesDirectory, reference.filename), bytes)
  console.log(
    `Saved ${reference.filename} (${bytes.byteLength} bytes) from ${reference.source}`,
  )
}

await mkdir(referencesDirectory, { recursive: true })
await Promise.all(boardReferences.map(downloadBoard))
