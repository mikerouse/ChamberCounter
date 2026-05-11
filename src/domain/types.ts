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
}

export type ThresholdRule =
	| { kind: 'simple-majority'; mayorBreaksTies: boolean }
	| { kind: 'whole-chamber-majority' }

export type Scenario = {
	id: string
	name: string
	chamberSize: number
	parties: Party[]
	councillors: Councillor[]
	enabledRules: ThresholdRule[]
	createdAt: number
	updatedAt: number
}

export type RuleOutcome =
	| 'pass'
	| 'fail'
	| 'tie'
	| 'pass-by-casting'
	| 'fail-by-casting'
	| 'pending-mayor'

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
