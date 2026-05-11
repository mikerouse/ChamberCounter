import { useDroppable } from '@dnd-kit/core'
import type { Councillor, Party, VoteState } from '@/domain/types'
import { Dot } from './Dot'

type Props = {
	vote: Exclude<VoteState, 'unassigned'>
	councillors: Councillor[]
	partyById: Map<string, Party>
	displayNames: Map<string, string>
	onContextMenu: (councillorId: string, x: number, y: number) => void
}

const ZONE_THEME: Record<Exclude<VoteState, 'unassigned'>, { label: string; bg: string; text: string; ring: string }> = {
	aye: {
		label: 'Aye',
		bg: 'bg-emerald-50',
		text: 'text-emerald-700',
		ring: 'ring-emerald-300',
	},
	no: {
		label: 'No',
		bg: 'bg-rose-50',
		text: 'text-rose-700',
		ring: 'ring-rose-300',
	},
	abstain: {
		label: 'Abstain',
		bg: 'bg-amber-50',
		text: 'text-amber-700',
		ring: 'ring-amber-300',
	},
	absent: {
		label: 'Absent',
		bg: 'bg-slate-100',
		text: 'text-slate-600',
		ring: 'ring-slate-300',
	},
}

export function VoteZone({ vote, councillors, partyById, displayNames, onContextMenu }: Props) {
	const { isOver, setNodeRef } = useDroppable({
		id: `zone-${vote}`,
		data: { vote },
	})

	const theme = ZONE_THEME[vote]

	return (
		<div
			ref={setNodeRef}
			className={`flex h-full flex-col rounded-lg border border-slate-200 ${theme.bg} p-3 transition ${isOver ? `ring-2 ${theme.ring}` : ''}`}
		>
			<div className="mb-2 flex items-center justify-between">
				<span className={`text-xs font-semibold uppercase tracking-wider ${theme.text}`}>{theme.label}</span>
				<span className={`rounded bg-white/70 px-1.5 py-0.5 text-xs font-medium tabular-nums ${theme.text}`}>
					{councillors.length}
				</span>
			</div>
			<div className="flex flex-1 flex-wrap content-start gap-1.5 overflow-y-auto">
				{councillors.map(c => (
					<Dot
						key={c.id}
						councillor={c}
						party={partyById.get(c.partyId)}
						displayName={displayNames.get(c.id) ?? c.id}
						onContextMenu={onContextMenu}
					/>
				))}
			</div>
		</div>
	)
}
