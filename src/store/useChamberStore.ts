import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { layoutHemicycle } from '@/domain/hemicycle'
import { newCouncillor, newId, newParty, newScenario } from '@/domain/factory'
import { UK_PARTY_PRESETS } from '@/domain/presets'
import type { CastingVote, Councillor, Party, Scenario, VoteState } from '@/domain/types'

type ScenarioMap = Record<string, Scenario>

export type ChamberState = {
	scenarios: ScenarioMap
	currentScenarioId: string | null

	// Scenario CRUD
	createScenario: (name: string, chamberSize: number) => string
	deleteScenario: (id: string) => void
	duplicateScenario: (id: string) => string | null
	renameScenario: (id: string, name: string) => void
	selectScenario: (id: string) => void

	// Scenario editing
	setChamberSize: (id: string, size: number) => void

	// Party management
	addParty: (id: string, name: string, colour: string) => string
	updateParty: (id: string, partyId: string, patch: Partial<Omit<Party, 'id'>>) => void
	removeParty: (id: string, partyId: string) => void
	setPartyCount: (id: string, partyId: string, count: number) => void
	applyUKPresets: (id: string) => void

	// Councillors
	setMayor: (id: string, councillorId: string | null) => void
	setVote: (id: string, councillorId: string, vote: VoteState) => void
	setPartyVote: (id: string, partyId: string, vote: VoteState) => void
	renameCouncillor: (id: string, councillorId: string, name: string) => void
	resetVotes: (id: string) => void

	// Rules
	toggleRule: (id: string, kind: 'simple-majority' | 'whole-chamber-majority') => void
	setMayorBreaksTies: (id: string, on: boolean) => void

	// Casting vote (Mayor's separate tie-breaker)
	setCastingVote: (id: string, vote: CastingVote | null) => void
}

function touch(scenario: Scenario): Scenario {
	return { ...scenario, updatedAt: Date.now() }
}

function reassignSeats(scenario: Scenario): Scenario {
	const partyOrder = new Map<string, number>(scenario.parties.map((p, i) => [p.id, i] as const))
	const sorted = [...scenario.councillors].sort((a, b) => {
		const pa = partyOrder.get(a.partyId) ?? Number.MAX_SAFE_INTEGER
		const pb = partyOrder.get(b.partyId) ?? Number.MAX_SAFE_INTEGER
		if (pa !== pb) return pa - pb
		return a.id.localeCompare(b.id)
	})

	const reseated: Councillor[] = sorted.map((c, idx) => ({ ...c, seatIndex: idx }))

	const mayor = reseated.find(c => c.isMayor)
	if (mayor) {
		const layout = layoutHemicycle({
			chamberSize: scenario.chamberSize,
			width: 1,
			height: 1,
			hasMayor: true,
		})
		if (layout.mayorSeatIndex !== null && layout.mayorSeatIndex !== mayor.seatIndex) {
			const target = layout.mayorSeatIndex
			const previousMayorSeat = mayor.seatIndex
			return {
				...scenario,
				councillors: reseated.map(c => {
					if (c.id === mayor.id) return { ...c, seatIndex: target }
					if (c.seatIndex === target) return { ...c, seatIndex: previousMayorSeat }
					return c
				}),
			}
		}
	}

	return { ...scenario, councillors: reseated }
}

function withScenarioUpdate(state: ChamberState, id: string, fn: (s: Scenario) => Scenario): Partial<ChamberState> {
	const target = state.scenarios[id]
	if (!target) return {}
	const updated = touch(fn(target))
	return { scenarios: { ...state.scenarios, [id]: updated } }
}

export const useChamberStore = create<ChamberState>()(
	persist(
		(set, get) => ({
			scenarios: {},
			currentScenarioId: null,

			createScenario: (name, chamberSize) => {
				const scenario = newScenario(name, chamberSize)
				set(state => ({
					scenarios: { ...state.scenarios, [scenario.id]: scenario },
					currentScenarioId: scenario.id,
				}))
				return scenario.id
			},

			deleteScenario: id => {
				set(state => {
					const { [id]: _, ...rest } = state.scenarios
					const wasCurrent = state.currentScenarioId === id
					const remainingIds = Object.keys(rest)
					return {
						scenarios: rest,
						currentScenarioId: wasCurrent ? (remainingIds[0] ?? null) : state.currentScenarioId,
					}
				})
			},

			duplicateScenario: id => {
				const source = get().scenarios[id]
				if (!source) return null
				const copyId = newId('s')
				const now = Date.now()
				const copy: Scenario = {
					...source,
					id: copyId,
					name: `${source.name} (copy)`,
					parties: source.parties.map(p => ({ ...p })),
					councillors: source.councillors.map(c => ({ ...c })),
					enabledRules: source.enabledRules.map(r => ({ ...r })),
					createdAt: now,
					updatedAt: now,
				}
				set(state => ({
					scenarios: { ...state.scenarios, [copyId]: copy },
					currentScenarioId: copyId,
				}))
				return copyId
			},

			renameScenario: (id, name) => {
				set(state => withScenarioUpdate(state, id, s => ({ ...s, name })))
			},

			selectScenario: id => {
				if (get().scenarios[id]) set({ currentScenarioId: id })
			},

			setChamberSize: (id, size) => {
				const safeSize = Math.max(1, Math.min(200, Math.round(size)))
				set(state =>
					withScenarioUpdate(state, id, s => {
						if (s.councillors.length > safeSize) {
							const trimmed = s.councillors.slice(0, safeSize)
							return reassignSeats({ ...s, chamberSize: safeSize, councillors: trimmed })
						}
						return reassignSeats({ ...s, chamberSize: safeSize })
					}),
				)
			},

			addParty: (id, name, colour) => {
				const party = newParty(name, colour)
				set(state =>
					withScenarioUpdate(state, id, s => ({
						...s,
						parties: [...s.parties, party],
					})),
				)
				return party.id
			},

			updateParty: (id, partyId, patch) => {
				set(state =>
					withScenarioUpdate(state, id, s => ({
						...s,
						parties: s.parties.map(p => (p.id === partyId ? { ...p, ...patch } : p)),
					})),
				)
			},

			removeParty: (id, partyId) => {
				set(state =>
					withScenarioUpdate(state, id, s => {
						if (s.councillors.some(c => c.partyId === partyId)) return s
						return {
							...s,
							parties: s.parties.filter(p => p.id !== partyId),
						}
					}),
				)
			},

			setPartyCount: (id, partyId, count) => {
				const safeCount = Math.max(0, Math.round(count))
				set(state =>
					withScenarioUpdate(state, id, s => {
						const others = s.councillors.filter(c => c.partyId !== partyId)
						const existing = s.councillors.filter(c => c.partyId === partyId)
						const otherCount = others.length
						const allowed = Math.max(0, s.chamberSize - otherCount)
						const cappedCount = Math.min(safeCount, allowed)

						let nextForParty: Councillor[]
						if (cappedCount >= existing.length) {
							const toAdd = cappedCount - existing.length
							const additions = Array.from({ length: toAdd }, () => newCouncillor(partyId, 0))
							nextForParty = [...existing, ...additions]
						} else {
							nextForParty = existing.slice(0, cappedCount)
							const dropped = existing.slice(cappedCount)
							if (dropped.some(c => c.isMayor)) {
								nextForParty = nextForParty.map(c => ({ ...c, isMayor: false }))
							}
						}

						return reassignSeats({
							...s,
							councillors: [...others, ...nextForParty],
						})
					}),
				)
			},

			applyUKPresets: id => {
				set(state =>
					withScenarioUpdate(state, id, s => {
						const existingNames = new Set(s.parties.map(p => p.name.toLowerCase()))
						const additions: Party[] = UK_PARTY_PRESETS
							.filter(p => !existingNames.has(p.name.toLowerCase()))
							.map(p => newParty(p.name, p.colour))
						return { ...s, parties: [...s.parties, ...additions] }
					}),
				)
			},

			setMayor: (id, councillorId) => {
				set(state =>
					withScenarioUpdate(state, id, s => {
						const next = s.councillors.map(c => ({
							...c,
							isMayor: councillorId !== null && c.id === councillorId,
						}))
						const { castingVote: _drop, ...rest } = s
						void _drop
						return reassignSeats({ ...rest, councillors: next })
					}),
				)
			},

			setVote: (id, councillorId, vote) => {
				set(state =>
					withScenarioUpdate(state, id, s => ({
						...s,
						councillors: s.councillors.map(c =>
							c.id === councillorId ? { ...c, vote } : c,
						),
					})),
				)
			},

			setPartyVote: (id, partyId, vote) => {
				set(state =>
					withScenarioUpdate(state, id, s => ({
						...s,
						councillors: s.councillors.map(c =>
							c.partyId === partyId ? { ...c, vote } : c,
						),
					})),
				)
			},

			renameCouncillor: (id, councillorId, name) => {
				const trimmed = name.trim()
				set(state =>
					withScenarioUpdate(state, id, s => ({
						...s,
						councillors: s.councillors.map(c =>
							c.id === councillorId
								? { ...c, name: trimmed === '' ? undefined : trimmed }
								: c,
						),
					})),
				)
			},

			resetVotes: id => {
				set(state =>
					withScenarioUpdate(state, id, s => ({
						...s,
						councillors: s.councillors.map(c => ({ ...c, vote: 'unassigned' })),
					})),
				)
			},

			toggleRule: (id, kind) => {
				set(state =>
					withScenarioUpdate(state, id, s => {
						const present = s.enabledRules.some(r => r.kind === kind)
						if (present) {
							return { ...s, enabledRules: s.enabledRules.filter(r => r.kind !== kind) }
						}
						const restored = kind === 'simple-majority'
							? { kind, mayorBreaksTies: true } as const
							: { kind } as const
						return { ...s, enabledRules: [...s.enabledRules, restored] }
					}),
				)
			},

			setMayorBreaksTies: (id, on) => {
				set(state =>
					withScenarioUpdate(state, id, s => ({
						...s,
						enabledRules: s.enabledRules.map(r =>
							r.kind === 'simple-majority' ? { ...r, mayorBreaksTies: on } : r,
						),
					})),
				)
			},

			setCastingVote: (id, vote) => {
				set(state =>
					withScenarioUpdate(state, id, s => {
						if (vote === null) {
							const { castingVote: _drop, ...rest } = s
							void _drop
							return rest
						}
						return { ...s, castingVote: vote }
					}),
				)
			},
		}),
		{
			name: 'chambercounter:v1',
			storage: createJSONStorage(() => localStorage),
			version: 1,
			partialize: state => ({
				scenarios: state.scenarios,
				currentScenarioId: state.currentScenarioId,
			}),
		},
	),
)

export function selectCurrentScenario(state: ChamberState): Scenario | null {
	return state.currentScenarioId ? (state.scenarios[state.currentScenarioId] ?? null) : null
}

export function ensureSeedScenario(): void {
	const state = useChamberStore.getState()
	if (Object.keys(state.scenarios).length === 0) {
		const id = state.createScenario('Untitled scenario', 52)
		state.applyUKPresets(id)
	}
}
