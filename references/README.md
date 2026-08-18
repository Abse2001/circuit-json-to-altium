# Open-source Altium board references

Run `bun run download-open-source-boards` to download five real Altium
`.PcbDoc` files from GitHub:

- `nodemcu-esp12.PcbDoc` from the MIT-licensed
  [`nodemcu/nodemcu-devkit`](https://github.com/nodemcu/nodemcu-devkit)
  repository at commit `b0f19d6d1c49b6db4aef56ddba789a7f92f6ecce`.
- `ebaz4205.PcbDoc` from the MIT-licensed
  [`xjtuecho/EBAZ4205`](https://github.com/xjtuecho/EBAZ4205)
  repository at commit `05cdb45035a06fc5b4db16babf0ac6f4ee4497be`.
- `heron-payload-ssm.PcbDoc` from the CERN-OHL-P-licensed
  [`utat-ss/HERON-pcbs`](https://github.com/utat-ss/HERON-pcbs)
  repository at commit `7ce0d62ee6159ad9d74eb4ae941792dc0e2e4820`.
- `elk-pi.PcbDoc` from the CC BY-SA 4.0-licensed
  [`elk-audio/elk-pi-hardware`](https://github.com/elk-audio/elk-pi-hardware)
  repository at commit `770960ce5e520cf450182160cd8cff9690a0a869`.
- `novena-edp-adapter.PcbDoc` from the GPL-3.0-or-later
  [`KiCad/kicad-source-mirror`](https://github.com/KiCad/kicad-source-mirror)
  QA corpus at commit `c2a91caacf90b4d07261658ef44c0230116e667b`.

The downloader verifies a pinned SHA-256 digest before writing each file. The
downloaded native documents are ignored by git; only their generated SVG
round-trip snapshots are committed.

Each test uses `altiumts` to parse the source board, projects the supported PCB
primitives into Circuit JSON, runs that Circuit JSON through this converter,
then uses `altiumts` to parse and render the generated `.PcbDoc`. The tests
check important primitive counts and snapshot the original and round-tripped
board side by side.
