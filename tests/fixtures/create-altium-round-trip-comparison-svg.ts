import { Resvg } from "@resvg/resvg-js"
import type { PreservedPrimitiveCounts } from "./get-pcb-round-trip-metrics"

const independentRendererStyles = `<style>
  .pcb-board { fill: #d9ece6; stroke: #176b63; stroke-width: 0.08; }
  .pcb-polygon, .pcb-fill, .pcb-region { stroke: none; }
  .pcb-track, .pcb-arc, .pcb-footprint-track, .pcb-footprint-arc,
  .pcb-detail-track, .pcb-detail-arc { fill: none; stroke-linecap: round; stroke-linejoin: round; }
  .pcb-copper--surface .pcb-polygon { fill: rgba(205, 84, 48, 0.16); }
  .pcb-copper--surface .pcb-fill, .pcb-copper--surface .pcb-region { fill: rgba(205, 84, 48, 0.34); }
  .pcb-copper--surface .pcb-track, .pcb-copper--surface .pcb-arc { stroke: #cd5430; }
  .pcb-copper--subsurface { opacity: 0.42; }
  .pcb-copper--subsurface .pcb-polygon { fill: rgba(104, 76, 56, 0.12); }
  .pcb-copper--subsurface .pcb-fill, .pcb-copper--subsurface .pcb-region { fill: rgba(104, 76, 56, 0.2); }
  .pcb-copper--subsurface .pcb-track, .pcb-copper--subsurface .pcb-arc { stroke: #765a49; }
  .pcb-via__pad, .pcb-pad__ring { fill: #e8ece9; stroke: #17212b; stroke-width: 0.05; }
  .pcb-via__hole, .pcb-pad__hole, .pcb-pad__hole--slot { fill: #0f746c; }
  .pcb-pad--smd .pcb-pad__ring { fill: #cf6545; }
  .pcb-footprint-fill, .pcb-footprint-region { fill: rgba(237, 172, 36, 0.18); }
  .pcb-footprint-track, .pcb-footprint-arc { stroke: #d79516; }
  .pcb-detail-fill, .pcb-detail-region { fill: rgba(112, 126, 136, 0.28); }
  .pcb-detail-track, .pcb-detail-arc { stroke: #63737d; }
  .pcb-component__body { fill: rgba(244, 219, 198, 0.8); stroke: #6e4026; stroke-width: 0.05; }
  .pcb-component--bottom .pcb-component__body { fill: rgba(15, 116, 108, 0.58); }
  .pcb-text, .pcb-barcode__background, .pcb-barcode__bar { fill: #a66800; }
</style>`

type RasterizedSvg = {
  dataUri: string
  height: number
  width: number
}

function escapeXml(xmlText: string): string {
  return xmlText
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function rasterizeSvg(svg: string): RasterizedSvg {
  const styledSvg = svg.replace(
    /<svg\b[^>]*>/u,
    (openingTag) => `${openingTag}${independentRendererStyles}`,
  )
  const image = new Resvg(styledSvg, {
    background: "white",
    fitTo: { mode: "width", value: 720 },
    font: { loadSystemFonts: false },
  }).render()
  return {
    dataUri: `data:image/png;base64,${image.asPng().toString("base64")}`,
    height: image.height,
    width: image.width,
  }
}

function formatCounts(counts: PreservedPrimitiveCounts): string {
  return [
    `${counts.pcb_component} components`,
    `${counts.pcb_smtpad + counts.pcb_plated_hole} pads`,
    `${counts.pcb_trace} traces`,
    `${counts.pcb_via} vias`,
  ].join(" · ")
}

export function createAltiumRoundTripComparisonSvg({
  boardName,
  generatedAltiumSvg,
  originalAltiumSvg,
  primitiveCounts,
}: {
  boardName: string
  generatedAltiumSvg: string
  originalAltiumSvg: string
  primitiveCounts: PreservedPrimitiveCounts
}): string {
  const generated = rasterizeSvg(generatedAltiumSvg)
  const original = rasterizeSvg(originalAltiumSvg)
  const panelWidth = 720
  const panelGap = 24
  const outerPadding = 24
  const headingHeight = 82
  const panelHeight = Math.max(original.height, generated.height)
  const canvasWidth = outerPadding * 2 + panelWidth * 2 + panelGap
  const canvasHeight = outerPadding * 2 + headingHeight + panelHeight
  const rightPanelX = outerPadding + panelWidth + panelGap
  const panelY = outerPadding + headingHeight
  const originalY = panelY + (panelHeight - original.height) / 2
  const generatedY = panelY + (panelHeight - generated.height) / 2
  const safeBoardName = escapeXml(boardName)
  const countLabel = escapeXml(formatCounts(primitiveCounts))

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  <title>${safeBoardName} independent Altium round trip</title>
  <rect width="${canvasWidth}" height="${canvasHeight}" fill="#f5f7fa"/>
  <text x="${outerPadding}" y="${outerPadding + 28}" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#0f172a">Original GitHub .PcbDoc</text>
  <text x="${rightPanelX}" y="${outerPadding + 28}" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#0f172a">Circuit JSON → .PcbDoc</text>
  <text x="${outerPadding}" y="${outerPadding + 57}" font-family="Arial, sans-serif" font-size="17" fill="#475569">${safeBoardName} · ${countLabel}</text>
  <text x="${rightPanelX}" y="${outerPadding + 57}" font-family="Arial, sans-serif" font-size="17" fill="#475569">independently parsed and rendered · ${countLabel}</text>
  <rect x="${outerPadding}" y="${panelY}" width="${panelWidth}" height="${panelHeight}" rx="8" fill="white" stroke="#cbd5e1"/>
  <rect x="${rightPanelX}" y="${panelY}" width="${panelWidth}" height="${panelHeight}" rx="8" fill="white" stroke="#cbd5e1"/>
  <image x="${outerPadding}" y="${originalY}" width="${original.width}" height="${original.height}" href="${original.dataUri}"/>
  <image x="${rightPanelX}" y="${generatedY}" width="${generated.width}" height="${generated.height}" href="${generated.dataUri}"/>
</svg>`
}
