export async function pauseForAway(companion: {
	snapshot(): { state: { focus: { status: string } } };
	dispatch(action: { type: 'focus-pause' }): Promise<unknown>;
}) {
	if (companion.snapshot().state.focus.status === 'running') {
		await companion.dispatch({ type: 'focus-pause' });
	}
}
