import { expect, test } from "bun:test"
import { parseAltiumSchDoc, serializeAltiumSheetToSvg } from "altiumts"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { Circuit } from "tscircuit"
import { CircuitJsonToAltiumConverter } from "../lib"
import { createSideBySideSvg } from "./fixtures/create-side-by-side-svg"

test("snapshots a power-labelled Circuit JSON and generated Altium schematic", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width="12mm" height="8mm">
      <resistor
        name="R1"
        resistance="1k"
        footprint="0402"
        schX={-2}
        schY={0}
        connections={{ pin1: "net.VCC", pin2: "C1.pin1" }}
      />
      <capacitor
        name="C1"
        capacitance="1uF"
        footprint="0603"
        schX={2}
        schY={0}
        connections={{ pin2: "net.GND" }}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const converter = new CircuitJsonToAltiumConverter(circuitJson, {
    projectName: "visual-schematic",
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

  expect(
    altiumSchematic.powerPorts.map((powerPort) => ({
      color: powerPort.getNumber("COLOR"),
      orientation: powerPort.getNumber("ORIENTATION"),
      style: powerPort.getNumber("STYLE"),
      text: powerPort.text,
    })),
  ).toEqual([
    { color: 132, orientation: 1, style: 2, text: "VCC" },
    { color: 132, orientation: 3, style: 2, text: "GND" },
  ])
  const sheetRecord = altiumSchematic.getRecordsByKind("31")[0]
  expect({
    height: sheetRecord?.getNumber("CUSTOMY"),
    width: sheetRecord?.getNumber("CUSTOMX"),
  }).toEqual({ height: 142, width: 284 })

  await expect(
    createSideBySideSvg(circuitJsonSvg, altiumSvg),
  ).toMatchSvgSnapshot(import.meta.path)
})
