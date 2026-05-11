import { useMemo } from 'react'
import { countByVote, evaluate } from '@/domain/threshold'
import { effectiveQuorum, presentCount } from '@/domain/types'
import { selectCurrentScenario, useChamberStore } from '@/store/useChamberStore'
import type { RuleResult } from '@/domain/types'

const OUTCOME_STYLE: Record<RuleResult['outcome'], { label: string; bg: string; text: string }> = {
	pass: { label: 'PASSES', bg: 'bg-emerald-100', text: 'text-emerald-800' },
	fail: { label: 'FAILS', bg: 'bg-rose-100', text: 'text-rose-800' },
	tie: { label: 'TIE', bg: 'bg-amber-100', text: 'text-amber-800' },
	'pass-by-casting': { label: 'PASSES (Mayor)', bg: 'bg-emerald-100', text: 'text-emerald-800' },
	'fail-by-casting': { label: 'FAILS (Mayor)', bg: 'bg-rose-100', text: 'text-rose-800' },
	'pending-casting': { label: 'AWAITING CAST', bg: 'bg-amber-100', text: 'text-amber-800' },
}

export function MobileTallyPill() {
	const scenario = useChamberStore(selectCurrentScenario)
	const counts = useMemo(() => (scenario ? countByVote(scenario.councillors) : null), [scenario])
	const results = useMemo(() => (scenario ? evaluate(scenario) : []), [scenario])

	if (!scenario || !counts) return null

	const primary = results[0]
	const quorate = presentCount(scenario) >= effectiveQuorum(scenario)

	return (
		<div className="sticky top-0 z-10 flex shrink-0 items-center justify-center gap-2 border-b border-slate-200 bg-white/95 px-3 py-1.5 backdrop-blur lg:hidden">
			{!quorate && (
				<span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
					Not quorate
				</span>
			)}
			<span className="text-[11px] tabular-nums">
				<span className="font-semibold text-emerald-700">{counts.aye}</span>
				<span className="text-slate-400"> – </span>
				<span className="font-semibold text-rose-700">{counts.no}</span>
				{(counts.abstain > 0 || counts.absent > 0) && (
					<span className="text-slate-400">
						{counts.abstain > 0 && <> · {counts.abstain} abs</>}
						{counts.absent > 0 && <> · {counts.absent} out</>}
					</span>
				)}
			</span>
			{primary && (
				<span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${OUTCOME_STYLE[primary.outcome].bg} ${OUTCOME_STYLE[primary.outcome].text}`}>
					{OUTCOME_STYLE[primary.outcome].label}
				</span>
			)}
		</div>
	)
}
