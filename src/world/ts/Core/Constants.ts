export type UiControlsType = {
	keys: string[]
	desc: string
}[]

const CameraOperator: UiControlsType = [
	{
		keys: ['W', 'S', 'A', 'D'],
		desc: 'Move around',
	},
	{
		keys: ['E', 'Q'],
		desc: 'Move up / down',
	},
	{
		keys: ['Shift'],
		desc: 'Speed up',
	},
	{
		keys: ['Shift', '+', 'C'],
		desc: 'Exit free camera mode',
	},
]

const Character: UiControlsType = [
	{
		keys: ['W', 'A', 'S', 'D'],
		desc: 'Movement',
	},
	{
		keys: ['Shift'],
		desc: 'Sprint',
	},
	{
		keys: ['Space'],
		desc: 'Jump',
	},
	{
		keys: ['F', 'or', 'G'],
		desc: 'Enter vehicle',
	},
	{
		keys: ['Shift', '+', 'R'],
		desc: 'Respawn',
	},
	{
		keys: ['Shift', '+', 'C'],
		desc: 'Free camera',
	},
]

const Sitting: UiControlsType = [
	{
		keys: ['X'],
		desc: 'Switch seats',
	},
	{
		keys: ['F'],
		desc: 'Leave seat',
	},
]

const Car: UiControlsType = [
	{
		keys: ['W', 'S'],
		desc: 'Accelerate, Brake / Reverse',
	},
	{
		keys: ['A', 'D'],
		desc: 'Steering',
	},
	{
		keys: ['Space'],
		desc: 'Handbrake',
	},
	{
		keys: ['V'],
		desc: 'View select',
	},
	{
		keys: ['F'],
		desc: 'Exit vehicle',
	},
	{
		keys: ['Shift', '+', 'R'],
		desc: 'Respawn',
	},
	{
		keys: ['Shift', '+', 'C'],
		desc: 'Free camera',
	},
]

const Helicopter: UiControlsType = [
	{
		keys: ['Shift'],
		desc: 'Ascend',
	},
	{
		keys: ['Space'],
		desc: 'Descend',
	},
	{
		keys: ['W', 'S'],
		desc: 'Pitch',
	},
	{
		keys: ['Q', 'E'],
		desc: 'Yaw',
	},
	{
		keys: ['A', 'D'],
		desc: 'Roll',
	},
	{
		keys: ['V'],
		desc: 'View select',
	},
	{
		keys: ['F'],
		desc: 'Exit vehicle',
	},
	{
		keys: ['Shift', '+', 'R'],
		desc: 'Respawn',
	},
	{
		keys: ['Shift', '+', 'C'],
		desc: 'Free camera',
	},
]

const Airplane: UiControlsType = [
	{
		keys: ['Shift'],
		desc: 'Accelerate',
	},
	{
		keys: ['Space'],
		desc: 'Decelerate',
	},
	{
		keys: ['W', 'S'],
		desc: 'Elevators',
	},
	{
		keys: ['A', 'D'],
		desc: 'Ailerons',
	},
	{
		keys: ['Q', 'E'],
		desc: 'Rudder / Steering',
	},
	{
		keys: ['B'],
		desc: 'Brake',
	},
	{
		keys: ['V'],
		desc: 'View select',
	},
	{
		keys: ['F'],
		desc: 'Exit vehicle',
	},
	{
		keys: ['Shift', '+', 'R'],
		desc: 'Respawn',
	},
	{
		keys: ['Shift', '+', 'C'],
		desc: 'Free camera',
	},
]

export class UiControls {
	static readonly CameraOperator: UiControlsType = CameraOperator
	static readonly Character: UiControlsType = Character
	static readonly Sitting: UiControlsType = Sitting

	// Vehicle
	static readonly Car: UiControlsType = Car
	static readonly Helicopter: UiControlsType = Helicopter
	static readonly Airplane: UiControlsType = Airplane
}
