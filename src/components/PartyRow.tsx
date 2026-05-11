import { useChamberStore } from '@/store/useChamberStore'
import type { Party } from '@/domain/types'

type Props = {
	scenarioId: string
	party: Party
	count: number
	remaining: number
}

export function PartyRow({ scenarioId, party, count, remaining }: Props) {
	const updateParty = useChamberStore(s => s.updateParty)
	const setPartyCount = useChamberStore(s => s.setPartyCount)
	const removeParty = useChamberStore(s => s.removeParty)

	const max = count + remaining

	return (
		<div className="flex items-center gap-2 py-1.5">
			<label className="relative inline-block h-6 w-6 shrink-0 cursor-pointer rounded-full border border-slate-300 shadow-sm" style={{ backgroundColor: party.colour }} aria-label={`Colour for ${party.name}`}>
				<input
					type="color"
					value={party.colour}
					onChange={e => updateParty(scenarioId, party.id, { colour: e.target.value })}
					className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
				/>
			</label>
			<input
				type="text"
				value={party.name}
				onChange={e => updateParty(scenarioId, party.id, { name: e.target.value })}
				className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-sm focus:border-slate-400 focus:outline-none"
				placeholder="Party name"
			/>
			<input
				type="number"
				min={0}
				max={max}
				value={count}
				onChange={e => setPartyCount(scenarioId, party.id, Number(e.target.value))}
				className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-right text-sm tabular-nums focus:border-slate-400 focus:outline-none"
				aria-label={`Seat count for ${party.name}`}
			/>
			<button
				type="button"
				onClick={() => removeParty(scenarioId, party.id)}
				disabled={count > 0}
				className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
				title={count > 0 ? 'Set count to 0 before removing' : 'Remove party'}
				aria-label={`Remove ${party.name}`}
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
					<path d="M3 3l10 10M13 3L3 13" />
				</svg>
			</button>
		</div>
	)
}
