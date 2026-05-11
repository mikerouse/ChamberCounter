import { useMemo, useState } from 'react'
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
import type { Councillor, Party, VoteState } from '@/domain/types'
import { ContextMenu, type ContextMenuTarget } from './ContextMenu'
import { Dot } from './Dot'
import { ResultsStrip } from './ResultsStrip'
import { VoteZone } from './VoteZone'

const VIEWBOX_W = 1000
const VIEWBOX_H = 540

const VOTE_ORDER: Array<Exclude<VoteState, 'unassigned'>> = ['aye', 'no', 'abstain', 'absent']

function HemicycleDropTarget({ children }: { children: React.ReactNode }) {
	const { isOver, setNodeRef } = useDroppable({
		id: 'zone-unassigned',
		data: { vote: 'unassigned' satisfies VoteState },
	})
	return (
		<div
			ref={setNodeRef}
			className={`relative w-full ${isOver ? 'ring-2 ring-slate-400' : ''}`}
			style={{ aspectRatio: `${VIEWBOX_W} / ${VIEWBOX_H}` }}
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

	const [menuTarget, setMenuTarget] = useState<ContextMenuTarget | null>(null)

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

	const councillorLabel = (id: string | number) => {
		const c = scenario.councillors.find(x => x.id === String(id))
		if (!c) return 'councillor'
		const party = partyById.get(c.partyId)
		return c.isMayor ? `Mayor (${party?.name ?? 'unassigned'})` : `${party?.name ?? 'Unassigned'} councillor`
	}

	const zoneLabel = (vote: VoteState) =>
		vote === 'unassigned' ? 'the chamber' : `the ${vote} zone`

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
			x,
			y,
		})
	}

	return (
		<DndContext sensors={sensors} onDragEnd={onDragEnd} accessibility={{ announcements }}>
			<div className="mx-auto flex h-full w-full max-w-[1100px] flex-col gap-4 p-4">
				<HemicycleDropTarget>
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
							d={`M ${VIEWBOX_W / 2 - VIEWBOX_H * 0.92} ${VIEWBOX_H * 0.1} A ${VIEWBOX_H * 0.92} ${VIEWBOX_H * 0.92} 0 0 0 ${VIEWBOX_W / 2 + VIEWBOX_H * 0.92} ${VIEWBOX_H * 0.1}`}
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

					{scenario.councillors.length === 0 && (
						<div className="absolute inset-0 flex items-center justify-center text-sm italic text-slate-400">
							Add parties and councillors in the sidebar to populate the chamber.
						</div>
					)}
				</HemicycleDropTarget>

				<div className="grid h-44 shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
					{VOTE_ORDER.map(vote => (
						<VoteZone
							key={vote}
							vote={vote}
							councillors={byVote[vote]}
							partyById={partyById}
							displayNames={displayNames}
							onContextMenu={openContextMenu}
						/>
					))}
				</div>
				<ResultsStrip />
			</div>
			{menuTarget && (
				<ContextMenu
					target={menuTarget}
					onClose={() => setMenuTarget(null)}
					onRename={(councillorId, name) => renameCouncillor(scenario.id, councillorId, name)}
					onPartyVote={(partyId, vote) => setPartyVote(scenario.id, partyId, vote)}
				/>
			)}
		</DndContext>
	)
}
