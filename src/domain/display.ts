import type { Councillor, Party } from './types'

export function buildDisplayNames(councillors: readonly Councillor[], parties: readonly Party[]): Map<string, string> {
	const partyIndex = new Map<string, number>()
	parties.forEach((p, i) => partyIndex.set(p.id, i))

	const sorted = [...councillors].sort((a, b) => {
		const pa = partyIndex.get(a.partyId) ?? Number.MAX_SAFE_INTEGER
		const pb = partyIndex.get(b.partyId) ?? Number.MAX_SAFE_INTEGER
		if (pa !== pb) return pa - pb
		return a.id.localeCompare(b.id)
	})

	const partyById = new Map(parties.map(p => [p.id, p] as const))
	const partyCount = new Map<string, number>()
	const result = new Map<string, string>()

	for (const c of sorted) {
		const n = (partyCount.get(c.partyId) ?? 0) + 1
		partyCount.set(c.partyId, n)
		const trimmed = c.name?.trim()
		if (trimmed) {
			result.set(c.id, trimmed)
		} else {
			const party = partyById.get(c.partyId)
			result.set(c.id, `${party?.name ?? 'Unassigned'} #${n}`)
		}
	}

	return result
}
