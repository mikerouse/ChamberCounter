import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
	DndContext,
	KeyboardSensor,
	MouseSensor,
	TouchSensor,
	useDroppable,
	useSensor,
	useSensors,
	type Announcements,
	type DragEndEvent,
} from '@dnd-kit/core'
import { buildDisplayNames } from '@/domain/display'
import { layoutHemicycle } from '@/domain/hemicycle'
import { selectCurrentScenario, useChamberStore } from '@/store/useChamberStore'
import { ayeLabel, noLabel } from '@/domain/types'
import type { Councillor, Party, VoteState } from '@/domain/types'
import { ContextMenu, type ContextMenuTarget } from './ContextMenu'
import { Dot } from './Dot'
import { ResultsStrip } from './ResultsStrip'
import { VoteZone } from './VoteZone'

const VIEWBOX_W = 1000
const VIEWBOX_H = 540

const VOTE_ORDER: Array<Exclude<VoteState, 'unassigned'>> = ['aye', 'no', 'abstain', 'absent']

function HemicycleDropTarget({ dotPct, children }: { dotPct: number; children: React.ReactNode }) {
	const { isOver, setNodeRef } = useDroppable({
		id: 'zone-unassigned',
		data: { vote: 'unassigned' satisfies VoteState },
	})
	return (
		<div
			ref={setNodeRef}
			className={`relative w-full ${isOver ? 'ring-2 ring-slate-400' : ''}`}
			style={{
				aspectRatio: `${VIEWBOX_W} / ${VIEWBOX_H}`,
				containerType: 'inline-size',
				['--dot-size' as string]: `max(14px, ${dotPct}cqw)`,
			} as React.CSSProperties}
		>
			{children}
		</div>
	)
}

export function Chamber() {
	const scenario = useChamberStore(selectCurrentScenario)
	const setVote = useChamberStore(s => s.setVote)
	const setPartyVote = useChamberStore(s => s.setPartyVote)
	const renameCouncillor = useChamberStore(s => s.renameCouncillor)
	const setCouncillorNotes = useChamberStore(s => s.setCouncillorNotes)

	const [menuTarget, setMenuTarget] = useState<ContextMenuTarget | null>(null)
	const [hemicycleHidden, setHemicycleHidden] = useState(false)

	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
		useSensor(KeyboardSensor),
	)

	const hasMayor = scenario?.councillors.some(c => c.isMayor) ?? false
	const chamberSize = scenario?.chamberSize ?? 0

	const layout = useMemo(() => {
		if (!scenario) return null
		return layoutHemicycle({
			chamberSize,
			width: VIEWBOX_W,
			height: VIEWBOX_H,
			hasMayor,
		})
	}, [scenario, chamberSize, hasMayor])

	const partyById = useMemo(() => {
		if (!scenario) return new Map<string, Party>()
		return new Map(scenario.parties.map(p => [p.id, p] as const))
	}, [scenario])

	const displayNames = useMemo(() => {
		if (!scenario) return new Map<string, string>()
		return buildDisplayNames(scenario.councillors, scenario.parties)
	}, [scenario])

	const byVote = useMemo(() => {
		const groups: Record<VoteState, Councillor[]> = {
			unassigned: [],
			aye: [],
			no: [],
			abstain: [],
			absent: [],
		}
		if (!scenario) return groups
		for (const c of scenario.councillors) groups[c.vote].push(c)
		return groups
	}, [scenario])

	if (!scenario || !layout) return null

	const floorRadius = Math.min(
		layout.outerRadius + layout.dotDiameter * 0.25,
		VIEWBOX_H - layout.centerY - 2,
	)

	const councillorLabel = (id: string | number) => {
		const c = scenario.councillors.find(x => x.id === String(id))
		if (!c) return 'councillor'
		const party = partyById.get(c.partyId)
		return c.isMayor ? `Mayor (${party?.name ?? 'unassigned'})` : `${party?.name ?? 'Unassigned'} councillor`
	}

	const zoneLabel = (vote: VoteState) => {
		if (vote === 'unassigned') return 'the chamber'
		if (vote === 'aye') return `the ${ayeLabel(scenario)} zone`
		if (vote === 'no') return `the ${noLabel(scenario)} zone`
		return `the ${vote} zone`
	}

	const announcements: Announcements = {
		onDragStart: ({ active }) => `Picked up ${councillorLabel(active.id)}.`,
		onDragOver: ({ active, over }) => {
			if (!over) return `${councillorLabel(active.id)} is not over a drop zone.`
			const vote = over.data.current?.vote as VoteState | undefined
			return vote ? `${councillorLabel(active.id)} over ${zoneLabel(vote)}.` : ''
		},
		onDragEnd: ({ active, over }) => {
			if (!over) return `Cancelled dragging ${councillorLabel(active.id)}.`
			const vote = over.data.current?.vote as VoteState | undefined
			return vote
				? `Moved ${councillorLabel(active.id)} to ${zoneLabel(vote)}.`
				: `Dropped ${councillorLabel(active.id)}.`
		},
		onDragCancel: ({ active }) => `Cancelled dragging ${councillorLabel(active.id)}.`,
	}

	const onDragEnd = (event: DragEndEvent) => {
		const councillorId = event.active.data.current?.councillorId as string | undefined
		const vote = event.over?.data.current?.vote as VoteState | undefined
		if (!councillorId || !vote) return
		setVote(scenario.id, councillorId, vote)
	}

	const openContextMenu = (councillorId: string, x: number, y: number) => {
		const c = scenario.councillors.find(x => x.id === councillorId)
		if (!c) return
		const party = partyById.get(c.partyId)
		setMenuTarget({
			councillorId,
			displayName: displayNames.get(councillorId) ?? councillorId,
			partyId: c.partyId,
			partyName: party?.name ?? 'Unassigned',
			currentNote: c.notes ?? '',
			x,
			y,
		})
	}

	return (
		<DndContext sensors={sensors} onDragEnd={onDragEnd} accessibility={{ announcements }}>
			<div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 p-3 sm:p-4 lg:h-full">
				<div className="flex items-center justify-between lg:hidden">
					<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
						Chamber
						<span className="ml-1 text-slate-400 tabular-nums">
							{byVote.unassigned.length} unassigned
						</span>
					</span>
					<button
						type="button"
						onClick={() => setHemicycleHidden(h => !h)}
						aria-expanded={!hemicycleHidden}
						aria-controls="chamber-hemicycle"
						className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
					>
						{hemicycleHidden ? 'Show chamber' : 'Hide chamber'}
					</button>
				</div>
				<AnimatePresence initial={false}>
					{!hemicycleHidden && (
						<motion.div
							key="hemicycle"
							id="chamber-hemicycle"
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.18 }}
							style={{ overflow: 'hidden' }}
						>
							<HemicycleDropTarget dotPct={(layout.dotDiameter / VIEWBOX_W) * 100}>
					<svg
						viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
						preserveAspectRatio="xMidYMid meet"
						className="absolute inset-0 h-full w-full"
					>
						<defs>
							<radialGradient id="chamberFloor" cx="50%" cy="0%" r="100%">
								<stop offset="0%" stopColor="#f1f5f9" />
								<stop offset="100%" stopColor="#e2e8f0" />
							</radialGradient>
						</defs>
						<path
							d={`M ${layout.centerX - floorRadius} ${layout.centerY} A ${floorRadius} ${floorRadius} 0 0 0 ${layout.centerX + floorRadius} ${layout.centerY}`}
							fill="url(#chamberFloor)"
							stroke="#cbd5e1"
							strokeWidth={1}
						/>
						<g>
							<rect
								x={VIEWBOX_W / 2 - 38}
								y={6}
								width={76}
								height={28}
								rx={4}
								fill="#0f172a"
							/>
							<text
								x={VIEWBOX_W / 2}
								y={24}
								textAnchor="middle"
								fill="white"
								fontSize={11}
								fontFamily="ui-sans-serif, system-ui, sans-serif"
								style={{ letterSpacing: '0.05em' }}
							>
								CHAIR
							</text>
						</g>
					</svg>

					{byVote.unassigned.map(c => {
						const seat = layout.seats[c.seatIndex]
						if (!seat) return null
						return (
							<Dot
								key={c.id}
								councillor={c}
								party={partyById.get(c.partyId)}
								displayName={displayNames.get(c.id) ?? c.id}
								hemicycleX={(seat.x / VIEWBOX_W) * 100}
								hemicycleY={(seat.y / VIEWBOX_H) * 100}
								onContextMenu={openContextMenu}
							/>
						)
					})}

					<AnimatePresence>
						{scenario.councillors
							.filter(c => c.vote !== 'unassigned')
							.map(c => {
								const seat = layout.seats[c.seatIndex]
								if (!seat) return null
								const party = partyById.get(c.partyId)
								return (
									<motion.div
										key={`ghost-${c.id}`}
										initial={{ opacity: 0 }}
										animate={{ opacity: 0.22 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.18 }}
										aria-hidden
										className="pointer-events-none absolute rounded-full border-2 border-white"
										style={{
											left: `${(seat.x / VIEWBOX_W) * 100}%`,
											top: `${(seat.y / VIEWBOX_H) * 100}%`,
											transform: 'translate(-50%, -50%)',
											width: 'var(--dot-size, 22px)',
											height: 'var(--dot-size, 22px)',
											backgroundColor: party?.colour ?? '#94a3b8',
										}}
									/>
								)
							})}
					</AnimatePresence>

					{scenario.councillors.length === 0 && (
						<div className="absolute inset-0 flex items-center justify-center text-sm italic text-slate-400">
							Add parties and councillors in the sidebar to populate the chamber.
						</div>
					)}
				</HemicycleDropTarget>
						</motion.div>
					)}
				</AnimatePresence>

				<div className="grid grid-cols-2 gap-3 sm:h-44 sm:shrink-0 sm:grid-cols-4">
					{VOTE_ORDER.map(vote => {
						const label =
							vote === 'aye'
								? ayeLabel(scenario)
								: vote === 'no'
									? noLabel(scenario)
									: vote === 'abstain'
										? 'Abstain'
										: 'Absent'
						return (
							<VoteZone
								key={vote}
								vote={vote}
								councillors={byVote[vote]}
								partyById={partyById}
								displayNames={displayNames}
								label={label}
								onContextMenu={openContextMenu}
							/>
						)
					})}
				</div>
				<div className="sticky bottom-0 -mx-3 mt-2 border-t border-slate-200 bg-slate-50/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4 lg:static lg:mx-0 lg:mt-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
					<ResultsStrip />
				</div>
			</div>
			{menuTarget && (
				<ContextMenu
					target={menuTarget}
					ayeLabel={ayeLabel(scenario)}
					noLabel={noLabel(scenario)}
					onClose={() => setMenuTarget(null)}
					onRename={(councillorId, name) => renameCouncillor(scenario.id, councillorId, name)}
					onPartyVote={(partyId, vote) => setPartyVote(scenario.id, partyId, vote)}
					onSetNote={(councillorId, note) => setCouncillorNotes(scenario.id, councillorId, note)}
					onApplyNotePreset={(councillorId, preset) => {
						setCouncillorNotes(scenario.id, councillorId, preset.note)
						if (preset.vote) setVote(scenario.id, councillorId, preset.vote)
					}}
				/>
			)}
		</DndContext>
	)
}
