import type { Councillor, RuleResult, Scenario, ThresholdRule, VoteState } from './types'

type VoteCounts = Record<Exclude<VoteState, never>, number>

export function countByVote(councillors: readonly Councillor[]): VoteCounts {
	const counts: VoteCounts = { unassigned: 0, aye: 0, no: 0, abstain: 0, absent: 0 }
	for (const c of councillors) counts[c.vote]++
	return counts
}

export function findMayor(scenario: Scenario): Councillor | undefined {
	return scenario.councillors.find(c => c.isMayor)
}

export function evaluateRule(rule: ThresholdRule, scenario: Scenario): RuleResult {
	const counts = countByVote(scenario.councillors)
	const base = {
		rule,
		ayes: counts.aye,
		noes: counts.no,
		abstain: counts.abstain,
		absent: counts.absent,
		unassigned: counts.unassigned,
	}

	if (rule.kind === 'simple-majority') {
		if (counts.aye > counts.no) {
			return { ...base, outcome: 'pass', explanation: `Ayes ${counts.aye} beat Noes ${counts.no}.` }
		}
		if (counts.no > counts.aye) {
			return { ...base, outcome: 'fail', explanation: `Noes ${counts.no} beat Ayes ${counts.aye}.` }
		}
		// tie
		if (!rule.mayorBreaksTies) {
			return { ...base, outcome: 'tie', explanation: `Tied ${counts.aye}–${counts.no}. No casting vote configured.` }
		}
		const mayor = findMayor(scenario)
		if (!mayor) {
			return { ...base, outcome: 'tie', explanation: `Tied ${counts.aye}–${counts.no}. No Mayor designated to cast a vote.` }
		}
		if (mayor.vote === 'unassigned') {
			return { ...base, outcome: 'pending-mayor', mayorVote: 'unassigned', explanation: `Tied ${counts.aye}–${counts.no}. Mayor has not yet voted.` }
		}
		if (mayor.vote === 'aye') {
			return { ...base, outcome: 'pass-by-casting', mayorVote: 'aye', explanation: `Tied ${counts.aye}–${counts.no}. Mayor casts AYE → passes.` }
		}
		if (mayor.vote === 'no') {
			return { ...base, outcome: 'fail-by-casting', mayorVote: 'no', explanation: `Tied ${counts.aye}–${counts.no}. Mayor casts NO → fails.` }
		}
		return {
			...base,
			outcome: 'tie',
			mayorVote: mayor.vote,
			explanation: `Tied ${counts.aye}–${counts.no}. Mayor is ${mayor.vote} and cannot break the tie.`,
		}
	}

	// whole-chamber-majority
	const needed = Math.floor(scenario.chamberSize / 2) + 1
	if (counts.aye >= needed) {
		return { ...base, outcome: 'pass', needed, explanation: `${counts.aye} ayes ≥ ${needed} required (majority of ${scenario.chamberSize}).` }
	}
	return { ...base, outcome: 'fail', needed, explanation: `${counts.aye} ayes < ${needed} required (majority of ${scenario.chamberSize}).` }
}

export function evaluate(scenario: Scenario): RuleResult[] {
	return scenario.enabledRules.map(rule => evaluateRule(rule, scenario))
}
