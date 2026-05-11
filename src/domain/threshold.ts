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
		// tied (ayes == noes)
		if (!rule.mayorBreaksTies) {
			return { ...base, outcome: 'tie', explanation: `Tied ${counts.aye}–${counts.no}. No casting vote configured.` }
		}
		const mayor = findMayor(scenario)
		if (!mayor) {
			return { ...base, outcome: 'tie', explanation: `Tied ${counts.aye}–${counts.no}. No Mayor designated to cast a vote.` }
		}
		// Mayor + casting-on-tie rule: an explicit second vote is required.
		if (scenario.castingVote === 'aye') {
			return {
				...base,
				outcome: 'pass-by-casting',
				mayorVote: 'aye',
				explanation: `Tied ${counts.aye}–${counts.no}. Mayor's casting vote: AYE → passes ${counts.aye + 1}–${counts.no}.`,
			}
		}
		if (scenario.castingVote === 'no') {
			return {
				...base,
				outcome: 'fail-by-casting',
				mayorVote: 'no',
				explanation: `Tied ${counts.aye}–${counts.no}. Mayor's casting vote: NO → fails ${counts.aye}–${counts.no + 1}.`,
			}
		}
		return {
			...base,
			outcome: 'pending-casting',
			explanation: `Tied ${counts.aye}–${counts.no}. Mayor's casting vote required to break the tie.`,
		}
	}

	if (rule.kind === 'whole-chamber-majority') {
		const needed = Math.floor(scenario.chamberSize / 2) + 1
		if (counts.aye >= needed) {
			return { ...base, outcome: 'pass', needed, explanation: `${counts.aye} ayes ≥ ${needed} required (majority of ${scenario.chamberSize}).` }
		}
		return { ...base, outcome: 'fail', needed, explanation: `${counts.aye} ayes < ${needed} required (majority of ${scenario.chamberSize}).` }
	}

	// supermajority — fraction of the whole chamber
	const needed = Math.ceil((rule.numerator * scenario.chamberSize) / rule.denominator)
	const label = `${rule.numerator}/${rule.denominator} of ${scenario.chamberSize}`
	if (counts.aye >= needed) {
		return { ...base, outcome: 'pass', needed, explanation: `${counts.aye} ayes ≥ ${needed} required (${label}).` }
	}
	return { ...base, outcome: 'fail', needed, explanation: `${counts.aye} ayes < ${needed} required (${label}).` }
}

export function evaluate(scenario: Scenario): RuleResult[] {
	return scenario.enabledRules.map(rule => evaluateRule(rule, scenario))
}
