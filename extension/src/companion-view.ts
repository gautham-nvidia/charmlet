import {
	companionSnapshot, currentLearningCard, defaultCompanionState, formatFocusTime, restoreCompanionState,
	type CompanionAction, type CompanionSnapshot, type CompanionState,
} from './companion-core';
import { REMINDER_MINUTES_MAX, REMINDER_MINUTES_MIN, validReminderMinutes, type ReminderKind } from './care-core';
import { FLOWERS, WATERINGS_TO_BLOOM, type FlowerId, type GardenStage } from './garden-core';
import { learningCard, type FeedMode, type LearningCard } from './learning-cards';

export interface CompanionViewOptions {
	send(action: CompanionAction, requestId: number): void;
	openSource(cardId: string): void;
	image(file: string): string;
	hangFlower(flowerId: FlowerId, requestId: number): void;
	onOpen(): void;
	onLayout(): void;
	onActivity(): void;
}

export interface CompanionView {
	receive(snapshot: unknown): void;
	result(requestId: number, error?: string, message?: string): void;
	open(tab: 'focus' | 'learn' | 'garden'): void;
	close(restoreFocus?: boolean): void;
	toggle(): void;
	nextCard(): void;
	isOpen(): boolean;
	canRotate(): boolean;
}

function required<Kind extends Element>(id: string): Kind {
	const value = document.getElementById(id);
	if (!value) { throw new Error(`Missing companion element: ${id}`); }
	return value as unknown as Kind;
}

function snapshotValue(value: unknown): CompanionSnapshot | undefined {
	if (!value || typeof value !== 'object' || !('state' in value)) { return undefined; }
	const raw = value as { state: unknown; now?: unknown; error?: unknown };
	const now = typeof raw.now === 'number' && Number.isSafeInteger(raw.now) && raw.now >= 0 ? raw.now : Date.now();
	const state = restoreCompanionState(raw.state, now);
	return { ...companionSnapshot(state, now), ...(typeof raw.error === 'string' ? { error: raw.error } : {}) };
}

export function createCompanionView(options: CompanionViewOptions): CompanionView {
	const stage = required<HTMLDivElement>('stage');
	const tools = required<HTMLElement>('companion-tools');
	const toggle = required<HTMLButtonElement>('companion-toggle');
	const focusReadout = required<HTMLButtonElement>('focus-readout');
	const tabFocus = required<HTMLButtonElement>('tab-focus');
	const tabLearn = required<HTMLButtonElement>('tab-learn');
	const tabGarden = required<HTMLButtonElement>('tab-garden');
	const focusPanel = required<HTMLDivElement>('focus-panel');
	const learnPanel = required<HTMLDivElement>('learn-panel');
	const gardenPanel = required<HTMLDivElement>('garden-panel');
	const focusStatus = required<HTMLParagraphElement>('focus-status');
	const focusTime = required<HTMLOutputElement>('focus-time');
	const focusNotice = required<HTMLParagraphElement>('focus-notice');
	const focusMinutes = required<HTMLInputElement>('focus-minutes');
	const breakMinutes = required<HTMLInputElement>('break-minutes');
	const focusIntent = required<HTMLInputElement>('focus-intent');
	const preset25 = required<HTMLButtonElement>('preset-25');
	const preset50 = required<HTMLButtonElement>('preset-50');
	const focusStart = required<HTMLButtonElement>('focus-start');
	const breakStart = required<HTMLButtonElement>('break-start');
	const focusPause = required<HTMLButtonElement>('focus-pause');
	const focusResume = required<HTMLButtonElement>('focus-resume');
	const focusStop = required<HTMLButtonElement>('focus-stop');
	const careSettings = required<HTMLDetailsElement>('care-settings');
	const waterReminderEnabled = required<HTMLInputElement>('water-reminder-enabled');
	const waterReminderMinutes = required<HTMLInputElement>('water-reminder-minutes');
	const moveReminderEnabled = required<HTMLInputElement>('move-reminder-enabled');
	const moveReminderMinutes = required<HTMLInputElement>('move-reminder-minutes');
	const careDefer = required<HTMLInputElement>('care-defer');
	const careCue = required<HTMLElement>('care-cue');
	const careCueLabel = required<HTMLParagraphElement>('care-cue-label');
	const careCueCopy = required<HTMLParagraphElement>('care-cue-copy');
	const careDone = required<HTMLButtonElement>('care-done');
	const careSnooze = required<HTMLButtonElement>('care-snooze');
	const careSkip = required<HTMLButtonElement>('care-skip');
	const careBadge = required<HTMLSpanElement>('care-badge');
	const feedMode = required<HTMLSelectElement>('feed-mode');
	const gardenArt = required<HTMLImageElement>('garden-art');
	const gardenStatus = required<HTMLParagraphElement>('garden-status');
	const gardenProgress = required<HTMLProgressElement>('garden-progress');
	const gardenCount = required<HTMLParagraphElement>('garden-count');
	const gardenPlant = required<HTMLButtonElement>('garden-plant');
	const gardenWater = required<HTMLButtonElement>('garden-water');
	const gardenHang = required<HTMLButtonElement>('garden-hang');
	const gardenAvailability = required<HTMLParagraphElement>('garden-availability');
	const gardenCollection = required<HTMLDivElement>('garden-collection');
	const feedback = required<HTMLParagraphElement>('companion-feedback');
	const messageCard = required<HTMLDivElement>('message-card');
	const cardKind = required<HTMLSpanElement>('card-kind');
	const cardTopic = required<HTMLSpanElement>('card-topic');
	const messageText = required<HTMLParagraphElement>('message-text');
	const messageAnswer = required<HTMLParagraphElement>('message-answer');
	const revealAnswer = required<HTMLButtonElement>('reveal-answer');
	const messageSource = required<HTMLButtonElement>('message-source');
	const nextMessage = required<HTMLButtonElement>('next-message');
	const focusRing = required<SVGElement>('focus-ring');
	const focusProgress = required<SVGCircleElement>('focus-progress');

	let state: CompanionState = defaultCompanionState();
	let snapshot = companionSnapshot(state, Date.now());
	let ready = false;
	let requestSequence = 0;
	let pendingRequest: number | undefined;
	let activeTab: 'focus' | 'learn' | 'garden' = 'focus';
	let opener: HTMLElement | undefined;
	let layoutKey = '';
	let feedbackText = '';
	let gardenCollectionKey = '';

	const requestControls: Array<HTMLInputElement | HTMLSelectElement | HTMLButtonElement> = [
		focusMinutes, breakMinutes, focusIntent, preset25, preset50, focusStart, breakStart,
		focusPause, focusResume, focusStop, waterReminderEnabled, waterReminderMinutes,
		moveReminderEnabled, moveReminderMinutes, careDefer, careDone, careSnooze, careSkip,
		feedMode, revealAnswer, nextMessage, gardenPlant, gardenWater, gardenHang,
	];

	function setText(element: HTMLElement, value: string) {
		if (element.textContent !== value) { element.textContent = value; }
	}

	function showFeedback(value?: string) {
		const next = value ?? '';
		if (next === feedbackText) { return; }
		feedbackText = next;
		feedback.hidden = !next;
		setText(feedback, next);
	}

	function actionSettings() {
		const selectedFocus = Number(focusMinutes.value);
		const selectedBreak = Number(breakMinutes.value);
		const validFocus = Number.isInteger(selectedFocus) && selectedFocus >= 1 && selectedFocus <= 120;
		const validBreak = Number.isInteger(selectedBreak) && selectedBreak >= 1 && selectedBreak <= 30;
		focusMinutes.setAttribute('aria-invalid', String(!validFocus));
		breakMinutes.setAttribute('aria-invalid', String(!validBreak));
		if (!validFocus || !validBreak) {
			showFeedback('Enter whole focus minutes from 1 to 120 and break minutes from 1 to 30.');
			return undefined;
		}
		return { focusMinutes: selectedFocus, breakMinutes: selectedBreak, intent: focusIntent.value };
	}

	function beginRequest(dispatch: (requestId: number) => void) {
		if (!ready || pendingRequest !== undefined) { return; }
		const requestId = ++requestSequence;
		pendingRequest = requestId;
		stage.dataset.companionPersisted = 'false';
		showFeedback();
		render();
		options.onActivity();
		dispatch(requestId);
	}

	function send(action: CompanionAction) {
		beginRequest(requestId => options.send(action, requestId));
	}

	function configure() {
		if (state.focus.status === 'idle' || state.focus.status === 'finished') {
			const settings = actionSettings();
			if (settings) { send({ type: 'focus-configure', ...settings }); }
		}
	}

	function startFocus(phase: 'focus' | 'break') {
		const settings = actionSettings();
		if (settings) { send({ type: 'focus-start', phase, ...settings }); }
	}

	function cardText(card: LearningCard) {
		setText(cardKind, card.kind === 'fact' ? 'Fact' : card.kind === 'trivia' ? 'Trivia' : 'Encouragement');
		setText(cardTopic, card.topic);
		setText(messageText, card.text);
		if (messageText.title !== card.text) { messageText.title = card.text; }
		messageCard.classList.toggle('encouragement', card.kind === 'encouragement');
		messageAnswer.hidden = card.kind !== 'trivia' || !state.learning.revealed;
		setText(messageAnswer, card.answer ?? '');
		revealAnswer.hidden = card.kind !== 'trivia';
		setText(revealAnswer, state.learning.revealed ? 'Hide answer' : 'Reveal answer');
		messageSource.hidden = !card.source;
		setText(messageSource, card.source ? `Read source: ${card.source.label}` : 'Read source');
	}

	function setImage(image: HTMLImageElement, source: string, alternative: string) {
		if (image.src !== source) { image.src = source; }
		if (image.alt !== alternative) { image.alt = alternative; }
	}

	function reminderMinutes(input: HTMLInputElement, label: string) {
		const value = Number(input.value);
		const valid = validReminderMinutes(value);
		input.setAttribute('aria-invalid', String(!valid));
		if (!valid) {
			showFeedback(`${label} reminder minutes must be a whole number from ${REMINDER_MINUTES_MIN} to ${REMINDER_MINUTES_MAX}.`);
			return undefined;
		}
		return value;
	}

	function configureCare(kind: ReminderKind) {
		const input = kind === 'water' ? waterReminderMinutes : moveReminderMinutes;
		const enabled = kind === 'water' ? waterReminderEnabled.checked : moveReminderEnabled.checked;
		if (!enabled) {
			input.value = String(state.care[kind].intervalMinutes);
			input.setAttribute('aria-invalid', 'false');
			send({ type: 'care-configure', kind, enabled: false, intervalMinutes: state.care[kind].intervalMinutes });
			return;
		}
		const intervalMinutes = reminderMinutes(input, kind === 'water' ? 'Water' : 'Move');
		if (intervalMinutes !== undefined) { send({ type: 'care-configure', kind, enabled, intervalMinutes }); }
	}

	function renderCare() {
		const care = state.care;
		if (pendingRequest === undefined) {
			waterReminderEnabled.checked = care.water.enabled;
			moveReminderEnabled.checked = care.move.enabled;
			careDefer.checked = care.deferWhileFocusing;
			if (document.activeElement !== waterReminderMinutes) { waterReminderMinutes.value = String(care.water.intervalMinutes); }
			if (document.activeElement !== moveReminderMinutes) { moveReminderMinutes.value = String(care.move.intervalMinutes); }
		}
		const reminder = snapshot.reminder;
		careCue.hidden = reminder === null;
		careBadge.hidden = reminder === null || !tools.hidden;
		if (reminder) {
			const label = reminder === 'water' ? 'Water break' : 'Stand and move';
			setText(careCueLabel, label);
			setText(careCueCopy, reminder === 'water' ? 'A gentle moment to drink some water.' : 'A gentle moment to stand and move.');
		}
	}

	function rebuildGardenCollection() {
		const key = state.garden.collection.map(flower => `${flower.id}:${flower.blooms}`).join('|');
		if (key === gardenCollectionKey) { return; }
		gardenCollectionKey = key;
		const focused = document.activeElement instanceof HTMLElement ? document.activeElement.dataset.flowerId : undefined;
		gardenCollection.replaceChildren();
		for (const owned of state.garden.collection) {
			const flower = FLOWERS.find(candidate => candidate.id === owned.id)!;
			const button = document.createElement('button');
			button.type = 'button';
			button.dataset.flowerId = flower.id;
			button.setAttribute('aria-label', `Hang ${flower.name}, grown ${owned.blooms} ${owned.blooms === 1 ? 'time' : 'times'}`);
			const image = document.createElement('img');
			image.src = options.image(`garden-${flower.id}.svg`);
			image.alt = '';
			image.width = 36;
			image.height = 42;
			const label = document.createElement('span');
			label.textContent = flower.name;
			button.append(image, label);
			button.addEventListener('click', () => beginRequest(requestId => options.hangFlower(flower.id, requestId)));
			gardenCollection.append(button);
			if (focused === flower.id) { button.focus({ preventScroll: true }); }
		}
	}

	function renderGarden(busy: boolean) {
		rebuildGardenCollection();
		const plant = state.garden.plant;
		const complete = !!plant && plant.waterings >= WATERINGS_TO_BLOOM;
		const flower = complete ? FLOWERS.find(candidate => candidate.id === plant.flowerId) : undefined;
		const stageFile: Record<GardenStage, string> = {
			seed: 'garden-seed.svg', sprout: 'garden-sprout.svg', leaves: 'garden-leaves.svg', bud: 'garden-bud.svg',
			bloom: `garden-${plant?.flowerId ?? 'sunflower'}.svg`,
		};
		if (flower) {
			setImage(gardenArt, options.image(`garden-${flower.id}.svg`), `${flower.name} flower`);
		} else {
			setImage(gardenArt, options.image(stageFile[snapshot.gardenStage]), `${snapshot.gardenStage} garden stage`);
		}
		gardenProgress.value = plant?.waterings ?? 0;
		setText(gardenCount, `${plant?.waterings ?? 0} / ${WATERINGS_TO_BLOOM} waterings`);
		if (!plant) {
			setText(gardenStatus, 'Plant an unknown seed to begin.');
		} else if (complete) {
			const bloomed = FLOWERS.find(candidate => candidate.id === plant.flowerId)!;
			setText(gardenStatus, `${bloomed.name} bloomed!`);
		} else {
			const labels: Record<GardenStage, string> = { seed: 'A seed is resting in the soil.', sprout: 'A small sprout appeared.', leaves: 'Your plant is growing leaves.', bud: 'A closed bud is almost ready.', bloom: 'Your flower bloomed!' };
			setText(gardenStatus, labels[snapshot.gardenStage]);
		}
		gardenPlant.hidden = !!plant && !complete;
		setText(gardenPlant, complete ? 'Plant another seed' : 'Plant a seed');
		gardenWater.hidden = !plant || complete;
		gardenWater.disabled = busy || !snapshot.gardenCanWater;
		gardenHang.hidden = !flower;
		gardenHang.disabled = busy || !flower;
		setText(gardenAvailability, !plant ? 'Planting is free and the flower stays a surprise until bloom.'
			: complete ? 'Your flower is saved in Grown by you.'
				: snapshot.gardenCanWater ? `Ready to water on ${snapshot.gardenDay}.`
					: `Already watered for ${snapshot.gardenDay}. Missing days do not remove progress.`);
		for (const button of gardenCollection.querySelectorAll('button')) {
			button.toggleAttribute('disabled', busy);
		}
	}

	function render() {
		const focus = state.focus;
		const card = currentLearningCard(state);
		const statusText = focus.status === 'idle' ? 'Ready to focus'
			: focus.status === 'running' ? focus.phase === 'focus' ? 'Focusing' : 'On a break'
				: focus.status === 'paused' ? 'Paused'
					: focus.phase === 'focus' ? 'Focus complete' : 'Break complete';
		setText(focusStatus, statusText);
		focusTime.value = formatFocusTime(snapshot.remainingMs);
		const notice = focus.notice === 'elapsed-away' ? 'This session ended while you were away.'
			: focus.notice === 'clock-changed' ? 'The system clock changed, so the timer was paused.' : '';
		focusNotice.hidden = !notice;
		setText(focusNotice, notice);
		if (document.activeElement !== focusMinutes) { focusMinutes.value = String(state.settings.focusMinutes); }
		if (document.activeElement !== breakMinutes) { breakMinutes.value = String(state.settings.breakMinutes); }
		if (document.activeElement !== focusIntent) { focusIntent.value = state.settings.intent; }
		if (document.activeElement !== feedMode) { feedMode.value = state.learning.mode; }

		const configurationLocked = focus.status === 'running' || focus.status === 'paused';
		const busy = pendingRequest !== undefined;
		for (const control of requestControls) { control.disabled = !ready || busy; }
		focusMinutes.disabled ||= configurationLocked;
		breakMinutes.disabled ||= configurationLocked;
		focusIntent.disabled ||= configurationLocked;
		preset25.disabled ||= configurationLocked;
		preset50.disabled ||= configurationLocked;
		focusStart.hidden = configurationLocked;
		breakStart.hidden = configurationLocked;
		focusPause.hidden = focus.status !== 'running';
		focusResume.hidden = focus.status !== 'paused';
		focusStop.hidden = focus.status === 'idle';

		cardText(card);
		renderCare();
		renderGarden(busy);
		const showRing = focus.status !== 'idle';
		focusRing.toggleAttribute('hidden', !showRing);
		focusProgress.style.strokeDashoffset = String(100 * (1 - snapshot.progress));
		focusReadout.textContent = showRing ? formatFocusTime(snapshot.remainingMs) : 'Focus';
		focusReadout.title = showRing ? `${statusText}: ${formatFocusTime(snapshot.remainingMs)}` : 'Open focus session';
		stage.dataset.companionReady = String(ready);
		toggle.disabled = !ready;
		focusReadout.disabled = !ready;
		nextMessage.disabled = !ready || busy;

		const focusLayout = !tools.hidden && activeTab === 'focus' ? `${focus.status}:${focus.notice}:${careSettings.open}` : '';
		const gardenLayout = !tools.hidden && activeTab === 'garden'
			? `${state.garden.plant?.id}:${state.garden.plant?.waterings}:${gardenCollectionKey}:${snapshot.gardenCanWater}` : '';
		const cueLayout = !tools.hidden ? snapshot.reminder : '';
		const nextLayoutKey = [tools.hidden, activeTab, focusLayout, gardenLayout, cueLayout, card.id, state.learning.revealed].join('|');
		if (nextLayoutKey !== layoutKey) {
			layoutKey = nextLayoutKey;
			options.onLayout();
		}
	}

	function selectTab(tab: 'focus' | 'learn' | 'garden', focusTab = false) {
		activeTab = tab;
		const focusSelected = tab === 'focus';
		const learnSelected = tab === 'learn';
		const gardenSelected = tab === 'garden';
		tabFocus.setAttribute('aria-selected', String(focusSelected));
		tabLearn.setAttribute('aria-selected', String(learnSelected));
		tabGarden.setAttribute('aria-selected', String(gardenSelected));
		tabFocus.tabIndex = focusSelected ? 0 : -1;
		tabLearn.tabIndex = learnSelected ? 0 : -1;
		tabGarden.tabIndex = gardenSelected ? 0 : -1;
		focusPanel.hidden = !focusSelected;
		learnPanel.hidden = !learnSelected;
		gardenPanel.hidden = !gardenSelected;
		if (focusTab) { (focusSelected ? tabFocus : learnSelected ? tabLearn : tabGarden).focus(); }
		render();
	}

	function open(tab: 'focus' | 'learn' | 'garden') {
		if (!ready) { return; }
		if (tools.hidden) {
			opener = document.activeElement instanceof HTMLElement ? document.activeElement : toggle;
			tools.hidden = false;
			toggle.setAttribute('aria-expanded', 'true');
			options.onOpen();
		}
		selectTab(tab, true);
	}

	function close(restoreFocus = true) {
		if (tools.hidden) { return; }
		tools.hidden = true;
		toggle.setAttribute('aria-expanded', 'false');
		if (restoreFocus) { (opener ?? toggle).focus({ preventScroll: true }); }
		render();
		options.onActivity();
	}

	function receive(value: unknown) {
		const restored = snapshotValue(value);
		if (!restored) { return; }
		snapshot = restored;
		state = restored.state;
		if (!ready) {
			ready = true;
			stage.dataset.companionReady = 'true';
		}
		if (pendingRequest === undefined) { stage.dataset.companionPersisted = restored.error ? 'error' : 'true'; }
		showFeedback(restored.error);
		render();
	}

	function result(requestId: number, error?: string, message?: string) {
		if (requestId !== pendingRequest) { return; }
		pendingRequest = undefined;
		stage.dataset.companionPersisted = error ? 'error' : 'true';
		showFeedback(error ?? message);
		render();
		options.onActivity();
	}

	function nextCard() {
		send({ type: 'feed-next' });
	}

	toggle.addEventListener('click', () => tools.hidden ? open('focus') : close());
	focusReadout.addEventListener('click', () => open('focus'));
	tabFocus.addEventListener('click', () => selectTab('focus'));
	tabLearn.addEventListener('click', () => selectTab('learn'));
	tabGarden.addEventListener('click', () => selectTab('garden'));
	const tabs = [tabFocus, tabLearn, tabGarden] as const;
	for (const [index, tab] of tabs.entries()) {
		tab.addEventListener('keydown', event => {
			if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') {
				event.preventDefault();
				const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
					: event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : (index + 1) % tabs.length;
				selectTab(next === 0 ? 'focus' : next === 1 ? 'learn' : 'garden', true);
			}
		});
	}
	tools.addEventListener('keydown', event => {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			close();
		}
	});
	preset25.addEventListener('click', () => { focusMinutes.value = '25'; breakMinutes.value = '5'; configure(); });
	preset50.addEventListener('click', () => { focusMinutes.value = '50'; breakMinutes.value = '10'; configure(); });
	for (const control of [focusMinutes, breakMinutes, focusIntent]) {
		control.addEventListener('blur', event => {
			const target = event.relatedTarget;
			if (!(target instanceof Node) || !focusPanel.contains(target)) { configure(); }
		});
	}
	focusStart.addEventListener('click', () => startFocus('focus'));
	breakStart.addEventListener('click', () => startFocus('break'));
	focusPause.addEventListener('click', () => send({ type: 'focus-pause' }));
	focusResume.addEventListener('click', () => send({ type: 'focus-resume' }));
	focusStop.addEventListener('click', () => send({ type: 'focus-stop' }));
	careSettings.addEventListener('toggle', () => { render(); });
	waterReminderEnabled.addEventListener('change', () => configureCare('water'));
	waterReminderMinutes.addEventListener('change', () => configureCare('water'));
	moveReminderEnabled.addEventListener('change', () => configureCare('move'));
	moveReminderMinutes.addEventListener('change', () => configureCare('move'));
	careDefer.addEventListener('change', () => send({ type: 'care-defer', enabled: careDefer.checked }));
	for (const [button, action] of [[careDone, 'done'], [careSnooze, 'snooze'], [careSkip, 'skip']] as const) {
		button.addEventListener('click', () => {
			if (snapshot.reminder) { send({ type: 'care-dismiss', kind: snapshot.reminder, action }); }
		});
	}
	gardenPlant.addEventListener('click', () => send({ type: 'garden-plant' }));
	gardenWater.addEventListener('click', () => send({ type: 'garden-water' }));
	gardenHang.addEventListener('click', () => {
		const flowerId = state.garden.plant?.waterings === WATERINGS_TO_BLOOM ? state.garden.plant.flowerId : undefined;
		if (flowerId && state.garden.collection.some(flower => flower.id === flowerId)) {
			beginRequest(requestId => options.hangFlower(flowerId, requestId));
		}
	});
	feedMode.addEventListener('change', () => send({ type: 'feed-mode', mode: feedMode.value as FeedMode }));
	revealAnswer.addEventListener('click', () => send({ type: 'feed-reveal', cardId: state.learning.cardId, revealed: !state.learning.revealed }));
	messageSource.addEventListener('click', () => {
		if (learningCard(state.learning.cardId)?.source) { options.openSource(state.learning.cardId); }
	});
	nextMessage.addEventListener('click', nextCard);
	messageCard.addEventListener('mouseenter', options.onActivity);
	messageCard.addEventListener('mouseleave', options.onActivity);
	messageCard.addEventListener('focusin', options.onActivity);
	messageCard.addEventListener('focusout', options.onActivity);

	for (const control of [toggle, focusReadout, ...requestControls]) { control.disabled = true; }
	focusRing.setAttribute('hidden', '');

	return {
		receive,
		result,
		open,
		close,
		toggle: () => tools.hidden ? open(activeTab) : close(),
		nextCard,
		isOpen: () => !tools.hidden,
		canRotate: () => tools.hidden && !state.learning.revealed && !messageCard.matches(':hover')
			&& !messageCard.contains(document.activeElement) && pendingRequest === undefined,
	};
}
