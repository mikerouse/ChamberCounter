import type { VoteState } from './types'

export type NotePreset = {
	label: string
	note: string
	vote?: Exclude<VoteState, 'unassigned'>
	hint: string
}

export const NOTE_PRESETS: NotePreset[] = [
	{ label: 'On leave', note: 'On leave', vote: 'absent', hint: 'Marks Absent and notes the reason' },
	{ label: 'Sick', note: 'Sick', vote: 'absent', hint: 'Marks Absent and notes the reason' },
	{ label: 'Paired', note: 'Paired', vote: 'abstain', hint: 'Pairing arrangement → Abstain' },
	{ label: 'Conflict', note: 'Conflict of interest', vote: 'abstain', hint: 'Legal duty to abstain' },
	{ label: 'Mat/Pat', note: 'Maternity / paternity leave', vote: 'absent', hint: 'Marks Absent and notes the reason' },
	{ label: 'Free vote', note: 'Free vote', hint: 'Tags as free vote, leaves vote untouched' },
	{ label: 'Wobbly', note: 'Wobbly', hint: 'Tags as wobbly, leaves vote untouched' },
	{ label: 'Likely rebel', note: 'Likely rebel', hint: 'Tags as likely rebel, leaves vote untouched' },
]
