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
	'pending-mayor': {
		badge: 'PENDING',
		bg: 'bg-slate-50 border-slate-200',
		text: 'text-slate-600',
		dot: 'bg-slate-500',
	},
}

const RULE_LABEL: Record<RuleResult['rule']['kind'], string> = {
	'simple-majority': 'Simple majority',
	'whole-chamber-majority': 'Whole-chamber majority',
}

type Props = {
	result: RuleResult
	onCast?: (vote: CastVote) => void
}

export function ResultCard({ result, onCast }: Props) {
	const style = OUTCOME_STYLE[result.outcome]
	const label = RULE_LABEL[result.rule.kind]
	const isSimpleWithCasting = result.rule.kind === 'simple-majority' && result.rule.mayorBreaksTies

	const tieAwaitingCasting =
		(result.outcome === 'tie' || result.outcome === 'pending-mayor') &&
		result.mayorVote !== undefined &&
		isSimpleWithCasting

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
			{tieAwaitingCasting && onCast && (
				<div className="mt-2 grid grid-cols-2 gap-2">
					<button
						type="button"
						onClick={() => onCast('aye')}
						className="rounded bg-emerald-500 px-2 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
					>
						Cast Aye
					</button>
					<button
						type="button"
						onClick={() => onCast('no')}
						className="rounded bg-rose-500 px-2 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"
					>
						Cast No
					</button>
				</div>
			)}
		</div>
	)
}
