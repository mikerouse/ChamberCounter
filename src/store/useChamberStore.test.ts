import { beforeEach, describe, expect, it } from 'vitest'
import { selectCurrentScenario, useChamberStore } from './useChamberStore'

beforeEach(() => {
	useChamberStore.setState({ scenarios: {}, currentScenarioId: null })
	localStorage.clear()
})

function api() {
	return useChamberStore.getState()
}

describe('useChamberStore: scenarios', () => {
	it('createScenario sets current and stores scenario', () => {
		const id = api().createScenario('Budget', 52)
		expect(api().currentScenarioId).toBe(id)
		const current = selectCurrentScenario(api())
		expect(current?.name).toBe('Budget')
		expect(current?.chamberSize).toBe(52)
		expect(current?.enabledRules).toHaveLength(1)
		expect(current?.enabledRules[0].kind).toBe('simple-majority')
	})

	it('duplicateScenario clones and selects the copy', () => {
		const orig = api().createScenario('A', 10)
		const copy = api().duplicateScenario(orig)
		expect(copy).toBeTruthy()
		expect(copy).not.toBe(orig)
		expect(api().currentScenarioId).toBe(copy)
		expect(api().scenarios[copy!].name).toBe('A (copy)')
	})

	it('deleteScenario re-selects another scenario if the current one is removed', () => {
		const a = api().createScenario('A', 10)
		const b = api().createScenario('B', 10)
		api().selectScenario(a)
		api().deleteScenario(a)
		expect(api().currentScenarioId).toBe(b)
		expect(api().scenarios[a]).toBeUndefined()
	})

	it('renameScenario updates the name', () => {
		const id = api().createScenario('Foo', 10)
		api().renameScenario(id, 'Bar')
		expect(api().scenarios[id].name).toBe('Bar')
	})
})

describe('useChamberStore: parties + councillors', () => {
	it('addParty and setPartyCount produce the expected councillor count', () => {
		const id = api().createScenario('S', 10)
		const pa = api().addParty(id, 'Lab', '#E4003B')
		const pb = api().addParty(id, 'Con', '#0087DC')
		api().setPartyCount(id, pa, 6)
		api().setPartyCount(id, pb, 4)
		const s = api().scenarios[id]
		expect(s.councillors.filter(c => c.partyId === pa)).toHaveLength(6)
		expect(s.councillors.filter(c => c.partyId === pb)).toHaveLength(4)
		expect(s.councillors).toHaveLength(10)
	})

	it('setPartyCount caps total at chamberSize', () => {
		const id = api().createScenario('S', 5)
		const pa = api().addParty(id, 'A', '#000')
		api().setPartyCount(id, pa, 100)
		expect(api().scenarios[id].councillors).toHaveLength(5)
	})

	it('reducing a party count clears Mayor designation if the Mayor is dropped', () => {
		const id = api().createScenario('S', 5)
		const pa = api().addParty(id, 'A', '#000')
		api().setPartyCount(id, pa, 5)
		const mayor = api().scenarios[id].councillors[4]
		api().setMayor(id, mayor.id)
		expect(api().scenarios[id].councillors.find(c => c.isMayor)?.id).toBeDefined()
		api().setPartyCount(id, pa, 2)
		expect(api().scenarios[id].councillors.find(c => c.isMayor)).toBeUndefined()
	})

	it('removeParty refuses when councillors still belong to the party', () => {
		const id = api().createScenario('S', 5)
		const pa = api().addParty(id, 'A', '#000')
		api().setPartyCount(id, pa, 3)
		api().removeParty(id, pa)
		expect(api().scenarios[id].parties).toHaveLength(1)
		api().setPartyCount(id, pa, 0)
		api().removeParty(id, pa)
		expect(api().scenarios[id].parties).toHaveLength(0)
	})

	it('applyUKPresets adds preset parties without duplicating existing names', () => {
		const id = api().createScenario('S', 52)
		api().addParty(id, 'Labour', '#E4003B')
		api().applyUKPresets(id)
		const names = api().scenarios[id].parties.map(p => p.name)
		expect(names.filter(n => n === 'Labour')).toHaveLength(1)
		expect(names).toContain('Conservative')
		expect(names).toContain('Advance UK')
	})
})

describe('useChamberStore: Mayor seat assignment', () => {
	it('Mayor takes the centre-front seat after designation', () => {
		const id = api().createScenario('S', 52)
		const pa = api().addParty(id, 'A', '#000')
		api().setPartyCount(id, pa, 52)
		const target = api().scenarios[id].councillors[10]
		api().setMayor(id, target.id)
		const updated = api().scenarios[id].councillors.find(c => c.id === target.id)
		expect(updated?.isMayor).toBe(true)
		const others = api().scenarios[id].councillors.filter(c => !c.isMayor)
		expect(others.some(c => c.seatIndex === updated!.seatIndex)).toBe(false)
	})

	it('passing null to setMayor clears the Mayor', () => {
		const id = api().createScenario('S', 10)
		const pa = api().addParty(id, 'A', '#000')
		api().setPartyCount(id, pa, 10)
		const target = api().scenarios[id].councillors[2]
		api().setMayor(id, target.id)
		expect(api().scenarios[id].councillors.some(c => c.isMayor)).toBe(true)
		api().setMayor(id, null)
		expect(api().scenarios[id].councillors.some(c => c.isMayor)).toBe(false)
	})

	it('only one councillor can be Mayor at a time', () => {
		const id = api().createScenario('S', 10)
		const pa = api().addParty(id, 'A', '#000')
		api().setPartyCount(id, pa, 10)
		const c0 = api().scenarios[id].councillors[0]
		const c1 = api().scenarios[id].councillors[1]
		api().setMayor(id, c0.id)
		api().setMayor(id, c1.id)
		const mayors = api().scenarios[id].councillors.filter(c => c.isMayor)
		expect(mayors).toHaveLength(1)
		expect(mayors[0].id).toBe(c1.id)
	})
})

describe('useChamberStore: votes and rules', () => {
	it('setVote and resetVotes update the councillor vote state', () => {
		const id = api().createScenario('S', 5)
		const pa = api().addParty(id, 'A', '#000')
		api().setPartyCount(id, pa, 5)
		const c = api().scenarios[id].councillors[0]
		api().setVote(id, c.id, 'aye')
		expect(api().scenarios[id].councillors.find(x => x.id === c.id)?.vote).toBe('aye')
		api().resetVotes(id)
		expect(api().scenarios[id].councillors.every(x => x.vote === 'unassigned')).toBe(true)
	})

	it('toggleRule removes and re-adds rules', () => {
		const id = api().createScenario('S', 5)
		expect(api().scenarios[id].enabledRules).toHaveLength(1)
		api().toggleRule(id, 'whole-chamber-majority')
		expect(api().scenarios[id].enabledRules.some(r => r.kind === 'whole-chamber-majority')).toBe(true)
		api().toggleRule(id, 'whole-chamber-majority')
		expect(api().scenarios[id].enabledRules.some(r => r.kind === 'whole-chamber-majority')).toBe(false)
	})

	it('toggleRule adds supermajority with default 2/3 fraction', () => {
		const id = api().createScenario('S', 52)
		api().toggleRule(id, 'supermajority')
		const rule = api().scenarios[id].enabledRules.find(r => r.kind === 'supermajority')
		expect(rule?.kind === 'supermajority' && rule.numerator).toBe(2)
		expect(rule?.kind === 'supermajority' && rule.denominator).toBe(3)
	})

	it('setSupermajorityFraction updates the threshold', () => {
		const id = api().createScenario('S', 52)
		api().toggleRule(id, 'supermajority')
		api().setSupermajorityFraction(id, 3, 4)
		const rule = api().scenarios[id].enabledRules.find(r => r.kind === 'supermajority')
		expect(rule?.kind === 'supermajority' && rule.numerator).toBe(3)
		expect(rule?.kind === 'supermajority' && rule.denominator).toBe(4)
	})

	it('setSupermajorityFraction rejects invalid fractions', () => {
		const id = api().createScenario('S', 52)
		api().toggleRule(id, 'supermajority')
		api().setSupermajorityFraction(id, 5, 4)
		api().setSupermajorityFraction(id, 0, 4)
		api().setSupermajorityFraction(id, 2, 0)
		const rule = api().scenarios[id].enabledRules.find(r => r.kind === 'supermajority')
		expect(rule?.kind === 'supermajority' && rule.numerator).toBe(2)
		expect(rule?.kind === 'supermajority' && rule.denominator).toBe(3)
	})

	it('setMayorBreaksTies flips the flag on simple-majority', () => {
		const id = api().createScenario('S', 5)
		api().setMayorBreaksTies(id, false)
		const rule = api().scenarios[id].enabledRules.find(r => r.kind === 'simple-majority')
		expect(rule?.kind === 'simple-majority' && rule.mayorBreaksTies).toBe(false)
	})
})

describe('useChamberStore: setPartyVote', () => {
	it('updates only councillors of the given party', () => {
		const id = api().createScenario('S', 8)
		const pa = api().addParty(id, 'A', '#000')
		const pb = api().addParty(id, 'B', '#111')
		api().setPartyCount(id, pa, 5)
		api().setPartyCount(id, pb, 3)
		api().setPartyVote(id, pa, 'aye')
		const s = api().scenarios[id]
		expect(s.councillors.filter(c => c.partyId === pa).every(c => c.vote === 'aye')).toBe(true)
		expect(s.councillors.filter(c => c.partyId === pb).every(c => c.vote === 'unassigned')).toBe(true)
	})

	it('overwrites existing votes for that party', () => {
		const id = api().createScenario('S', 5)
		const pa = api().addParty(id, 'A', '#000')
		api().setPartyCount(id, pa, 5)
		const cs = api().scenarios[id].councillors
		api().setVote(id, cs[0].id, 'no')
		api().setVote(id, cs[1].id, 'abstain')
		api().setPartyVote(id, pa, 'aye')
		expect(api().scenarios[id].councillors.every(c => c.vote === 'aye')).toBe(true)
	})
})

describe('useChamberStore: renameCouncillor', () => {
	it('sets a custom name', () => {
		const id = api().createScenario('S', 3)
		const pa = api().addParty(id, 'A', '#000')
		api().setPartyCount(id, pa, 3)
		const c = api().scenarios[id].councillors[0]
		api().renameCouncillor(id, c.id, 'Sarah Smith')
		expect(api().scenarios[id].councillors.find(x => x.id === c.id)?.name).toBe('Sarah Smith')
	})

	it('clears the name when given empty / whitespace', () => {
		const id = api().createScenario('S', 3)
		const pa = api().addParty(id, 'A', '#000')
		api().setPartyCount(id, pa, 3)
		const c = api().scenarios[id].councillors[0]
		api().renameCouncillor(id, c.id, 'Sarah')
		api().renameCouncillor(id, c.id, '   ')
		expect(api().scenarios[id].councillors.find(x => x.id === c.id)?.name).toBeUndefined()
	})

	it('trims whitespace from the name', () => {
		const id = api().createScenario('S', 3)
		const pa = api().addParty(id, 'A', '#000')
		api().setPartyCount(id, pa, 3)
		const c = api().scenarios[id].councillors[0]
		api().renameCouncillor(id, c.id, '  Sarah Smith  ')
		expect(api().scenarios[id].councillors.find(x => x.id === c.id)?.name).toBe('Sarah Smith')
	})
})

describe('useChamberStore: chamber size', () => {
	it('shrinking chamberSize trims excess councillors', () => {
		const id = api().createScenario('S', 10)
		const pa = api().addParty(id, 'A', '#000')
		api().setPartyCount(id, pa, 10)
		api().setChamberSize(id, 5)
		expect(api().scenarios[id].chamberSize).toBe(5)
		expect(api().scenarios[id].councillors).toHaveLength(5)
	})

	it('clamps chamber size to [1, 200]', () => {
		const id = api().createScenario('S', 10)
		api().setChamberSize(id, 0)
		expect(api().scenarios[id].chamberSize).toBe(1)
		api().setChamberSize(id, 5000)
		expect(api().scenarios[id].chamberSize).toBe(200)
	})
})
