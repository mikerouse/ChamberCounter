import { useMemo } from 'react'
import { evaluate } from '@/domain/threshold'
import { selectCurrentScenario, useChamberStore } from '@/store/useChamberStore'
import { ayeLabel, noLabel } from '@/domain/types'
import { ResultCard } from './ResultCard'

export function ResultsStrip() {
	const scenario = useChamberStore(selectCurrentScenario)
	const setCastingVote = useChamberStore(s => s.setCastingVote)

	const results = useMemo(() => (scenario ? evaluate(scenario) : []), [scenario])

	if (!scenario || results.length === 0) return null

	const aLabel = ayeLabel(scenario)
	const nLabel = noLabel(scenario)

	return (
		<div
			role="status"
			aria-live="polite"
			aria-label="Vote result"
			className={`grid gap-2 ${results.length === 1 ? 'grid-cols-1' : results.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
		>
			{results.map((r, i) => (
				<ResultCard
					key={`${r.rule.kind}-${i}`}
					result={r}
					castingVote={scenario.castingVote}
					ayeLabel={aLabel}
					noLabel={nLabel}
					onCast={vote => setCastingVote(scenario.id, vote)}
				/>
			))}
		</div>
	)
}
