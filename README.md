# circuit-json-to-altium

Convert Circuit JSON schematic and PCB content into an Altium Designer project archive.

## Installation

```bash
bun add circuit-json-to-altium
```

## Usage

```ts
import { CircuitJsonToAltiumConverter } from "circuit-json-to-altium"

const converter = new CircuitJsonToAltiumConverter(circuitJson, {
  projectName: "motor-controller",
})

converter.runUntilFinished()

const { pcb, project, schematics } = converter.getOutput()
const archiveBytes = await converter.getOutputZip()
```

The converter follows the same inspectable pipeline pattern as
`circuit-json-to-kicad`. Call `step()` to advance one stage at a time, inspect
`currentStage`, or use `runUntilFinished()` for ordinary conversion. The stages
build the PCB, schematics, and project before validating every generated
document.

For callers that only need an archive, the convenience function wraps the same
pipeline:

```ts
import { convertCircuitJsonToAltiumZip } from "circuit-json-to-altium"

const archiveBytes = await convertCircuitJsonToAltiumZip(
  circuitJson,
  "motor-controller",
)

await Bun.write("motor-controller-altium.zip", archiveBytes)
```

The returned ZIP archive contains:

- a native binary `.PcbDoc`
- one native binary `.SchDoc` per Circuit JSON schematic sheet
- a native binary `.PrjPcb`
- a short conversion note

The converter validates its generated PCB and schematic documents before returning the archive. Invalid geometry is rejected with a descriptive error instead of producing a corrupt project.

## Supported content

The current converter handles board outlines, components, pads, plated and non-plated holes, routed copper with vias, nets, PCB silkscreen, schematic components, ports, labels, junctions, and traces. It also preserves multiple schematic sheets and sanitizes Altium field and filename text.

`altiumts` owns the Altium document model, parsing, and native binary serialization. This package owns the Circuit JSON-to-Altium mapping and archive assembly.

## Development

```bash
bun install
bun run download-open-source-boards
bun run check
```

Tests follow the tscircuit convention of one test case per test file. The suite covers archive structure, filename sanitization, PCB geometry and connectivity, schematic primitives and sheets, randomized inputs, and native binary round trips.

Five round-trip tests download SHA-256-pinned, open-source Altium boards from
GitHub. `altiumts` parses each native board, a narrow test fixture projects its
supported PCB primitives into Circuit JSON, and the converter writes a new
native `.PcbDoc` that `altiumts` parses and renders again. The tests require
exact primitive and rotation counts and sub-0.03 mm relative geometry drift.
Each test embeds the unchanged source and generated SVGs side by side in one
snapshot. CI downloads the references before running the suite; the licensed
native files themselves are not committed.

PCB and schematic tests likewise snapshot the raw Circuit JSON and converted
Altium SVG outputs separately. Visual baselines live in `tests/__snapshots__` so
mapping regressions can be reviewed directly in a pull request.

```bash
# Update visual snapshots after reviewing an intentional rendering change
BUN_UPDATE_SNAPSHOTS=1 bun test tests/visual01-pcb-comparison.test.tsx
BUN_UPDATE_SNAPSHOTS=1 bun test tests/visual02-schematic-comparison.test.tsx
BUN_UPDATE_SNAPSHOTS=1 bun test tests/roundtrip*.test.ts
```

## Project structure

```text
lib/
├── circuit-json-to-altium-converter.ts  # Step-driven converter pipeline
├── converter-stage.ts                   # Shared stage contract
├── stages/                              # PCB, schematic, project, validation
├── create-pcb-document.ts               # Circuit JSON PCB mapping
└── create-schematic-document.ts         # Circuit JSON schematic mapping
tests/
├── fixtures/                            # Shared round-trip and archive helpers
└── __snapshots__/                       # Raw renderer baselines
references/                               # Pinned open-source board manifest
scripts/                                  # Verified reference downloader
```
