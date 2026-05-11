import { describe, it, expect } from 'vitest'
import { countByVote, evaluate, evaluateRule } from './threshold'
import type { Councillor, Scenario, ThresholdRule, VoteState } from './types'

function makeCouncillors(votes: VoteState[], mayorIndex = -1): Councillor[] {
	return votes.map((v, i) => ({
		id: `c${i}`,
		partyId: 'p',
		isMayor: i === mayorIndex,
		seatIndex: i,
		vote: v,
	}))
}

function makeScenario(councillors: Councillor[], rules: ThresholdRule[], chamberSize?: number): Scenario {
	return {
		id: 's',
		name: 't',
		chamberSize: chamberSize ?? councillors.length,
		parties: [{ id: 'p', name: 'P', colour: '#000' }],
		councillors,
		enabledRules: rules,
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

	it('Mayor breaks tie in favour of AYE', () => {
		const s = makeScenario(makeCouncillors(['aye', 'no'], 0), [rule])
		const r = evaluateRule(rule, s)
		expect(r.outcome).toBe('pass-by-casting')
		expect(r.mayorVote).toBe('aye')
	})

	it('Mayor breaks tie in favour of NO', () => {
		const s = makeScenario(makeCouncillors(['aye', 'no'], 1), [rule])
		const r = evaluateRule(rule, s)
		expect(r.outcome).toBe('fail-by-casting')
		expect(r.mayorVote).toBe('no')
	})

	it('still a tie if Mayor abstained', () => {
		const s = makeScenario(makeCouncillors(['aye', 'no', 'abstain'], 2), [rule])
		expect(evaluateRule(rule, s).outcome).toBe('tie')
	})

	it('still a tie if Mayor absent', () => {
		const s = makeScenario(makeCouncillors(['aye', 'no', 'absent'], 2), [rule])
		expect(evaluateRule(rule, s).outcome).toBe('tie')
	})

	it('pending-mayor when tied and Mayor has not yet voted', () => {
		const s = makeScenario(makeCouncillors(['aye', 'no', 'unassigned'], 2), [rule])
		expect(evaluateRule(rule, s).outcome).toBe('pending-mayor')
	})

	it('no Mayor designated → tie outcome', () => {
		const s = makeScenario(makeCouncillors(['aye', 'no']), [rule])
		expect(evaluateRule(rule, s).outcome).toBe('tie')
	})

	it('Mayor only matters at exact tie, not when ayes lead', () => {
		const s = makeScenario(makeCouncillors(['aye', 'aye', 'no'], 2), [rule])
		expect(evaluateRule(rule, s).outcome).toBe('pass')
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
