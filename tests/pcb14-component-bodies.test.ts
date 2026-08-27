import { expect, test } from "bun:test"
import {
  AltiumComponentBodyRecord,
  getPcbContour,
  serializeAltiumPcbToSvg,
} from "altiumts"
import {
  board,
  type CircuitElement,
  expectValidPcb,
  extractArchive,
  pcbComponent,
  sourceComponent,
} from "./fixtures"

test("preserves multiple CAD body contours owned by one PCB component", async () => {
  const elements: CircuitElement[] = [
    board({ thickness: 1.6, width: 20, height: 12 }),
    sourceComponent("source_component_1", "U1"),
    pcbComponent({
      pcbComponentId: "pcb_component_1",
      sourceComponentId: "source_component_1",
    }),
    {
      type: "cad_component",
      cad_component_id: "cad_component_main",
      pcb_component_id: "pcb_component_1",
      source_component_id: "source_component_1",
      position: { x: 0, y: 0, z: 1.6 },
      rotation: { x: 0, y: 0, z: 0 },
      size: { x: 6, y: 4, z: 1.2 },
      layer: "top",
      anchor_alignment: "center",
      model_object_fit: "contain_within_bounds",
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_tab",
      pcb_component_id: "pcb_component_1",
      source_component_id: "source_component_1",
      position: { x: 3, y: 0, z: 1.2 },
      rotation: { x: 0, y: 0, z: 30 },
      size: { x: 2, y: 1, z: 0.4 },
      layer: "top",
      anchor_alignment: "center",
      model_object_fit: "contain_within_bounds",
      show_as_translucent_model: true,
    },
  ]
  const { pcb } = await extractArchive(elements)
  const componentBodies = pcb.getRecordsByKind("ComponentBody")

  expect(componentBodies).toHaveLength(2)
  expect(componentBodies.map((body) => body.getNumber("COMPONENT"))).toEqual([
    0, 0,
  ])
  expect(componentBodies.map((body) => body.getDecoded("LAYER"))).toEqual([
    "MECHANICAL13",
    "MECHANICAL13",
  ])
  expect(
    componentBodies.map((body) => getPcbContour(body).points.length),
  ).toEqual([5, 5])
  const mainBody = componentBodies[0]
  const tabBody = componentBodies[1]
  if (
    !(mainBody instanceof AltiumComponentBodyRecord) ||
    !(tabBody instanceof AltiumComponentBodyRecord)
  ) {
    throw new Error("Expected typed Altium component body records")
  }
  expect(mainBody.standoffHeightMils).toBeCloseTo(7.874, 3)
  expect(tabBody.opacity).toBe(0.5)
  expectValidPcb(pcb)
  await expect(serializeAltiumPcbToSvg(pcb)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
