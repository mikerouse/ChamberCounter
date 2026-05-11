import { describe, it, expect } from 'vitest'
import { countByVote, evaluate, evaluateRule } from './threshold'
import type { CastingVote, Councillor, Scenario, ThresholdRule, VoteState } from './types'

function makeCouncillors(votes: VoteState[], mayorIndex = -1): Councillor[] {
	return votes.map((v, i) => ({
		id: `c${i}`,
		partyId: 'p',
		isMayor: i === mayorIndex,
		seatIndex: i,
		vote: v,
	}))
}

function makeScenario(
	councillors: Councillor[],
	rules: ThresholdRule[],
	chamberSize?: number,
	castingVote?: CastingVote,
): Scenario {
	return {
		id: 's',
		name: 't',
		chamberSize: chamberSize ?? councillors.length,
		parties: [{ id: 'p', name: 'P', colour: '#000' }],
		councillors,
		enabledRules: rules,
		castingVote,
		createdAt: 0,
		updatedAt: 0,
	}
}

describe('countByVote', () => {
	it('tallies all vote states', () => {
		const c = makeCouncillors(['aye', 'aye', 'no', 'abstain', 'absent', 'unassigned'])
		expect(countByVote(c)).toEqual({ aye: 2, no: 1, abstain: 1, absent: 1, unassigned: 1 })
	})

	it('returns zeros for empty list', () => {
		expect(countByVote([])).toEqual({ aye: 0, no: 0, abstain: 0, absent: 0, unassigned: 0 })
	})
})

describe('evaluateRule: simple-majority', () => {
	const rule: ThresholdRule = { kind: 'simple-majority', mayorBreaksTies: false }

	it('passes when ayes > noes', () => {
		const s = makeScenario(makeCouncillors(['aye', 'aye', 'no']), [rule])
		expect(evaluateRule(rule, s).outcome).toBe('pass')
	})

	it('fails when noes > ayes', () => {
		const s = makeScenario(makeCouncillors(['no', 'no', 'aye']), [rule])
		expect(evaluateRule(rule, s).outcome).toBe('fail')
	})

	it('returns tie when ayes == noes and no casting vote', () => {
		const s = makeScenario(makeCouncillors(['aye', 'no']), [rule])
		expect(evaluateRule(rule, s).outcome).toBe('tie')
	})

	it('abstentions and absences do not count', () => {
		const s = makeScenario(makeCouncillors(['aye', 'aye', 'no', 'abstain', 'abstain', 'absent']), [rule])
		expect(evaluateRule(rule, s).outcome).toBe('pass')
	})
})

describe('evaluateRule: simple-majority with Mayor casting vote', () => {
	const rule: ThresholdRule = { kind: 'simple-majority', mayorBreaksTies: true }

	it('returns pending-casting on tie when Mayor exists but no casting vote set, regardless of Mayor’s own vote', () => {
		// Mayor voted Aye; non-mayor 1 aye / 2 no → with Mayor: 2–2
		const mayorAye = makeScenario(makeCouncillors(['aye', 'no', 'no', 'aye'], 3), [rule])
		expect(evaluateRule(rule, mayorAye).outcome).toBe('pending-casting')

		// Mayor voted No; non-mayor 2 aye / 1 no → with Mayor: 2–2
		const mayorNo = makeScenario(makeCouncillors(['aye', 'aye', 'no', 'no'], 3), [rule])
		expect(evaluateRule(rule, mayorNo).outcome).toBe('pending-casting')

		// Mayor abstain; non-mayor 2-2
		const mayorAbstain = makeScenario(makeCouncillors(['aye', 'no', 'aye', 'no', 'abstain'], 4), [rule])
		expect(evaluateRule(rule, mayorAbstain).outcome).toBe('pending-casting')

		// Mayor absent; non-mayor 1-1
		const mayorAbsent = makeScenario(makeCouncillors(['aye', 'no', 'absent'], 2), [rule])
		expect(evaluateRule(rule, mayorAbsent).outcome).toBe('pending-casting')

		// Mayor unassigned; non-mayor 1-1
		const mayorUnassigned = makeScenario(makeCouncillors(['aye', 'no', 'unassigned'], 2), [rule])
		expect(evaluateRule(rule, mayorUnassigned).outcome).toBe('pending-casting')
	})

	it('castingVote=aye breaks the tie in favour of pass', () => {
		const s = makeScenario(makeCouncillors(['aye', 'no'], 0), [rule], undefined, 'aye')
		const r = evaluateRule(rule, s)
		expect(r.outcome).toBe('pass-by-casting')
		expect(r.mayorVote).toBe('aye')
		expect(r.explanation).toContain('AYE')
	})

	it('castingVote=no breaks the tie in favour of fail', () => {
		const s = makeScenario(makeCouncillors(['aye', 'no'], 0), [rule], undefined, 'no')
		const r = evaluateRule(rule, s)
		expect(r.outcome).toBe('fail-by-casting')
		expect(r.mayorVote).toBe('no')
		expect(r.explanation).toContain('NO')
	})

	it('Mayor can cast against their own normal vote', () => {
		// Mayor voted Aye normally, but casts NO to defeat the motion.
		const s = makeScenario(makeCouncillors(['aye', 'no'], 0), [rule], undefined, 'no')
		expect(evaluateRule(rule, s).outcome).toBe('fail-by-casting')
	})

	it('castingVote is ignored when not tied', () => {
		const s = makeScenario(makeCouncillors(['aye', 'aye', 'no'], 2), [rule], undefined, 'no')
		const r = evaluateRule(rule, s)
		expect(r.outcome).toBe('pass')
		expect(r.explanation).not.toContain('Mayor')
	})

	it('no Mayor designated → plain tie (castingVote irrelevant)', () => {
		const s = makeScenario(makeCouncillors(['aye', 'no']), [rule], undefined, 'aye')
		expect(evaluateRule(rule, s).outcome).toBe('tie')
	})

	it('mayorBreaksTies disabled → plain tie (castingVote irrelevant)', () => {
		const ruleOff: ThresholdRule = { kind: 'simple-majority', mayorBreaksTies: false }
		const s = makeScenario(makeCouncillors(['aye', 'no'], 0), [ruleOff], undefined, 'aye')
		expect(evaluateRule(ruleOff, s).outcome).toBe('tie')
	})
})

describe('evaluateRule: whole-chamber-majority', () => {
	const rule: ThresholdRule = { kind: 'whole-chamber-majority' }

	it('passes when ayes ≥ floor(total/2)+1', () => {
		const s = makeScenario(makeCouncillors(['aye', 'aye', 'aye', 'no', 'no']), [rule], 5)
		const r = evaluateRule(rule, s)
		expect(r.outcome).toBe('pass')
		expect(r.needed).toBe(3)
	})

	it('fails when ayes < threshold even if ayes > noes', () => {
		const s = makeScenario(makeCouncillors(['aye', 'aye', 'no', 'abstain', 'abstain']), [rule], 10)
		const r = evaluateRule(rule, s)
		expect(r.outcome).toBe('fail')
		expect(r.needed).toBe(6)
	})

	it('threshold for even chambers is half+1', () => {
		const s = makeScenario(makeCouncillors([]), [rule], 52)
		expect(evaluateRule(rule, s).needed).toBe(27)
	})

	it('threshold for odd chambers is (n+1)/2', () => {
		const s = makeScenario(makeCouncillors([]), [rule], 51)
		expect(evaluateRule(rule, s).needed).toBe(26)
	})
})

describe('evaluateRule: supermajority', () => {
	it('two-thirds threshold for 52-seat chamber is 35', () => {
		const rule: ThresholdRule = { kind: 'supermajority', numerator: 2, denominator: 3 }
		const s = makeScenario(makeCouncillors([]), [rule], 52)
		expect(evaluateRule(rule, s).needed).toBe(35)
	})

	it('three-quarters threshold for 52-seat chamber is 39', () => {
		const rule: ThresholdRule = { kind: 'supermajority', numerator: 3, denominator: 4 }
		const s = makeScenario(makeCouncillors([]), [rule], 52)
		expect(evaluateRule(rule, s).needed).toBe(39)
	})

	it('rounds up: 10-seat chamber with 2/3 needs 7', () => {
		const rule: ThresholdRule = { kind: 'supermajority', numerator: 2, denominator: 3 }
		const s = makeScenario(makeCouncillors([]), [rule], 10)
		expect(evaluateRule(rule, s).needed).toBe(7)
	})

	it('passes when ayes meet the threshold', () => {
		const rule: ThresholdRule = { kind: 'supermajority', numerator: 2, denominator: 3 }
		const votes: VoteState[] = [
			...Array(7).fill('aye') as VoteState[],
			...Array(3).fill('no') as VoteState[],
		]
		const s = makeScenario(makeCouncillors(votes), [rule], 10)
		const r = evaluateRule(rule, s)
		expect(r.outcome).toBe('pass')
		expect(r.needed).toBe(7)
	})

	it('fails when ayes fall short even if they beat noes', () => {
		const rule: ThresholdRule = { kind: 'supermajority', numerator: 2, denominator: 3 }
		const votes: VoteState[] = [
			...Array(6).fill('aye') as VoteState[],
			...Array(2).fill('no') as VoteState[],
			...Array(2).fill('abstain') as VoteState[],
		]
		const s = makeScenario(makeCouncillors(votes), [rule], 10)
		const r = evaluateRule(rule, s)
		expect(r.outcome).toBe('fail')
		expect(r.explanation).toContain('2/3 of 10')
	})
})

describe('evaluate', () => {
	it('returns one result per enabled rule, preserving order', () => {
		const rules: ThresholdRule[] = [
			{ kind: 'simple-majority', mayorBreaksTies: true },
			{ kind: 'whole-chamber-majority' },
		]
		const s = makeScenario(makeCouncillors(['aye', 'no', 'aye'], 0), rules, 10)
		const results = evaluate(s)
		expect(results).toHaveLength(2)
		expect(results[0].rule.kind).toBe('simple-majority')
		expect(results[1].rule.kind).toBe('whole-chamber-majority')
	})
})
