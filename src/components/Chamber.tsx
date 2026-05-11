import { useMemo } from 'react'
import { layoutHemicycle } from '@/domain/hemicycle'
import { selectCurrentScenario, useChamberStore } from '@/store/useChamberStore'
import { Seat } from './Seat'

const VIEWBOX_W = 1000
const VIEWBOX_H = 540

export function Chamber() {
	const scenario = useChamberStore(selectCurrentScenario)

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

	if (!scenario || !layout) return null

	const partyById = new Map(scenario.parties.map(p => [p.id, p] as const))

	return (
		<div className="flex h-full w-full items-center justify-center p-4">
			<svg
				viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
				preserveAspectRatio="xMidYMid meet"
				className="h-full max-h-[80vh] w-full"
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

				{scenario.councillors.map(c => {
					const seat = layout.seats[c.seatIndex]
					if (!seat) return null
					const party = partyById.get(c.partyId)
					return (
						<Seat
							key={c.id}
							x={seat.x}
							y={seat.y}
							colour={party?.colour ?? '#94a3b8'}
							isMayor={c.isMayor}
							label={party?.name ?? 'Unassigned'}
						/>
					)
				})}

				{scenario.councillors.length === 0 && (
					<text
						x={VIEWBOX_W / 2}
						y={VIEWBOX_H * 0.55}
						textAnchor="middle"
						fill="#94a3b8"
						fontSize={16}
						fontFamily="ui-sans-serif, system-ui, sans-serif"
					>
						Add parties and councillors in the sidebar to populate the chamber.
					</text>
				)}
			</svg>
		</div>
	)
}
