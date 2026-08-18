import { expect, test } from "bun:test"
import { parseAltiumBinaryPcbDoc, serializeAltiumPcbToSvg } from "altiumts"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { Circuit } from "tscircuit"
import { CircuitJsonToAltiumConverter } from "../lib"
import { createSideBySideSvg } from "./fixtures/create-side-by-side-svg"

test("snapshots the Circuit JSON and generated Altium PCB", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width="12mm" height="8mm">
      <resistor name="R1" resistance="1k" footprint="0402" pcbX={-2} pcbY={0} />
      <capacitor
        name="C1"
        capacitance="1uF"
        footprint="0603"
        pcbX={2}
        pcbY={0}
        connections={{ pin1: "R1.pin2" }}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const converter = new CircuitJsonToAltiumConverter(circuitJson, {
    projectName: "visual-pcb",
  })
  converter.runUntilFinished()
  const altiumPcb = parseAltiumBinaryPcbDoc(converter.getOutput().pcb.content)
  const circuitJsonSvg = await convertCircuitJsonToPcbSvg(circuitJson, {
    showCourtyards: true,
  })
  const altiumSvg = serializeAltiumPcbToSvg(altiumPcb)

  await expect(
    createSideBySideSvg(circuitJsonSvg, altiumSvg),
  ).toMatchSvgSnapshot(import.meta.path)
})
