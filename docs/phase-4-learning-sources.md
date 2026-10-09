# Learning-card source review

The first implemented catalogue contains **60 factual cards, 30 trivia questions and the existing 80 optional encouragement messages**. The card text is original concise paraphrasing. Facts and trivia carry their source label/HTTPS URL in `extension/src/learning-cards.ts`; encouragement messages are original project copy.

**Review date: 2026-10-08.** This is documentary content review, not a claim that every example was executed or that product/company performance was benchmarked.

| Topic | Public sources checked | Scope of the claims |
|---|---|---|
| Git | Pro Git's branching/staging chapters; official `gitignore`, `git-revert`, `git-stash`, `git-diff` and `git-merge` documentation | Branch pointers, staging snapshots, commit parents, normal/detached HEAD, tracked files, reversals, stash and fast-forward behavior |
| Text and web/code | Unicode UTF FAQ, UAX29 and normalization FAQ; RFC8259; MDN HTTP/HTTPS, microtask and Set references | Scalar values versus perceived characters, normalization, JSON grammar, response classes, TLS, callback queues and object/NaN equality |
| GPU | NVIDIA's public CUDA Programming Guide sections on programming model, SIMT kernels, advanced kernels and unified memory; CUDA Best Practices Guide | Explicitly CUDA-specific warp/block/grid terminology, on-chip shared memory, barriers, coalescing and platform-dependent memory behavior |
| AI | Google's public ML Crash Course sections on LLMs, embeddings, overfitting, dataset splits, labels and training hyperparameters | Tokens, task-dependent representations, unseen data, proxy labels, learning rate, batches and epochs |
| Silicon | Intel Tech101 semiconductor/transistor introductions; Micron's public introductory memory presentation | Generic devices/fabrication history and DRAM/SRAM/flash behavior; no actual proprietary chip/test data |
| Testing and time | Playwright locator/actionability documentation; Hypothesis quickstart/replay guide; Google Testing Blog coverage article; MDN performance clock/local dates/idempotence; RFC3961 section6.1.3 | Conditions instead of fixed waiting, generated/replayed inputs, coverage limits, wall versus monotonic clocks, local date changes and checksums |

Important wording boundaries:

- A CUDA warp has 32 threads; the catalogue does not assert every vendor's GPU execution group has that width.
- A UTF-8 scalar value's byte width is not a bound on the bytes in a user-perceived character.
- Unified Memory behavior depends on the platform; the cards do not promise a performance speedup or one physical memory pool.
- SRAM avoids DRAM-style refresh while powered but remains volatile.
- A completed timer is not evidence of completed work. The app does not infer productivity from elapsed time.
- Code coverage records execution, not proof of correctness.
- CRCs are not sender authentication; the cards do not recommend legacy cryptographic constructions from the cited RFC.

The lead checked the source claims through focused public-document searches and authored all card/question/answer text. Structural checks verify exact counts, unique stable IDs, HTTPS sources, nonempty trivia answers, bounded text and complete feed rotation. These checks supplement content review; they are not factual graders.

No NVIDIA-internal TM/93K material, private logs, copied artwork, merchant information or runtime AI output is included. Source links open only when the user chooses Read source.
