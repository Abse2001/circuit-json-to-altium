# Real-circuit fixtures

`ti-sn74lvc1g34-buffer-truth-table.circuit.json` is the complete Circuit JSON
export of the `SN74LVC1G34` buffer reference from `tscircuit/ti`. The exported
schematic keeps the real TI component and signal connections, with the buffer's
two-state truth table added in clear space to the right of the circuit.

The table uses an explicit `top_left` anchor, 0.1-unit cell padding, and six
cells. Its title sits above the table rather than inside the grid, and neither
the table nor its title intersects the buffer, wires, or net labels.

- Source: `tscircuit/ti/lib/subcircuits/LogicBuffer_SN74LVC1G34.circuit.tsx`
- Revision: `dd9cb0a80904b1199edcdf8216ba027f2d1c1be8`
- Repro addition: the SN74LVC1G34 input/output truth table and title
- Generator: `tsci export --format circuit-json --disable-parts-engine`
- SHA-256: `5ecbd5995af96ba1b32ffd049b275b79a4a4c717181bd7fe76e377a9e0b86e6e`
