import type { RuleResult } from '@/domain/types'

type CastVote = 'aye' | 'no'

const OUTCOME_STYLE: Record<RuleResult['outcome'], { badge: string; bg: string; text: string; dot: string }> = {
	pass: {
		badge: 'PASSES',
		bg: 'bg-emerald-50 border-emerald-200',
		text: 'text-emerald-700',
		dot: 'bg-emerald-500',
	},
	fail: {
		badge: 'FAILS',
		bg: 'bg-rose-50 border-rose-200',
		text: 'text-rose-700',
		dot: 'bg-rose-500',
	},
	tie: {
		badge: 'TIE',
		bg: 'bg-amber-50 border-amber-200',
		text: 'text-amber-700',
		dot: 'bg-amber-500',
	},
	'pass-by-casting': {
		badge: 'PASSES (Mayor)',
		bg: 'bg-emerald-50 border-emerald-200',
		text: 'text-emerald-700',
		dot: 'bg-emerald-500',
	},
	'fail-by-casting': {
		badge: 'FAILS (Mayor)',
		bg: 'bg-rose-50 border-rose-200',
		text: 'text-rose-700',
		dot: 'bg-rose-500',
	},
	'pending-casting': {
		badge: 'AWAITING CAST',
		bg: 'bg-amber-50 border-amber-300',
		text: 'text-amber-800',
		dot: 'bg-amber-500',
	},
}

const RULE_LABEL: Record<RuleResult['rule']['kind'], string> = {
	'simple-majority': 'Simple majority',
	'whole-chamber-majority': 'Whole-chamber majority',
}

type Props = {
	result: RuleResult
	castingVote?: CastVote
	onCast?: (vote: CastVote | null) => void
}

export function ResultCard({ result, castingVote, onCast }: Props) {
	const style = OUTCOME_STYLE[result.outcome]
	const label = RULE_LABEL[result.rule.kind]
	const isSimpleWithCasting = result.rule.kind === 'simple-majority' && result.rule.mayorBreaksTies

	const showCastingControls =
		isSimpleWithCasting &&
		onCast &&
		(result.outcome === 'pending-casting' ||
			result.outcome === 'pass-by-casting' ||
			result.outcome === 'fail-by-casting')

	return (
		<div className={`rounded-lg border ${style.bg} p-3`}>
			<div className="flex items-start justify-between gap-2">
				<div className="flex flex-col">
					<span className="text-xs font-semibold uppercase tracking-wide text-slate-700">{label}</span>
					{isSimpleWithCasting && (
						<span className="text-[10px] text-slate-400">Mayor casts on tie</span>
					)}
				</div>
				<span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold ${style.text}`}>
					<span className={`inline-block h-2 w-2 rounded-full ${style.dot}`} />
					{style.badge}
				</span>
			</div>
			<p className="mt-1.5 text-xs leading-snug text-slate-600">{result.explanation}</p>
			{showCastingControls && (
				<div className="mt-2 space-y-1.5">
					<div className="grid grid-cols-2 gap-2">
						<button
							type="button"
							onClick={() => onCast('aye')}
							aria-pressed={castingVote === 'aye'}
							className={`rounded px-2 py-1.5 text-xs font-semibold shadow-sm focus:outline-none focus-visible:ring-2 ${
								castingVote === 'aye'
									? 'bg-emerald-600 text-white ring-2 ring-emerald-700'
									: 'bg-emerald-500 text-white hover:bg-emerald-600 focus-visible:ring-emerald-700'
							}`}
						>
							{castingVote === 'aye' ? '✓ Cast Aye' : 'Cast Aye'}
						</button>
						<button
							type="button"
							onClick={() => onCast('no')}
							aria-pressed={castingVote === 'no'}
							className={`rounded px-2 py-1.5 text-xs font-semibold shadow-sm focus:outline-none focus-visible:ring-2 ${
								castingVote === 'no'
									? 'bg-rose-600 text-white ring-2 ring-rose-700'
									: 'bg-rose-500 text-white hover:bg-rose-600 focus-visible:ring-rose-700'
							}`}
						>
							{castingVote === 'no' ? '✓ Cast No' : 'Cast No'}
						</button>
					</div>
					{castingVote && (
						<button
							type="button"
							onClick={() => onCast(null)}
							className="w-full text-[11px] text-slate-500 underline-offset-2 hover:underline"
						>
							Clear casting vote
						</button>
					)}
				</div>
			)}
		</div>
	)
}
