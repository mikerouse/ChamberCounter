export type Seat = {
	x: number
	y: number
	row: number
	col: number
}

export type HemicycleLayout = {
	seats: Seat[]
	mayorSeatIndex: number | null
	width: number
	height: number
	rows: number[]
}

export type LayoutOptions = {
	chamberSize: number
	width: number
	height: number
	hasMayor: boolean
}

export function pickRowCount(n: number): number {
	if (n <= 0) return 0
	const ideal = Math.round(Math.sqrt(n / 3))
	const clamped = Math.max(1, Math.min(10, ideal))
	return Math.min(clamped, Math.max(1, Math.ceil(n / 3)))
}

export function distributeSeats(n: number, rows: number, mayorRowMustBeOdd: boolean): number[] {
	if (n <= 0 || rows <= 0) return []
	if (rows === 1) return [n]

	const rMin = 1
	const rMax = rows
	const radii: number[] = []
	for (let i = 0; i < rows; i++) {
		radii.push(rMin + (rMax - rMin) * (i / (rows - 1)))
	}
	const totalWeight = radii.reduce((s, r) => s + r, 0)
	const counts = radii.map(r => Math.max(1, Math.round((n * r) / totalWeight)))

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
		return { seats: [], mayorSeatIndex: null, width, height, rows: [] }
	}

	const cx = width / 2
	const cy = height * 0.1
	const rMin = height * 0.22
	const rMax = height * 0.86

	const rowCount = pickRowCount(n)
	const counts = distributeSeats(n, rowCount, hasMayor && n >= 1)

	const radii: number[] = []
	if (rowCount === 1) {
		radii.push((rMin + rMax) / 2)
	} else {
		for (let i = 0; i < rowCount; i++) {
			radii.push(rMin + (rMax - rMin) * (i / (rowCount - 1)))
		}
	}

	const seats: Seat[] = []
	let mayorSeatIndex: number | null = null

	for (let i = 0; i < rowCount; i++) {
		const r = radii[i]
		const s = counts[i]
		const inset = s === 1 ? 0 : Math.PI / 36
		const start = -Math.PI / 2 + inset
		const end = Math.PI / 2 - inset
		for (let j = 0; j < s; j++) {
			const t = s === 1 ? 0.5 : j / (s - 1)
			const angle = start + t * (end - start)
			const x = cx + r * Math.sin(angle)
			const y = cy + r * Math.cos(angle)
			seats.push({ x, y, row: i, col: j })
			if (hasMayor && i === 0 && j === Math.floor(s / 2)) {
				mayorSeatIndex = seats.length - 1
			}
		}
	}

	return { seats, mayorSeatIndex, width, height, rows: counts }
}
