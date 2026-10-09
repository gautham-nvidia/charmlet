import { MESSAGES } from './messages';

export type FeedMode = 'mix' | 'facts' | 'trivia' | 'encouragement';
export type CardKind = 'fact' | 'trivia' | 'encouragement';
export interface LearningSource { readonly label: string; readonly url: string; }
export interface LearningCard {
	readonly id: string;
	readonly kind: CardKind;
	readonly topic: string;
	readonly text: string;
	readonly answer?: string;
	readonly source?: LearningSource;
}

// Original concise wording; public source claims reviewed 2026-10-08.
const sources = {
	branches: { label: 'Pro Git', url: 'https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell' },
	staging: { label: 'Pro Git', url: 'https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository' },
	ignore: { label: 'Git documentation', url: 'https://git-scm.com/docs/gitignore' },
	revert: { label: 'Git documentation', url: 'https://git-scm.com/docs/git-revert' },
	stash: { label: 'Git documentation', url: 'https://git-scm.com/docs/git-stash' },
	diff: { label: 'Git documentation', url: 'https://git-scm.com/docs/git-diff' },
	merge: { label: 'Git documentation', url: 'https://git-scm.com/docs/git-merge' },
	utf: { label: 'Unicode FAQ', url: 'https://www.unicode.org/faq/utf_bom.html' },
	graphemes: { label: 'Unicode UAX #29', url: 'https://www.unicode.org/reports/tr29/' },
	normalization: { label: 'Unicode FAQ', url: 'https://www.unicode.org/faq/normalization.html' },
	json: { label: 'RFC 8259', url: 'https://www.rfc-editor.org/rfc/rfc8259.html' },
	http: { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status' },
	https: { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Glossary/HTTPS' },
	tasks: { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide' },
	set: { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set' },
	warps: { label: 'CUDA Programming Guide', url: 'https://docs.nvidia.com/cuda/cuda-programming-guide/03-advanced/advanced-kernel-programming.html' },
	gpuModel: { label: 'CUDA Programming Guide', url: 'https://docs.nvidia.com/cuda/cuda-programming-guide/01-introduction/programming-model.html' },
	kernels: { label: 'CUDA Programming Guide', url: 'https://docs.nvidia.com/cuda/cuda-programming-guide/02-basics/writing-cuda-kernels.html' },
	gpuMemory: { label: 'CUDA Programming Guide', url: 'https://docs.nvidia.com/cuda/cuda-programming-guide/02-basics/understanding-memory.html' },
	coalescing: { label: 'CUDA Best Practices Guide', url: 'https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/' },
	tokens: { label: 'Google ML Crash Course', url: 'https://developers.google.com/machine-learning/crash-course/llm' },
	embeddings: { label: 'Google ML Crash Course', url: 'https://developers.google.com/machine-learning/crash-course/embeddings' },
	embeddingTasks: { label: 'Google ML Crash Course', url: 'https://developers.google.com/machine-learning/crash-course/embeddings/obtaining-embeddings' },
	overfit: { label: 'Google ML Crash Course', url: 'https://developers.google.com/machine-learning/crash-course/overfitting/overfitting' },
	data: { label: 'Google ML Crash Course', url: 'https://developers.google.com/machine-learning/crash-course/overfitting/dividing-datasets' },
	labels: { label: 'Google ML Crash Course', url: 'https://developers.google.com/machine-learning/crash-course/overfitting/labels' },
	training: { label: 'Google ML Crash Course', url: 'https://developers.google.com/machine-learning/crash-course/linear-regression/hyperparameters' },
	silicon: { label: 'Intel Tech 101', url: 'https://newsroom.intel.com/tech101/what-are-semiconductors' },
	transistor: { label: 'Intel Tech 101', url: 'https://newsroom.intel.com/tech101/the-transistor-explained' },
	memory: { label: 'Micron education', url: 'https://www.micron.com/content/dam/micron/educatorhub/intro-to-memory/micron-intro-to-memory-presentation.pdf' },
	locators: { label: 'Playwright documentation', url: 'https://playwright.dev/docs/api/class-locator' },
	waiting: { label: 'Playwright documentation', url: 'https://playwright.dev/docs/actionability' },
	properties: { label: 'Hypothesis documentation', url: 'https://hypothesis.readthedocs.io/en/latest/quickstart.html' },
	replay: { label: 'Hypothesis documentation', url: 'https://hypothesis.readthedocs.io/en/latest/tutorial/replaying-failures.html' },
	coverage: { label: 'Google Testing Blog', url: 'https://testing.googleblog.com/2020/08/code-coverage-best-practices.html' },
	clock: { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Performance/now' },
	dates: { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/setDate' },
	idempotent: { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Glossary/Idempotent' },
	crc: { label: 'RFC 3961, section 6.1.3', url: 'https://www.rfc-editor.org/rfc/rfc3961.html' },
} as const satisfies Record<string, LearningSource>;

type SourceKey = keyof typeof sources;
type FactRow = readonly [id: string, text: string, source: SourceKey];
type TriviaRow = readonly [id: string, text: string, answer: string, source: SourceKey];

const factGroups: ReadonlyArray<readonly [topic: string, rows: readonly FactRow[]]> = [
	['Git', [
		['git-branch', 'A Git branch is a movable pointer to a commit. Creating one does not make a second copy of your project.', 'branches'],
		['git-stage', 'Git commits the version you staged. Editing a file after git add does not silently update that staged snapshot.', 'staging'],
		['git-untracked', 'An untracked file is not automatically included in your next Git commit. Staging makes the choice explicit.', 'staging'],
		['git-parents', 'A normal Git commit has one parent; a merge can have several. The first commit has no parent.', 'branches'],
		['git-head', 'HEAD usually names your current branch. In detached-HEAD mode it can point directly to a commit instead.', 'branches'],
		['git-ignore', 'Adding a tracked file to .gitignore does not stop Git tracking it. Ignore rules primarily concern untracked files.', 'ignore'],
		['git-revert', 'git revert records a new commit that reverses an earlier change, preserving the existing history.', 'revert'],
		['git-stash', 'git stash can save changes from your working tree and index so you can return to a clean working tree.', 'stash'],
		['git-staged-diff', 'git diff --staged compares staged changes with HEAD by default. It answers what the next commit would contain.', 'diff'],
		['git-fast-forward', 'A fast-forward merge moves a branch pointer to an existing descendant commit; it needs no new merge commit.', 'merge'],
	]],
	['Code', [
		['utf8-width', 'UTF-8 represents a Unicode scalar value using one to four bytes. A visible character can require more than one scalar value.', 'utf'],
		['grapheme', 'One character on screen can contain several Unicode code points. Grapheme clusters approximate the characters people perceive.', 'graphemes'],
		['normalization', 'Accented text can have different but canonically equivalent Unicode representations. Normalization makes those forms consistent.', 'normalization'],
		['json-values', 'JSON has objects, arrays, strings, numbers, booleans and null. Functions and undefined are not JSON values.', 'json'],
		['json-comments', 'Standard JSON has no comment syntax. A file format that permits comments is extending the JSON grammar.', 'json'],
		['http-classes', 'HTTP status codes form five classes: information, success, redirection, client errors and server errors.', 'http'],
		['https', 'HTTPS uses TLS to encrypt communication between client and server. It is the encrypted form of HTTP.', 'https'],
		['microtasks', 'JavaScript promise callbacks use microtasks. In a browser, those run after the current stack empties, before the next task.', 'tasks'],
		['set-objects', 'Two separate JavaScript objects can have identical fields and still be different Set entries. Object identity matters.', 'set'],
		['set-nan', 'A JavaScript Set treats NaN as the same value as NaN, even though the expression NaN === NaN is false.', 'set'],
	]],
	['GPU', [
		['cuda-warp', 'CUDA schedules threads in groups of 32 called warps. A thread block can contain multiple warps.', 'warps'],
		['warp-name', 'The GPU term warp comes from weaving: many parallel threads working together. Hardware vocabulary has a textile streak.', 'warps'],
		['shared-memory', 'Threads in a CUDA block can exchange data through the block’s on-chip shared memory.', 'kernels'],
		['cuda-grid', 'CUDA organizes threads into blocks and blocks into grids. Blocks and grids can be one-, two- or three-dimensional.', 'kernels'],
		['streaming-multiprocessor', 'A CUDA Streaming Multiprocessor runs thread blocks and schedules their warps. GPU work has more than one level of grouping.', 'gpuModel'],
		['coalescing', 'Nearby GPU threads accessing nearby global-memory locations can let hardware combine memory operations. Access patterns matter.', 'coalescing'],
		['memory-placement', 'A CPU and discrete GPU can have separate physical memories. Where data lives affects how a heterogeneous program accesses it.', 'gpuMemory'],
		['unified-memory', 'CUDA Unified Memory lets managed allocations be accessed by CPU and GPU code; the available behavior depends on the platform.', 'gpuMemory'],
		['shared-l1', 'On CUDA GPUs, shared memory and L1 cache can use the same on-chip physical resource. The exact arrangement varies by architecture.', 'gpuModel'],
		['block-barrier', '__syncthreads() is a CUDA thread-block barrier, not a barrier for every block in a grid.', 'kernels'],
	]],
	['AI', [
		['tokens', 'A token is not always a word. A language model can split text into words, word pieces or individual characters.', 'tokens'],
		['token-language', 'Token counts depend on the tokenizer and the language. A characters-per-token shortcut is not a universal rule.', 'tokens'],
		['embedding-vectors', 'An embedding represents an item with a dense vector of numbers, often using fewer dimensions than a large one-hot encoding.', 'embeddings'],
		['embedding-task', 'Embeddings can be trained for a particular task. Their useful relationships depend on how they were learned.', 'embeddingTasks'],
		['overfitting', 'A model can perform well on its training data and poorly on unseen data. That is overfitting, not generalization.', 'overfit'],
		['dataset-splits', 'Training, validation and test sets serve different roles. Repeatedly tuning against the test set can wear out its independence.', 'data'],
		['proxy-labels', 'A proxy label only approximates the thing you want to predict. Its usefulness depends on how well that connection holds.', 'labels'],
		['learning-rate', 'The learning rate scales a model’s parameter update during gradient descent. Bigger is not automatically better.', 'training'],
		['batch-size', 'Batch size controls how many training examples are processed before a parameter update in the described training procedure.', 'training'],
		['epoch', 'One training epoch means processing every example in the training set once. An epoch is not necessarily one update.', 'training'],
	]],
	['Silicon', [
		['silicon-material', 'Silicon is the most common semiconductor material used in computer chips. A semiconductor’s conductivity can be controlled.', 'silicon'],
		['mosfet-gate', 'A MOSFET’s gate controls a channel between its source and drain. That tiny switching idea underpins digital logic.', 'transistor'],
		['source-drain', 'Source and drain are the MOSFET terminals between which current flows through a controlled channel.', 'transistor'],
		['lithography', 'Photolithography uses light and patterned masks to help create circuitry on a wafer, one manufacturing stage at a time.', 'silicon'],
		['wafer-dies', 'A semiconductor wafer contains many individual chip regions, called dies, which are separated later in manufacturing.', 'silicon'],
		['fab-cleanroom', 'Chip fabrication uses controlled cleanrooms while building patterned devices and interconnections on wafers.', 'silicon'],
		['transistor-history', 'The first transistor was demonstrated at Bell Labs in 1947. A very small device changed a very large industry.', 'transistor'],
		['dram-refresh', 'DRAM stores charge that leaks away, so it needs refresh operations to retain its data while powered.', 'memory'],
		['sram', 'SRAM does not need DRAM-style refresh while powered, but it is still volatile: removing power loses the stored information.', 'memory'],
		['flash', 'Flash is non-volatile memory: it can retain stored information without continuous power.', 'memory'],
	]],
	['Testing', [
		['locator', 'A Playwright locator describes how to find an element when needed, rather than keeping one fixed DOM-node snapshot.', 'locators'],
		['visibility-check', 'Playwright isVisible() reports visibility immediately. A visibility assertion can instead wait for the desired condition.', 'locators'],
		['actionability', 'Before a normal click, Playwright checks conditions such as visibility, stability, enabled state and whether the element receives events.', 'waiting'],
		['property-tests', 'Property-based tests generate varied inputs and check a rule about the results, complementing carefully chosen examples.', 'properties'],
		['replay-tests', 'Keeping a failing input makes a bug easier to reproduce. Hypothesis supports explicit examples as well as saved failures.', 'replay'],
		['coverage', 'Code coverage shows what executed during tests. It does not prove that the assertions checked the right behavior.', 'coverage'],
		['monotonic-time', 'performance.now() uses a monotonic time origin. Unlike wall-clock timestamps, it is not adjusted when the system clock changes.', 'clock'],
		['calendar-days', 'A local calendar day is not always 24 elapsed hours. Daylight-saving transitions can change the difference between local dates.', 'dates'],
		['idempotence', 'An idempotent HTTP method has the same intended server effect when an identical request is repeated; the response can still differ.', 'idempotent'],
		['crc', 'A CRC is an error-detection checksum, not proof of who sent a message. Unkeyed checksums do not provide cryptographic authentication.', 'crc'],
	]],
];

const triviaRows: readonly TriviaRow[] = [
	['branch-pointer', 'What does a Git branch point to?', 'A commit. The branch pointer moves as that branch advances.', 'branches'],
	['staging-area', 'What prepares selected changes for the next Git commit?', 'The index, also called the staging area.', 'staging'],
	['history-undo', 'Which Git command records a new commit to reverse an earlier change?', 'git revert. It records the reversal without deleting the existing history.', 'revert'],
	['staged-view', 'What does git diff --staged compare by default?', 'Your staged changes against HEAD.', 'diff'],
	['head-pointer', 'In an ordinary attached checkout, what does HEAD name?', 'Your current branch. A detached HEAD can point directly to a commit.', 'branches'],
	['utf8-bytes', 'How many bytes can UTF-8 use for one Unicode scalar value?', 'One to four bytes.', 'utf'],
	['one-character', 'Can one visible character contain multiple Unicode code points?', 'Yes. A grapheme cluster can contain several code points.', 'graphemes'],
	['json-boolean', 'Does standard JSON spell its true/false literals with capital letters?', 'No. The literal names true, false and null are lowercase.', 'json'],
	['json-array', 'Does a JSON array preserve element order?', 'Yes. A JSON array is an ordered sequence of values.', 'json'],
	['nan-set', 'How many entries result from adding NaN twice to an empty JavaScript Set?', 'One. Set value equality treats NaN as equal to NaN.', 'set'],
	['warp-size', 'How many threads form a CUDA warp?', '32 threads.', 'warps'],
	['block-scratchpad', 'Which CUDA memory space is a scratchpad shared by threads in a block?', 'Shared memory.', 'kernels'],
	['grid-parts', 'What is a CUDA grid made of?', 'Thread blocks, which in turn contain threads.', 'kernels'],
	['block-dim', 'Which CUDA built-in reports a thread block’s dimensions: blockDim or threadIdx?', 'blockDim. threadIdx identifies a thread within its block.', 'kernels'],
	['barrier-scope', 'Does __syncthreads() synchronize every block in a CUDA grid?', 'No. It synchronizes participating threads in one block.', 'kernels'],
	['token-word', 'Must a language-model token be a whole word?', 'No. It can be a word piece or a character too.', 'tokens'],
	['embedding-form', 'An embedding represents an item as what kind of object?', 'A vector of numbers.', 'embeddings'],
	['step-size', 'Which hyperparameter scales a gradient-descent parameter update?', 'The learning rate.', 'training'],
	['memorized-training', 'What is it called when a model fits training data well but generalizes poorly?', 'Overfitting.', 'overfit'],
	['one-epoch', 'What does one training epoch represent?', 'One pass through every example in the training set.', 'training'],
	['common-material', 'Which semiconductor material is most common in computer chips?', 'Silicon.', 'silicon'],
	['gate-role', 'Which MOSFET part controls the channel between source and drain?', 'The gate.', 'transistor'],
	['wafer-chips', 'Does a wafer usually contain one die or many dies?', 'Many individual dies.', 'silicon'],
	['memory-refresh', 'Which requires periodic refresh to retain its charge-based data: DRAM or SRAM?', 'DRAM. Both are volatile, but SRAM does not need DRAM-style refresh.', 'memory'],
	['power-off-memory', 'Is flash volatile or non-volatile?', 'Non-volatile: it can retain information without continuous power.', 'memory'],
	['coverage-proof', 'Does 100% line coverage prove a program is correct?', 'No. Executing every line does not prove the assertions checked every important behavior.', 'coverage'],
	['elapsed-clock', 'Which browser clock avoids wall-clock adjustments: Date.now() or performance.now()?', 'performance.now(), which uses a monotonic time origin.', 'clock'],
	['repeat-effect', 'Does HTTP idempotence require an identical response every time?', 'No. It concerns the intended effect on the server.', 'idempotent'],
	['test-many-inputs', 'Which testing style generates varied inputs to check a general rule?', 'Property-based testing.', 'properties'],
	['checksum-identity', 'Does a CRC authenticate the sender of a message?', 'No. A CRC is not cryptographic sender authentication.', 'crc'],
];

// Rotate topics in the fact deck instead of presenting ten cards from one topic in a row.
export const FACT_CARDS: readonly LearningCard[] = Object.freeze(
	Array.from({ length: 10 }, (_, index) => factGroups.map(([topic, rows]) => {
		const [id, text, source] = rows[index];
		return Object.freeze({ id: `fact-${id}`, kind: 'fact' as const, topic, text, source: sources[source] });
	})).flat(),
);
export const TRIVIA_CARDS: readonly LearningCard[] = Object.freeze(triviaRows.map(([id, text, answer, source], index) =>
	Object.freeze({ id: `trivia-${id}`, kind: 'trivia' as const, topic: factGroups[Math.floor(index / 5)][0], text, answer, source: sources[source] })));
export const ENCOURAGEMENT_CARDS: readonly LearningCard[] = Object.freeze(MESSAGES.map((text, index) =>
	Object.freeze({ id: `encouragement-${index}`, kind: 'encouragement' as const, topic: 'Encouragement', text })));
export const MIXED_CARDS: readonly LearningCard[] = Object.freeze(FACT_CARDS.flatMap((card, index) =>
	index % 2 === 1 ? [card, TRIVIA_CARDS[Math.floor(index / 2)]] : [card]));
export const ALL_CARDS: readonly LearningCard[] = Object.freeze([...FACT_CARDS, ...TRIVIA_CARDS, ...ENCOURAGEMENT_CARDS]);
const byId = new Map(ALL_CARDS.map(card => [card.id, card]));

export function isFeedMode(value: unknown): value is FeedMode {
	return value === 'mix' || value === 'facts' || value === 'trivia' || value === 'encouragement';
}

export function feedDeck(mode: FeedMode): readonly LearningCard[] {
	return mode === 'facts' ? FACT_CARDS : mode === 'trivia' ? TRIVIA_CARDS
		: mode === 'encouragement' ? ENCOURAGEMENT_CARDS : MIXED_CARDS;
}

export function learningCard(id: string): LearningCard | undefined {
	return byId.get(id);
}
