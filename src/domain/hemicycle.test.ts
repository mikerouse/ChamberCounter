import { describe, it, expect } from 'vitest'
import { distributeSeats, layoutHemicycle, pickRowCount } from './hemicycle'

describe('pickRowCount', () => {
	it('returns 0 for empty chamber', () => {
		expect(pickRowCount(0)).toBe(0)
	})

	it('returns 1 for very small chambers', () => {
		expect(pickRowCount(1)).toBe(1)
		expect(pickRowCount(3)).toBe(1)
	})

	it('scales up reasonably', () => {
		expect(pickRowCount(10)).toBeGreaterThanOrEqual(2)
		expect(pickRowCount(52)).toBeGreaterThanOrEqual(5)
		expect(pickRowCount(200)).toBeLessThanOrEqual(12)
	})

	it('never exceeds 12', () => {
		expect(pickRowCount(1000)).toBeLessThanOrEqual(12)
	})
})

describe('distributeSeats', () => {
	it('sums to total seats', () => {
		for (const n of [3, 10, 52, 100, 199, 200]) {
			const rows = pickRowCount(n)
			const counts = distributeSeats(n, rows, false)
			expect(counts.reduce((s, c) => s + c, 0)).toBe(n)
		}
	})

	it('outer rows have more seats than inner rows', () => {
		const counts = distributeSeats(52, 4, false)
		expect(counts[3]).toBeGreaterThanOrEqual(counts[0])
	})

	it('ensures row 0 is odd when mayor present', () => {
		for (const n of [5, 10, 20, 52, 99, 100]) {
			const rows = pickRowCount(n)
			const counts = distributeSeats(n, rows, true)
			expect(counts[0] % 2).toBe(1)
			expect(counts.reduce((s, c) => s + c, 0)).toBe(n)
		}
	})

	it('handles single-row chambers', () => {
		expect(distributeSeats(5, 1, false)).toEqual([5])
		expect(distributeSeats(5, 1, true)).toEqual([5])
	})
})

describe('layoutHemicycle', () => {
	it('returns one seat per councillor', () => {
		const layout = layoutHemicycle({ chamberSize: 52, width: 800, height: 400, hasMayor: false })
		expect(layout.seats).toHaveLength(52)
	})

	it('places all seats within bounds', () => {
		const layout = layoutHemicycle({ chamberSize: 100, width: 1000, height: 500, hasMayor: false })
		for (const seat of layout.seats) {
			expect(seat.x).toBeGreaterThanOrEqual(0)
			expect(seat.x).toBeLessThanOrEqual(1000)
			expect(seat.y).toBeGreaterThanOrEqual(0)
			expect(seat.y).toBeLessThanOrEqual(500)
		}
	})

	it('reports a Mayor seat index when hasMayor is true', () => {
		const layout = layoutHemicycle({ chamberSize: 52, width: 800, height: 400, hasMayor: true })
		expect(layout.mayorSeatIndex).not.toBeNull()
		const mayor = layout.seats[layout.mayorSeatIndex!]
		expect(mayor.row).toBe(0)
		expect(Math.abs(mayor.x - 400)).toBeLessThan(1)
	})

	it('returns null mayor index when hasMayor is false', () => {
		const layout = layoutHemicycle({ chamberSize: 52, width: 800, height: 400, hasMayor: false })
		expect(layout.mayorSeatIndex).toBeNull()
	})

	it('returns empty layout for chamberSize 0', () => {
		const layout = layoutHemicycle({ chamberSize: 0, width: 800, height: 400, hasMayor: false })
		expect(layout.seats).toHaveLength(0)
		expect(layout.mayorSeatIndex).toBeNull()
	})

	it('seats are sorted leftmost-to-rightmost by angle', () => {
		const layout = layoutHemicycle({ chamberSize: 30, width: 800, height: 400, hasMayor: false })
		for (let i = 1; i < layout.seats.length; i++) {
			expect(layout.seats[i].angle).toBeGreaterThanOrEqual(layout.seats[i - 1].angle)
		}
	})

	it('keeps every party councillor in a contiguous angular wedge', () => {
		const layout = layoutHemicycle({ chamberSize: 57, width: 1000, height: 540, hasMayor: false })
		// A councillor assigned sequentially to seats by party order should occupy
		// a contiguous angular range. Simulate a party of 16 taking the first 16 seats.
		const wedge = layout.seats.slice(0, 16)
		const minAngle = Math.min(...wedge.map(s => s.angle))
		const maxAngle = Math.max(...wedge.map(s => s.angle))
		// No seat outside the wedge should fall inside (minAngle, maxAngle).
		const outside = layout.seats.slice(16)
		for (const s of outside) {
			expect(s.angle).toBeGreaterThanOrEqual(maxAngle)
		}
		// And there is in fact some angular span (not degenerate).
		expect(maxAngle).toBeGreaterThan(minAngle)
	})

	it('reports a dotDiameter that shrinks as the chamber grows denser', () => {
		const small = layoutHemicycle({ chamberSize: 12, width: 1000, height: 540, hasMayor: false })
		const large = layoutHemicycle({ chamberSize: 200, width: 1000, height: 540, hasMayor: false })
		expect(small.dotDiameter).toBeGreaterThan(0)
		expect(large.dotDiameter).toBeGreaterThan(0)
		expect(small.dotDiameter).toBeGreaterThan(large.dotDiameter)
	})
})
