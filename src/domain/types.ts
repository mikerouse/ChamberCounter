export type VoteState = 'unassigned' | 'aye' | 'no' | 'abstain' | 'absent'

export type Party = {
	id: string
	name: string
	colour: string
}

export type Councillor = {
	id: string
	partyId: string
	isMayor: boolean
	seatIndex: number
	vote: VoteState
	name?: string
	notes?: string
}

export type ThresholdRule =
	| { kind: 'simple-majority'; mayorBreaksTies: boolean }
	| { kind: 'whole-chamber-majority' }
	| { kind: 'supermajority'; numerator: number; denominator: number }

export type ThresholdRuleKind = ThresholdRule['kind']

export type CastingVote = 'aye' | 'no'

export type VoteLabels = {
	aye: string
	no: string
}

export const DEFAULT_VOTE_LABELS: VoteLabels = { aye: 'Aye', no: 'No' }

export type Scenario = {
	id: string
	name: string
	chamberSize: number
	parties: Party[]
	councillors: Councillor[]
	enabledRules: ThresholdRule[]
	castingVote?: CastingVote
	quorum?: number
	voteLabels?: VoteLabels
	createdAt: number
	updatedAt: number
}

export function ayeLabel(scenario: Pick<Scenario, 'voteLabels'>): string {
	return scenario.voteLabels?.aye?.trim() || DEFAULT_VOTE_LABELS.aye
}

export function noLabel(scenario: Pick<Scenario, 'voteLabels'>): string {
	return scenario.voteLabels?.no?.trim() || DEFAULT_VOTE_LABELS.no
}

/** UK Local Government Act 1972 sch 12 para 39: quorum is one quarter of the whole council. */
export function defaultQuorum(chamberSize: number): number {
	return Math.max(3, Math.ceil(chamberSize / 4))
}

export function effectiveQuorum(scenario: Scenario): number {
	return scenario.quorum ?? defaultQuorum(scenario.chamberSize)
}

export function presentCount(scenario: Scenario): number {
	return scenario.councillors.filter(c => c.vote !== 'absent').length
}

export type RuleOutcome =
	| 'pass'
	| 'fail'
	| 'tie'
	| 'pass-by-casting'
	| 'fail-by-casting'
	| 'pending-casting'

export type RuleResult = {
	rule: ThresholdRule
	outcome: RuleOutcome
	ayes: number
	noes: number
	abstain: number
	absent: number
	unassigned: number
	needed?: number
	mayorVote?: VoteState
	explanation: string
}
