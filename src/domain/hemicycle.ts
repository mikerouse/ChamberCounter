export type Seat = {
	x: number
	y: number
	row: number
	col: number
	angle: number
}

export type HemicycleLayout = {
	seats: Seat[]
	mayorSeatIndex: number | null
	width: number
	height: number
	rows: number[]
	dotDiameter: number
	centerX: number
	centerY: number
	innerRadius: number
	outerRadius: number
}

export type LayoutOptions = {
	chamberSize: number
	width: number
	height: number
	hasMayor: boolean
}

export function pickRowCount(n: number): number {
	if (n <= 0) return 0
	const ideal = Math.round(Math.sqrt(n / 2))
	const clamped = Math.max(1, Math.min(12, ideal))
	return Math.min(clamped, Math.max(1, Math.ceil(n / 3)))
}

export function distributeSeats(n: number, rows: number, mayorRowMustBeOdd: boolean): number[] {
	if (n <= 0 || rows <= 0) return []
	if (rows === 1) return [n]

	const weights: number[] = []
	for (let i = 0; i < rows; i++) {
		weights.push(0.65 + 0.7 * (i / (rows - 1)))
	}
	const totalWeight = weights.reduce((s, w) => s + w, 0)
	const counts = weights.map(w => Math.max(1, Math.round((n * w) / totalWeight)))

	const balance = (target: number, allowMayorRowChange: boolean) => {
		while (counts.reduce((s, c) => s + c, 0) !== target) {
			const diff = target - counts.reduce((s, c) => s + c, 0)
			if (diff > 0) {
				let idx = 0
				for (let i = 1; i < counts.length; i++) {
					if (i === 0 && !allowMayorRowChange && mayorRowMustBeOdd) continue
					if (counts[i] > counts[idx]) idx = i
				}
				counts[idx]++
			} else {
				let idx = -1
				for (let i = counts.length - 1; i >= 0; i--) {
					if (i === 0 && !allowMayorRowChange && mayorRowMustBeOdd) continue
					if (counts[i] > 1 && (idx === -1 || counts[i] > counts[idx])) idx = i
				}
				if (idx === -1) idx = counts.indexOf(Math.max(...counts))
				counts[idx]--
			}
		}
	}

	balance(n, true)

	if (mayorRowMustBeOdd && counts[0] % 2 === 0) {
		if (counts.length > 1 && counts[0] > 1) {
			counts[0]--
			counts[1]++
		} else if (counts.length > 1) {
			counts[0]++
			counts[1]--
		}
		balance(n, false)
	}

	return counts
}

export function layoutHemicycle(opts: LayoutOptions): HemicycleLayout {
	const { chamberSize: n, width, height, hasMayor } = opts

	if (n <= 0) {
		return {
			seats: [],
			mayorSeatIndex: null,
			width,
			height,
			rows: [],
			dotDiameter: 0,
			centerX: width / 2,
			centerY: height * 0.1,
			innerRadius: 0,
			outerRadius: 0,
		}
	}

	const cx = width / 2
	const cy = height * 0.1
	const rowCount = pickRowCount(n)
	const counts = distributeSeats(n, rowCount, hasMayor && n >= 1)

	// Pack dots tightly. Solve for the largest dot diameter `d` such that:
	//   rMin = counts[0] * d / π          (inner arc just fits innerCount dots)
	//   rMax = rMin + (rowCount - 1) * d   (rows spaced one diameter apart)
	//   cy + rMax + d/2 ≤ height           (outer dot fits vertically)
	//   cx >= rMax + d/2                   (outer dot fits horizontally)
	const innerCount = counts[0] ?? 1
	const denom = innerCount / Math.PI + Math.max(0, rowCount - 1) + 0.5
	const dVertical = (height - cy) / denom
	const dHorizontal = (width / 2) / denom
	const dCap = height * 0.16
	const d = Math.max(8, Math.min(dCap, Math.min(dVertical, dHorizontal) * 0.94))

	const rMin = rowCount === 1 ? (height - cy) / 2 : (innerCount * d) / Math.PI

	const radii: number[] = []
	if (rowCount === 1) {
		radii.push(rMin)
	} else {
		for (let i = 0; i < rowCount; i++) {
			radii.push(rMin + i * d)
		}
	}

	const seats: Seat[] = []
	for (let i = 0; i < rowCount; i++) {
		const r = radii[i]
		const s = counts[i]
		// Angular inset so dots don't bunch right against the radial endpoints.
		// Using d/(2r) puts the dot edge tangent to the perpendicular at the end of the half-circle.
		const inset = s === 1 ? 0 : Math.min(Math.PI / 12, d / (2 * r))
		const start = -Math.PI / 2 + inset
		const end = Math.PI / 2 - inset
		for (let j = 0; j < s; j++) {
			const t = s === 1 ? 0.5 : j / (s - 1)
			const angle = start + t * (end - start)
			const x = cx + r * Math.sin(angle)
			const y = cy + r * Math.cos(angle)
			seats.push({ x, y, row: i, col: j, angle })
		}
	}

	// Sort seats leftmost-to-rightmost by angle so that assigning councillors
	// in party order produces a wedge per party (Conservative-then-Green-then-…),
	// not a row-by-row horizontal stripe. Tiebreak by row inner-first.
	seats.sort((a, b) => {
		if (a.angle !== b.angle) return a.angle - b.angle
		return a.row - b.row
	})

	let mayorSeatIndex: number | null = null
	if (hasMayor) {
		let bestDiff = Infinity
		for (let i = 0; i < seats.length; i++) {
			if (seats[i].row !== 0) continue
			const diff = Math.abs(seats[i].angle)
			if (diff < bestDiff) {
				bestDiff = diff
				mayorSeatIndex = i
			}
		}
	}

	const outerRowRadius = radii[radii.length - 1]
	return {
		seats,
		mayorSeatIndex,
		width,
		height,
		rows: counts,
		dotDiameter: d,
		centerX: cx,
		centerY: cy,
		innerRadius: rMin,
		outerRadius: outerRowRadius + d / 2,
	}
}
