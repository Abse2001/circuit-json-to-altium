import { expect, test } from "bun:test"
import { parseAltiumSchDoc, serializeAltiumSheetToSvg } from "altiumts"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { Circuit } from "tscircuit"
import { CircuitJsonToAltiumConverter } from "../lib"
import { createSideBySideSvg } from "./fixtures/create-side-by-side-svg"

test("snapshots boxed component pin text", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width="12mm" height="12mm">
      <chip
        name="U1"
        footprint="soic8"
        pinLabels={{
          pin1: "VCC",
          pin2: "DISCH",
          pin3: "THRES",
          pin4: "CTRL",
          pin5: "GND",
          pin6: "TRIG",
          pin7: "OUT",
          pin8: "RESET",
        }}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const converter = new CircuitJsonToAltiumConverter(circuitJson, {
    projectName: "boxed-schematic",
  })
  converter.runUntilFinished()
  const firstSchematic = converter.getOutput().schematics[0]
  if (!firstSchematic) throw new Error("Converter did not create a schematic")
  const altiumSchematic = parseAltiumSchDoc(firstSchematic.content)
  const circuitJsonSvg = await convertCircuitJsonToSchematicSvg(circuitJson)
  const altiumSvg = serializeAltiumSheetToSvg(altiumSchematic, {
    backgroundColor: "rgb(245, 241, 237)",
    height: 600,
    margin: 0,
    showBorder: false,
    width: 1200,
  })

  await expect(
    createSideBySideSvg(circuitJsonSvg, altiumSvg),
  ).toMatchSvgSnapshot(import.meta.path)
})
