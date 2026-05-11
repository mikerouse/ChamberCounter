type Props = {
	x: number
	y: number
	colour: string
	isMayor: boolean
	label: string
}

export const SEAT_RADIUS = 11
const MAYOR_RING_RADIUS = 15

export function Seat({ x, y, colour, isMayor, label }: Props) {
	return (
		<g transform={`translate(${x} ${y})`} className="transition-transform">
			{isMayor && (
				<circle r={MAYOR_RING_RADIUS} fill="none" stroke="#f59e0b" strokeWidth={2.5} />
			)}
			<circle
				r={SEAT_RADIUS}
				fill={colour}
				stroke="white"
				strokeWidth={2}
				className="drop-shadow-sm"
			>
				<title>{isMayor ? `${label} — Mayor / Chair` : label}</title>
			</circle>
		</g>
	)
}
