import { useMemo } from 'react'
import {
	DndContext,
	KeyboardSensor,
	PointerSensor,
	useDroppable,
	useSensor,
	useSensors,
	type DragEndEvent,
} from '@dnd-kit/core'
import { layoutHemicycle } from '@/domain/hemicycle'
import { selectCurrentScenario, useChamberStore } from '@/store/useChamberStore'
import type { Councillor, Party, VoteState } from '@/domain/types'
import { Dot } from './Dot'
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

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
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

	const onDragEnd = (event: DragEndEvent) => {
		const councillorId = event.active.data.current?.councillorId as string | undefined
		const vote = event.over?.data.current?.vote as VoteState | undefined
		if (!councillorId || !vote) return
		setVote(scenario.id, councillorId, vote)
	}

	return (
		<DndContext sensors={sensors} onDragEnd={onDragEnd}>
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
								hemicycleX={(seat.x / VIEWBOX_W) * 100}
								hemicycleY={(seat.y / VIEWBOX_H) * 100}
							/>
						)
					})}

					{scenario.councillors.length === 0 && (
						<div className="absolute inset-0 flex items-center justify-center text-sm italic text-slate-400">
							Add parties and councillors in the sidebar to populate the chamber.
						</div>
					)}
				</HemicycleDropTarget>

				<div className="grid h-44 shrink-0 grid-cols-4 gap-3">
					{VOTE_ORDER.map(vote => (
						<VoteZone
							key={vote}
							vote={vote}
							councillors={byVote[vote]}
							partyById={partyById}
						/>
					))}
				</div>
			</div>
		</DndContext>
	)
}
