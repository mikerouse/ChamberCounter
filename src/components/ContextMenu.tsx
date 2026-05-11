import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { VoteState } from '@/domain/types'

export type ContextMenuTarget = {
	councillorId: string
	displayName: string
	partyId: string
	partyName: string
	x: number
	y: number
}

type Props = {
	target: ContextMenuTarget
	onClose: () => void
	onRename: (councillorId: string, newName: string) => void
	onPartyVote: (partyId: string, vote: Exclude<VoteState, 'unassigned'>) => void
}

const PARTY_VOTES: Array<{ vote: Exclude<VoteState, 'unassigned'>; label: string; dot: string }> = [
	{ vote: 'aye', label: 'votes Aye', dot: 'bg-emerald-500' },
	{ vote: 'no', label: 'votes No', dot: 'bg-rose-500' },
	{ vote: 'abstain', label: 'abstains', dot: 'bg-amber-500' },
	{ vote: 'absent', label: 'is absent', dot: 'bg-slate-400' },
]

export function ContextMenu({ target, onClose, onRename, onPartyVote }: Props) {
	const ref = useRef<HTMLDivElement>(null)
	const [pos, setPos] = useState({ left: target.x, top: target.y })

	useLayoutEffect(() => {
		const el = ref.current
		if (!el) return
		const rect = el.getBoundingClientRect()
		const vw = window.innerWidth
		const vh = window.innerHeight
		let left = target.x
		let top = target.y
		if (left + rect.width + 8 > vw) left = vw - rect.width - 8
		if (top + rect.height + 8 > vh) top = vh - rect.height - 8
		if (left < 8) left = 8
		if (top < 8) top = 8
		setPos({ left, top })
	}, [target.x, target.y])

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		const onClick = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) onClose()
		}
		document.addEventListener('keydown', onKey)
		document.addEventListener('mousedown', onClick)
		return () => {
			document.removeEventListener('keydown', onKey)
			document.removeEventListener('mousedown', onClick)
		}
	}, [onClose])

	const handleRename = () => {
		const next = window.prompt(`Rename councillor`, target.displayName)
		onClose()
		if (next === null) return
		onRename(target.councillorId, next)
	}

	return (
		<div
			ref={ref}
			role="menu"
			style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 100 }}
			className="w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
			onContextMenu={e => e.preventDefault()}
		>
			<div className="border-b border-slate-100 px-3 py-2">
				<p className="truncate text-xs font-semibold text-slate-700">{target.displayName}</p>
				<p className="truncate text-[11px] text-slate-500">{target.partyName}</p>
			</div>
			<button
				type="button"
				role="menuitem"
				onClick={handleRename}
				className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
			>
				<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
					<path d="M2 14l3-1 8-8-2-2-8 8-1 3z" />
					<path d="M11 3l2 2" />
				</svg>
				Rename councillor…
			</button>
			<div className="border-t border-slate-100 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
				All {target.partyName}
			</div>
			{PARTY_VOTES.map(({ vote, label, dot }) => (
				<button
					key={vote}
					type="button"
					role="menuitem"
					onClick={() => {
						onPartyVote(target.partyId, vote)
						onClose()
					}}
					className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
				>
					<span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
					<span>Party {label}</span>
				</button>
			))}
		</div>
	)
}
