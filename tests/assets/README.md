# Real-circuit fixtures

`ti-tpd2e009-esd-signal-map.circuit.json` is the complete Circuit JSON export of
the `TPD2E009` differential-line ESD protection reference from `tscircuit/ti`.
The exported schematic keeps the real TI component and SATA signal connections,
with a signal-to-protected-pin table added in clear space to the right.

The table uses an explicit `top_left` anchor, 0.1-unit cell padding, and six
cells. Its title sits above the table rather than inside the grid, and neither
the table nor its title intersects the rectangular component box, wires, or net
labels.

- Source: `tscircuit/ti/lib/subcircuits/InputOutputProtection_TPD2E009_TIDA00399.circuit.tsx`
- Revision: `dd9cb0a80904b1199edcdf8216ba027f2d1c1be8`
- Repro addition: the SATA signal-to-protected-pin table and title
- Generator: `tsci export --format circuit-json --disable-parts-engine`
- SHA-256: `295304c2e19a702fb871851a0c538c68756ae0f8754df24b68d3b8172b15df56`
