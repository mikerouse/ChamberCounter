import { useEffect, useRef, useState } from 'react'
import { Reorder, useDragControls } from 'motion/react'
import { useChamberStore } from '@/store/useChamberStore'
import { buildShareUrl } from '@/domain/share'
import { toast } from '@/store/toasts'
import type { Scenario } from '@/domain/types'

type RowProps = {
	scenario: Scenario
	isCurrent: boolean
	onSelect: () => void
	onDuplicate: () => void
	onShare: () => void
	onDelete: () => void
}

function ScenarioRow({ scenario, isCurrent, onSelect, onDuplicate, onShare, onDelete }: RowProps) {
	const [menuOpen, setMenuOpen] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)
	const dragControls = useDragControls()

	useEffect(() => {
		if (!menuOpen) return
		const handler = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setMenuOpen(false)
			}
		}
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [menuOpen])

	return (
		<Reorder.Item
			as="div"
			value={scenario}
			dragListener={false}
			dragControls={dragControls}
			ref={containerRef}
			className={`group relative flex items-center rounded ${isCurrent ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
		>
			<button
				type="button"
				onPointerDown={e => dragControls.start(e)}
				aria-label={`Drag ${scenario.name} to reorder`}
				className="cursor-grab touch-none px-1 py-1 text-slate-300 hover:text-slate-500 active:cursor-grabbing"
			>
				<svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
					<circle cx="2" cy="2" r="1" />
					<circle cx="2" cy="6" r="1" />
					<circle cx="2" cy="10" r="1" />
					<circle cx="6" cy="2" r="1" />
					<circle cx="6" cy="6" r="1" />
					<circle cx="6" cy="10" r="1" />
				</svg>
			</button>
			<button
				type="button"
				onClick={onSelect}
				className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
				aria-current={isCurrent ? 'true' : undefined}
			>
				<span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isCurrent ? 'bg-slate-700' : 'bg-slate-300'}`} />
				<span className="truncate text-sm text-slate-700">{scenario.name}</span>
			</button>
			<span className="shrink-0 pr-1 text-[10px] tabular-nums text-slate-400">{scenario.chamberSize}</span>
			<button
				type="button"
				onClick={() => setMenuOpen(o => !o)}
				className="rounded px-1.5 py-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
				aria-label={`More options for ${scenario.name}`}
				aria-expanded={menuOpen}
				aria-haspopup="menu"
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
					<circle cx="3" cy="8" r="1.5" />
					<circle cx="8" cy="8" r="1.5" />
					<circle cx="13" cy="8" r="1.5" />
				</svg>
			</button>
			{menuOpen && (
				<div
					role="menu"
					className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded border border-slate-200 bg-white shadow-md"
				>
					<button
						type="button"
						role="menuitem"
						onClick={() => {
							onDuplicate()
							setMenuOpen(false)
						}}
						className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
					>
						Duplicate
					</button>
					<button
						type="button"
						role="menuitem"
						onClick={() => {
							onShare()
							setMenuOpen(false)
						}}
						className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
					>
						Copy share link
					</button>
					<button
						type="button"
						role="menuitem"
						onClick={() => {
							onDelete()
							setMenuOpen(false)
						}}
						className="block w-full px-3 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50"
					>
						Delete
					</button>
				</div>
			)}
		</Reorder.Item>
	)
}

export function ScenariosSidebar() {
	const scenarios = useChamberStore(s => s.scenarios)
	const scenarioOrder = useChamberStore(s => s.scenarioOrder)
	const currentId = useChamberStore(s => s.currentScenarioId)
	const createScenario = useChamberStore(s => s.createScenario)
	const applyUKPresets = useChamberStore(s => s.applyUKPresets)
	const selectScenario = useChamberStore(s => s.selectScenario)
	const duplicateScenario = useChamberStore(s => s.duplicateScenario)
	const deleteScenario = useChamberStore(s => s.deleteScenario)
	const reorderScenarios = useChamberStore(s => s.reorderScenarios)

	const list = scenarioOrder
		.map(id => scenarios[id])
		.filter((s): s is Scenario => Boolean(s))

	const handleNew = () => {
		const id = createScenario('Untitled scenario', 52)
		applyUKPresets(id)
	}

	const handleDelete = (id: string, name: string) => {
		if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
			deleteScenario(id)
		}
	}

	const handleShare = async (scenario: Scenario) => {
		const url = buildShareUrl(scenario)
		const shareData = {
			title: `ChamberCounter — ${scenario.name}`,
			text: `Vote scenario: ${scenario.name}`,
			url,
		}
		if (typeof navigator.share === 'function' && navigator.canShare?.(shareData) !== false) {
			try {
				await navigator.share(shareData)
				return
			} catch (err) {
				if (err instanceof DOMException && err.name === 'AbortError') return
				// fall through to clipboard
			}
		}
		try {
			await navigator.clipboard.writeText(url)
			toast(`Share link copied — anyone who opens it can import "${scenario.name}".`, 'success')
		} catch {
			window.prompt('Copy this share link:', url)
		}
	}

	return (
		<div className="border-b border-slate-200 px-4 py-3">
			<div className="mb-2 flex items-center justify-between">
				<h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scenarios</h2>
				<button
					type="button"
					onClick={handleNew}
					className="rounded px-1.5 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
				>
					+ New
				</button>
			</div>
			<Reorder.Group
				as="div"
				axis="y"
				values={list}
				onReorder={(next: Scenario[]) => reorderScenarios(next.map(s => s.id))}
				className="space-y-0.5"
			>
				{list.map(s => (
					<ScenarioRow
						key={s.id}
						scenario={s}
						isCurrent={s.id === currentId}
						onSelect={() => selectScenario(s.id)}
						onDuplicate={() => duplicateScenario(s.id)}
						onShare={() => handleShare(s)}
						onDelete={() => handleDelete(s.id, s.name)}
					/>
				))}
				{list.length === 0 && (
					<p className="py-2 text-xs italic text-slate-400">No scenarios yet.</p>
				)}
			</Reorder.Group>
		</div>
	)
}
