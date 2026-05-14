import LZString from 'lz-string'
import type {
	CastingVote,
	Councillor,
	Party,
	Scenario,
	ThresholdRule,
	VoteLabels,
	VoteState,
} from './types'

const SHARE_HASH_PREFIX = 's='
const SHARE_GROUP_HASH_PREFIX = 'sg='

type SharePayload = Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>

const VOTE_CODE: Record<Exclude<VoteState, 'unassigned'>, 'a' | 'n' | 'b' | 'o'> = {
	aye: 'a',
	no: 'n',
	abstain: 'b',
	absent: 'o',
}
const VOTE_FROM_CODE: Record<string, VoteState> = {
	a: 'aye',
	n: 'no',
	b: 'abstain',
	o: 'absent',
}

type CompactCouncillor =
	| number
	| {
			p: number
			m?: 1
			v?: 'a' | 'n' | 'b' | 'o'
			n?: string
			t?: string
	  }

type CompactRule =
	| ['s', 0 | 1]
	| 'w'
	| ['m', number, number]

type CompactPayload = {
	n: string
	s: number
	p: Array<[string, string]>
	c: CompactCouncillor[]
	r: CompactRule[]
	k?: 'a' | 'n'
	q?: number
	l?: [string, string]
}

function encodeRule(rule: ThresholdRule): CompactRule {
	if (rule.kind === 'simple-majority') return ['s', rule.mayorBreaksTies ? 1 : 0]
	if (rule.kind === 'whole-chamber-majority') return 'w'
	return ['m', rule.numerator, rule.denominator]
}

function decodeRule(r: CompactRule): ThresholdRule | null {
	if (r === 'w') return { kind: 'whole-chamber-majority' }
	if (Array.isArray(r)) {
		if (r[0] === 's') return { kind: 'simple-majority', mayorBreaksTies: r[1] === 1 }
		if (r[0] === 'm') return { kind: 'supermajority', numerator: r[1], denominator: r[2] }
	}
	return null
}

function encodeCouncillor(c: Councillor, partyIdx: number): CompactCouncillor {
	const isAllDefault =
		!c.isMayor && c.vote === 'unassigned' && !c.name?.trim() && !c.notes?.trim()
	if (isAllDefault) return partyIdx
	const obj: Exclude<CompactCouncillor, number> = { p: partyIdx }
	if (c.isMayor) obj.m = 1
	if (c.vote !== 'unassigned') obj.v = VOTE_CODE[c.vote]
	if (c.name?.trim()) obj.n = c.name
	if (c.notes?.trim()) obj.t = c.notes
	return obj
}

function toCompact(scenario: Scenario): CompactPayload {
	const partyIndex = new Map<string, number>()
	scenario.parties.forEach((p, i) => partyIndex.set(p.id, i))

	const compact: CompactPayload = {
		n: scenario.name,
		s: scenario.chamberSize,
		p: scenario.parties.map(p => [p.name, p.colour] as [string, string]),
		c: scenario.councillors.map(c => encodeCouncillor(c, partyIndex.get(c.partyId) ?? 0)),
		r: scenario.enabledRules.map(encodeRule),
	}
	if (scenario.castingVote) compact.k = scenario.castingVote === 'aye' ? 'a' : 'n'
	if (scenario.quorum !== undefined) compact.q = scenario.quorum
	if (scenario.voteLabels) compact.l = [scenario.voteLabels.aye, scenario.voteLabels.no]
	return compact
}

function fromCompact(raw: unknown): SharePayload | null {
	if (!raw || typeof raw !== 'object') return null
	const c = raw as CompactPayload
	if (typeof c.n !== 'string') return null
	if (typeof c.s !== 'number' || !Number.isFinite(c.s)) return null
	if (!Array.isArray(c.p) || !Array.isArray(c.c) || !Array.isArray(c.r)) return null

	const parties: Party[] = c.p.map((entry, i) => {
		const [name, colour] = entry
		return { id: `p${i}`, name: String(name ?? ''), colour: String(colour ?? '#94a3b8') }
	})

	const councillors: Councillor[] = c.c.map((entry, idx) => {
		const base = (partyIdx: number): Councillor => ({
			id: `c${idx}`,
			partyId: parties[partyIdx]?.id ?? parties[0]?.id ?? '',
			isMayor: false,
			seatIndex: idx,
			vote: 'unassigned',
		})
		if (typeof entry === 'number') return base(entry)
		const filled = base(typeof entry.p === 'number' ? entry.p : 0)
		if (entry.m === 1) filled.isMayor = true
		if (entry.v && VOTE_FROM_CODE[entry.v]) filled.vote = VOTE_FROM_CODE[entry.v]
		if (typeof entry.n === 'string') filled.name = entry.n
		if (typeof entry.t === 'string') filled.notes = entry.t
		return filled
	})

	const enabledRules: ThresholdRule[] = []
	for (const r of c.r) {
		const rule = decodeRule(r)
		if (rule) enabledRules.push(rule)
	}

	const payload: SharePayload = {
		name: c.n,
		chamberSize: c.s,
		parties,
		councillors,
		enabledRules,
	}
	let casting: CastingVote | undefined
	if (c.k === 'a') casting = 'aye'
	else if (c.k === 'n') casting = 'no'
	if (casting) payload.castingVote = casting
	if (typeof c.q === 'number') payload.quorum = c.q
	if (Array.isArray(c.l) && c.l.length === 2) {
		const labels: VoteLabels = { aye: String(c.l[0]), no: String(c.l[1]) }
		payload.voteLabels = labels
	}
	return payload
}

export function encodeScenarioForShare(scenario: Scenario): string {
	return LZString.compressToEncodedURIComponent(JSON.stringify(toCompact(scenario)))
}

export function decodeSharedScenario(encoded: string): SharePayload | null {
	try {
		const json = LZString.decompressFromEncodedURIComponent(encoded)
		if (!json) return null
		return fromCompact(JSON.parse(json))
	} catch {
		return null
	}
}

export function encodeScenariosForShare(scenarios: Scenario[]): string {
	const arr = scenarios.map(toCompact)
	return LZString.compressToEncodedURIComponent(JSON.stringify(arr))
}

export function decodeSharedScenarioGroup(encoded: string): SharePayload[] | null {
	try {
		const json = LZString.decompressFromEncodedURIComponent(encoded)
		if (!json) return null
		const arr = JSON.parse(json)
		if (!Array.isArray(arr)) return null
		const out: SharePayload[] = []
		for (const raw of arr) {
			const p = fromCompact(raw)
			if (p) out.push(p)
		}
		return out.length > 0 ? out : null
	} catch {
		return null
	}
}

export function buildShareUrl(scenario: Scenario): string {
	const url = new URL(window.location.href)
	url.hash = `${SHARE_HASH_PREFIX}${encodeScenarioForShare(scenario)}`
	return url.toString()
}

export function buildGroupShareUrl(scenarios: Scenario[]): string {
	const url = new URL(window.location.href)
	url.hash = `${SHARE_GROUP_HASH_PREFIX}${encodeScenariosForShare(scenarios)}`
	return url.toString()
}

export type SharedFromHash =
	| { kind: 'single'; payload: SharePayload }
	| { kind: 'group'; payloads: SharePayload[] }
	| null

export function readSharedFromHash(): SharedFromHash {
	const hash = window.location.hash
	if (hash.startsWith(`#${SHARE_GROUP_HASH_PREFIX}`)) {
		const encoded = hash.slice(`#${SHARE_GROUP_HASH_PREFIX}`.length)
		const arr = decodeSharedScenarioGroup(encoded)
		return arr ? { kind: 'group', payloads: arr } : null
	}
	if (hash.startsWith(`#${SHARE_HASH_PREFIX}`)) {
		const encoded = hash.slice(`#${SHARE_HASH_PREFIX}`.length)
		const p = decodeSharedScenario(encoded)
		return p ? { kind: 'single', payload: p } : null
	}
	return null
}

export function clearShareHash(): void {
	const url = new URL(window.location.href)
	url.hash = ''
	window.history.replaceState(null, '', url.pathname + url.search)
}

export type { SharePayload }
