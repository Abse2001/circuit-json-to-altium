import { asString } from "../../lib/format"
import type { CircuitElement, SourceNetId, SourcePortId } from "../../lib/types"

type SourcePortGroupKey = string
type SourceTraceConnectionKey = string

export type SourceTraceConnection = {
  sourceNetIds: SourceNetId[]
  sourcePortIds: SourcePortId[]
}

export type NamedNetSourcePorts = {
  sourceNetName: string
  sourcePortIds: SourcePortId[]
}

export type SchematicConnectivitySignature = {
  connectedSourcePortIds: SourcePortId[]
  namedNetSourcePorts: NamedNetSourcePorts[]
  sourcePortIdGroups: SourcePortId[][]
  sourceTraceConnections: SourceTraceConnection[]
}

function getSortedUniqueStrings(strings: string[]): string[] {
  return [...new Set(strings)].sort()
}

function getStringArray(field: unknown): string[] {
  if (!Array.isArray(field)) return []
  return getSortedUniqueStrings(
    field.map((entry) => asString(entry)).filter(Boolean),
  )
}

export function getSchematicConnectivitySignature(
  circuitJson: CircuitElement[],
): SchematicConnectivitySignature {
  const sourceNetNameById = new Map<SourceNetId, string>()
  for (const element of circuitJson) {
    if (element.type !== "source_net") continue
    const sourceNetId = asString(element.source_net_id)
    const sourceNetName = asString(element.name)
    if (sourceNetId && sourceNetName) {
      sourceNetNameById.set(sourceNetId, sourceNetName)
    }
  }

  const sourcePortIdsBySourceNetId = new Map<SourceNetId, Set<SourcePortId>>()
  const sourcePortGroupsByKey = new Map<SourcePortGroupKey, SourcePortId[]>()
  const connectedSourcePortIds = new Set<SourcePortId>()
  const sourceTraceConnectionsByKey = new Map<
    SourceTraceConnectionKey,
    SourceTraceConnection
  >()

  for (const element of circuitJson) {
    if (element.type !== "source_trace") continue
    const sourcePortIds = getStringArray(element.connected_source_port_ids)
    const sourceNetIds = getStringArray(element.connected_source_net_ids)
    if (sourcePortIds.length > 0 || sourceNetIds.length > 0) {
      const sourceTraceConnection = { sourceNetIds, sourcePortIds }
      sourceTraceConnectionsByKey.set(
        JSON.stringify(sourceTraceConnection),
        sourceTraceConnection,
      )
    }
    for (const sourcePortId of sourcePortIds) {
      connectedSourcePortIds.add(sourcePortId)
    }
    if (sourcePortIds.length > 1) {
      sourcePortGroupsByKey.set(sourcePortIds.join("\u0000"), sourcePortIds)
    }
    for (const sourceNetId of sourceNetIds) {
      const sourcePortIdsForNet =
        sourcePortIdsBySourceNetId.get(sourceNetId) ?? new Set<SourcePortId>()
      for (const sourcePortId of sourcePortIds) {
        sourcePortIdsForNet.add(sourcePortId)
      }
      sourcePortIdsBySourceNetId.set(sourceNetId, sourcePortIdsForNet)
    }
  }

  const namedNetSourcePorts = [...sourceNetNameById]
    .map(([sourceNetId, sourceNetName]) => ({
      sourceNetName,
      sourcePortIds: [
        ...(sourcePortIdsBySourceNetId.get(sourceNetId) ?? []),
      ].sort(),
    }))
    .sort((left, right) =>
      left.sourceNetName.localeCompare(right.sourceNetName),
    )

  return {
    connectedSourcePortIds: [...connectedSourcePortIds].sort(),
    namedNetSourcePorts,
    sourcePortIdGroups: [...sourcePortGroupsByKey.values()].sort(
      (left, right) => left.join("\u0000").localeCompare(right.join("\u0000")),
    ),
    sourceTraceConnections: [...sourceTraceConnectionsByKey.values()].sort(
      (left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
    ),
  }
}
