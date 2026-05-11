import type { Party } from './types'

export type PartyPreset = Omit<Party, 'id'>

export const UK_PARTY_PRESETS: PartyPreset[] = [
	{ name: 'Labour', colour: '#E4003B' },
	{ name: 'Conservative', colour: '#0087DC' },
	{ name: 'Liberal Democrats', colour: '#FAA61A' },
	{ name: 'Green', colour: '#6AB023' },
	{ name: 'Reform UK', colour: '#12B6CF' },
	{ name: 'SNP', colour: '#FDF38E' },
	{ name: 'Plaid Cymru', colour: '#005B54' },
	{ name: 'Independent', colour: '#888888' },
]
