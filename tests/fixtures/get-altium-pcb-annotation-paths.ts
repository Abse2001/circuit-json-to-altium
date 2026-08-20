import {
  type AltiumComponentRecord,
  type AltiumPcbDocument,
  type AltiumPoint,
  type AltiumRecord,
  getPcbRegionGeometry,
  parseAltiumMeasurementToMils,
} from "altiumts"

export type AltiumPcbAnnotationPath = {
  componentId?: string
  layer: string
  points: AltiumPoint[]
  strokeWidthMils: number
}

type AnnotationPathGroupKey = string

export function getAltiumPcbMeasurementMils({
  fieldNames,
  record,
}: {
  fieldNames: string[]
  record: AltiumRecord
}): number | undefined {
  for (const fieldName of fieldNames) {
    const measurementMils = parseAltiumMeasurementToMils(
      record.getCaseInsensitive(fieldName),
    )
    if (measurementMils !== undefined) return measurementMils
  }
  return undefined
}

export function getAltiumPcbPoint({
  record,
  xFieldName,
  yFieldName,
}: {
  record: AltiumRecord
  xFieldName: string
  yFieldName: string
}): AltiumPoint | undefined {
  const x = getAltiumPcbMeasurementMils({ fieldNames: [xFieldName], record })
  const y = getAltiumPcbMeasurementMils({ fieldNames: [yFieldName], record })
  return x === undefined || y === undefined ? undefined : { x, y }
}

export function getAltiumPcbAnnotationPaths({
  componentIds,
  document,
  includeRecord,
}: {
  componentIds: ReadonlyMap<AltiumComponentRecord, string>
  document: AltiumPcbDocument
  includeRecord(record: AltiumRecord): boolean
}): AltiumPcbAnnotationPath[] {
  const paths: AltiumPcbAnnotationPath[] = []
  for (const record of document.records) {
    if (!includeRecord(record)) continue
    const points = getRecordPathPoints(record)
    if (points.length < 2) continue
    const component = document.getComponentForRecord(record)
    const componentId = component ? componentIds.get(component) : undefined
    paths.push({
      ...(componentId ? { componentId } : {}),
      layer: record.getDecoded("LAYER") ?? "",
      points,
      strokeWidthMils:
        getAltiumPcbMeasurementMils({
          fieldNames: ["WIDTH", "LINEWIDTH"],
          record,
        }) ?? 4,
    })
  }
  return stitchConnectedAltiumPaths(paths)
}

export function isClosedAltiumPath(path: AltiumPcbAnnotationPath): boolean {
  const firstPoint = path.points[0]
  const lastPoint = path.points.at(-1)
  return Boolean(
    firstPoint && lastPoint && altiumPointsEqual(firstPoint, lastPoint),
  )
}

export function getAltiumCircleFromPath(
  path: AltiumPcbAnnotationPath,
): { center: AltiumPoint; radiusMils: number } | undefined {
  if (!isClosedAltiumPath(path) || path.points.length < 9) return undefined
  const distinctPoints = path.points.slice(0, -1)
  const minX = Math.min(...distinctPoints.map(getPointX))
  const maxX = Math.max(...distinctPoints.map(getPointX))
  const minY = Math.min(...distinctPoints.map(getPointY))
  const maxY = Math.max(...distinctPoints.map(getPointY))
  const widthMils = maxX - minX
  const heightMils = maxY - minY
  const radiusMils = (widthMils + heightMils) / 4
  if (radiusMils <= 0 || Math.abs(widthMils - heightMils) > radiusMils * 0.01) {
    return undefined
  }
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
  const maximumRadiusDeltaMils = Math.max(
    ...distinctPoints.map((point) =>
      Math.abs(Math.hypot(point.x - center.x, point.y - center.y) - radiusMils),
    ),
  )
  return maximumRadiusDeltaMils <= radiusMils * 0.01
    ? { center, radiusMils }
    : undefined
}

export function getAltiumRectFromPath(
  path: AltiumPcbAnnotationPath,
): { center: AltiumPoint; heightMils: number; widthMils: number } | undefined {
  if (!isClosedAltiumPath(path) || path.points.length < 5) return undefined
  const distinctPoints = path.points.slice(0, -1)
  const minX = Math.min(...distinctPoints.map(getPointX))
  const maxX = Math.max(...distinctPoints.map(getPointX))
  const minY = Math.min(...distinctPoints.map(getPointY))
  const maxY = Math.max(...distinctPoints.map(getPointY))
  const pointsAreOnRectEdges = distinctPoints.every(
    (point) =>
      approximatelyEqual(point.x, minX) ||
      approximatelyEqual(point.x, maxX) ||
      approximatelyEqual(point.y, minY) ||
      approximatelyEqual(point.y, maxY),
  )
  const segmentsAreAxisAligned = path.points.every((point, pointIndex) => {
    const nextPoint = path.points[pointIndex + 1]
    return (
      !nextPoint ||
      approximatelyEqual(point.x, nextPoint.x) ||
      approximatelyEqual(point.y, nextPoint.y)
    )
  })
  if (!pointsAreOnRectEdges || !segmentsAreAxisAligned) return undefined
  return {
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    heightMils: maxY - minY,
    widthMils: maxX - minX,
  }
}

function getRecordPathPoints(record: AltiumRecord): AltiumPoint[] {
  if (record.recordKind === "Track") {
    const start = getAltiumPcbPoint({
      record,
      xFieldName: "X1",
      yFieldName: "Y1",
    })
    const end = getAltiumPcbPoint({
      record,
      xFieldName: "X2",
      yFieldName: "Y2",
    })
    return start && end ? [start, end] : []
  }
  if (record.recordKind === "Arc") return createAltiumArcPoints(record)
  if (record.recordKind === "Region" || record.recordKind === "RegionFill") {
    return getPcbRegionGeometry(record).outline.points
  }
  return []
}

function createAltiumArcPoints(record: AltiumRecord): AltiumPoint[] {
  const center =
    getAltiumPcbPoint({
      record,
      xFieldName: "LOCATION.X",
      yFieldName: "LOCATION.Y",
    }) ?? getAltiumPcbPoint({ record, xFieldName: "X", yFieldName: "Y" })
  const radiusMils = getAltiumPcbMeasurementMils({
    fieldNames: ["RADIUS"],
    record,
  })
  if (!center || radiusMils === undefined || radiusMils <= 0) return []
  const startAngleDegrees = record.getNumber("STARTANGLE") ?? 0
  const endAngleDegrees = record.getNumber("ENDANGLE") ?? 360
  const sweepDegrees = endAngleDegrees - startAngleDegrees || 360
  const segmentCount = Math.max(8, Math.ceil(Math.abs(sweepDegrees) / 7.5))
  return Array.from({ length: segmentCount + 1 }, (_, segmentIndex) => {
    const angleDegrees =
      startAngleDegrees + (sweepDegrees * segmentIndex) / segmentCount
    const angleRadians = (angleDegrees * Math.PI) / 180
    return {
      x: center.x + Math.cos(angleRadians) * radiusMils,
      y: center.y + Math.sin(angleRadians) * radiusMils,
    }
  })
}

function stitchConnectedAltiumPaths(
  paths: AltiumPcbAnnotationPath[],
): AltiumPcbAnnotationPath[] {
  const pathsByGroup = new Map<
    AnnotationPathGroupKey,
    AltiumPcbAnnotationPath[]
  >()
  for (const path of deduplicateAltiumPaths(paths)) {
    const groupKey = [
      path.componentId ?? "",
      normalizeLayer(path.layer),
      path.strokeWidthMils.toFixed(4),
    ].join("|")
    const group = pathsByGroup.get(groupKey) ?? []
    group.push(path)
    pathsByGroup.set(groupKey, group)
  }

  return [...pathsByGroup.values()].flatMap(stitchAltiumPathGroup)
}

function stitchAltiumPathGroup(
  pathGroup: AltiumPcbAnnotationPath[],
): AltiumPcbAnnotationPath[] {
  const remainingPaths = [...pathGroup]
  const stitchedPaths: AltiumPcbAnnotationPath[] = []
  while (remainingPaths.length > 0) {
    const firstPath = remainingPaths.shift()
    if (!firstPath) break
    const stitchedPath = { ...firstPath, points: [...firstPath.points] }
    let didAppendPath = true
    while (didAppendPath) {
      didAppendPath = appendConnectedPath({
        remainingPaths,
        stitchedPath,
      })
    }
    stitchedPaths.push(stitchedPath)
  }
  return stitchedPaths
}

function appendConnectedPath({
  remainingPaths,
  stitchedPath,
}: {
  remainingPaths: AltiumPcbAnnotationPath[]
  stitchedPath: AltiumPcbAnnotationPath
}): boolean {
  const stitchedStart = stitchedPath.points[0]
  const stitchedEnd = stitchedPath.points.at(-1)
  if (!stitchedStart || !stitchedEnd) return false
  for (const [candidateIndex, candidate] of remainingPaths.entries()) {
    const candidateStart = candidate.points[0]
    const candidateEnd = candidate.points.at(-1)
    if (!candidateStart || !candidateEnd) continue
    if (altiumPointsEqual(stitchedEnd, candidateStart)) {
      stitchedPath.points.push(...candidate.points.slice(1))
    } else if (altiumPointsEqual(stitchedEnd, candidateEnd)) {
      stitchedPath.points.push(...candidate.points.toReversed().slice(1))
    } else if (altiumPointsEqual(stitchedStart, candidateEnd)) {
      stitchedPath.points.unshift(...candidate.points.slice(0, -1))
    } else if (altiumPointsEqual(stitchedStart, candidateStart)) {
      stitchedPath.points.unshift(...candidate.points.toReversed().slice(0, -1))
    } else {
      continue
    }
    remainingPaths.splice(candidateIndex, 1)
    return true
  }
  return false
}

function deduplicateAltiumPaths(
  paths: AltiumPcbAnnotationPath[],
): AltiumPcbAnnotationPath[] {
  const seenSignatures = new Set<string>()
  return paths.filter((path) => {
    const signature = [
      path.componentId ?? "",
      normalizeLayer(path.layer),
      ...path.points.map(
        (point) => `${point.x.toFixed(4)},${point.y.toFixed(4)}`,
      ),
    ].join("|")
    if (seenSignatures.has(signature)) return false
    seenSignatures.add(signature)
    return true
  })
}

function altiumPointsEqual(left: AltiumPoint, right: AltiumPoint): boolean {
  return (
    approximatelyEqual(left.x, right.x) && approximatelyEqual(left.y, right.y)
  )
}

function approximatelyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= 0.01
}

function normalizeLayer(layer: string): string {
  return layer.replace(/[\s_-]+/gu, "").toUpperCase()
}

function getPointX(point: AltiumPoint): number {
  return point.x
}

function getPointY(point: AltiumPoint): number {
  return point.y
}
