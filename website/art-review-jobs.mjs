import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { FLOWERS } = require('../extension/out/garden-core.js');

const motifs = {
  terminal: 'A sculpted mint mechanical keyboard keycap with one clean embossed terminal chevron and underscore, a beveled translucent rim and a warm tiny amber status light. The keycap itself is the silhouette, not a symbol printed on a plaque.',
  chip: 'A violet processor package in three-quarter view with a gleaming exposed central die, delicate gold contacts and believable layered substrate. A premium miniature hardware illustration with an interesting stepped silhouette.',
  wafer: 'A thin iridescent silicon wafer with a small orientation notch, realistic rainbow reflections and individual patterned dies. Slightly tilted with a delicate silver edge; the wafer itself is the object, not a brown medallion.',
  circuit: 'A small asymmetric teal circuit board with raised components, copper routes, tiny capacitors and one warm indicator LED. The board outline has stepped connector cutouts and convincing thickness.',
  transistor: 'A freestanding copper-and-graphite three-legged transistor with clearly separate bent silver leads and a small faceted ceramic body. Detailed material highlights and an appealing old-lab personality.',
  'memory-stack': 'A compact sculptural stack of four offset memory dies with violet glass layers and tiny copper interconnects visible between them. Distinct stepped edges, not a box with a memory icon.',
  'evil-eye': 'An original deep cobalt glass evil-eye amulet with layered white, turquoise and dark central glass, soft handmade imperfections and a small silver loop. Rich dimensional glass, not a flat circle icon.',
  drishti: 'An original Tamil-inspired Drishti Bommai hanging doll: expressive protective terracotta face, raised brows, bold moustache, small painted forehead detail and rich coral, cream and indigo colours. Respectful handmade folk-art character, not a generic mask badge or a photograph.',
  hamsa: 'An original open-palm hamsa keepsake with a sculpted warm-ivory hand, delicate copper filigree lines and a cobalt eye set in the palm. The fingers form the outer silhouette; no surrounding badge.',
  'lemon-chilies': 'A lively hanging bundle of one textured golden lemon and several individually curved dark-green chilies, tied with fine cotton thread. Botanical detail and charming colour, no face, no background plaque.',
  'probe-card': 'A circular laboratory probe card in tilted three-quarter view, with a copper contact ring, radial fine metallic probe fingers and a dark central opening. Detailed instrument illustration, no official vendor design or logo.',
  'logic-gate': 'A sculptural small logic gate shape in pale blue ceramic with two separate copper input wires and one output wire, tiny glowing node beads and an asymmetric silhouette. No text or flat diagram printed on a rectangle.',
  finfet: 'A clear educational FinFET-inspired sculptural device: three tall blue silicon fins rise from a tiny base and one broad warm copper gate bridges them, with distinct metallic terminals. Generic concept, not a proprietary process diagram.',
  'photon-link': 'Two compact silver optical couplers joined by a graceful curved translucent cyan light guide. A tiny glowing pulse travels through the guide. Refined glass and brushed metal, no rectangle behind it.',
  lotus: 'A layered lotus bloom with sculpted soft-rose petals, subtle translucent edges, a golden heart and two dark sage leaves. An elegant botanical illustration with depth rather than a photo or lotus symbol.',
  sunrise: 'An original sun peeking over two sweeping terracotta mountain ridges, as an irregular hand-painted dimensional landscape cutout. Warm peach light, subtle texture and no circle or badge around the scene.',
  'gpu-tile': 'A powerful generic GPU package with a broad iridescent exposed die and four dark memory blocks around it on an angular graphite substrate. Fine copper traces, cool mint highlights, perspective depth; no branded logo or real chip floorplan.',
  'cpu-tile': 'A distinct silver CPU package, seen at an angle with a satin metal heat spreader, a softly chamfered corner and fine gold pin contacts beneath. Warm lilac edge lighting and no lettering.',
  'hbm-tower': 'A tall slender tower of six offset memory layers with translucent blue edges and visible copper micro-bump columns, capped by one small glossy die. Architectural vertical silhouette, not the same shape as a CPU.',
  'cache-stack': 'Three small amber and ivory memory slabs arranged as a fan-like stepped stack, with fine connector grooves and one tiny violet status light. Compact tangible illustrated hardware, no text.',
  'chiplet-bridge': 'Two differently sized iridescent chiplets linked by a sculpted copper bridge over a narrow violet interposer. Show a clear gap and the bridge structure; an airy asymmetric silhouette.',
  'vector-lane': 'Three parallel cyan, indigo and copper data ribbons sweeping forward together in a flowing S curve, each ending in a small faceted arrowhead. A dimensional visualization of parallel lanes, not an app icon.',
  'tensor-array': 'An open floating lattice of small pearlescent cubes in three-dimensional rows, with warm copper connections and one softly illuminated central cube. Distinct airy geometric silhouette, no backing plate.',
  'neural-tile': 'A sculptural neural network of glass-like lavender nodes joined by curved copper filaments, growing upward like a small branching constellation. No brain photograph, no flat tile behind it.',
  'silicon-lattice': 'A faceted crystal lattice made from blue-silver silicon-like spheres and delicate silver bonds, with a few offset nodes producing a natural mineral silhouette. Polished scientific illustration.',
  'bump-grid': 'A small tilted array of gold solder micro-bumps on a thin dark interconnect fragment, with a curled peeled corner revealing the layered structure. Material-rich macro illustration, not a framed diagram.',
  interposer: 'A thin translucent turquoise interposer bridge with fine copper routing visible through the glass and two small silver connector pads at different levels. Long elegant stepped shape.',
  'memory-bus': 'A flowing bundle of four warm copper traces linking two tiny stacked violet memory components, with delicate connector tips and curved cable-like paths. Distinct asymmetrical hardware motif.',
  'alu-key': 'A small beautifully machined calculating-mechanism key: a copper key bow built from interlocking geometric gears with a graphite notched shaft. A playful arithmetic-inspired object, no words or equation plaque.',
  'register-file': 'A tiny open graphite cabinet of four narrow coloured memory drawers, one extended with a glowing cyan data crystal. Detailed playful hardware illustration, not a file icon on a square.',
  'clock-tree': 'A branching clock-distribution tree formed from copper stems and small blue oscillator crystals, with a single warm central timing jewel. A sculptural electronic tree, no digits or labels.',
  'probe-needle': 'Three graceful precision metallic probe needles on a small articulated copper holder, their fine tips pointing downward at slightly different angles. A detailed test-bench instrument silhouette.',
  'wafer-map': 'A thin softly iridescent wafer with tiny distinct coloured die cells, a few warm amber highlights and a notched edge. A generic test-result pattern that is attractive but contains no real measurements or numbers.',
  'sweep-curve': 'A sweeping glassy cyan curve rising from three tiny copper measurement pins, with soft faceted data points along its path. An elegant three-dimensional scientific flourish, no chart axes or backing card.',
  'signal-eye': 'An open eye-shaped weave of translucent cyan and violet signal strands, with a warm bright open centre and carefully layered crossings. A luminous dimensional signal-eye interpretation, not a literal human eye.',
  'test-socket': 'An open precision test socket with a raised hinged graphite lid, copper contact fingers and a tiny violet chip resting inside. The lid and handle give it an interesting asymmetric silhouette.',
  'scope-pulse': 'A small vintage-inspired oscilloscope with a rounded ivory case, tactile copper knobs and a single clean aqua pulse on its dark screen. Detailed illustrated object, no brand lettering.',
  'loopback-link': 'A short thick braided silver loopback cable with two distinct copper connectors pointing toward one another, one tiny amber light and a gently curved loop. No badge, no text.',
  'boundary-scan': 'An open square chain of tiny graphite test cells connected by copper traces, with one cyan probe touching an exposed corner. Sculptural test circuitry rather than a flat grid on a plate.',
  'self-test-loop': 'A graceful teal circuit loop wraps around a small graphite chip, with three gold node beads and a subtle arrow-shaped connector completing the path. Real materials and an open silhouette.',
  'calibration-dial': 'A tactile brushed-copper calibration dial mounted in a compact off-centre ivory instrument housing, with fine unlabelled tick marks and a beautiful indigo pointer. No numeric text.',
  'golden-die': 'A small brilliant gold reference die with crisp beveled edges, delicate abstract etched traces and a few silver contact bumps. Tilted like a precious crafted technical object, no real chip design or logo.',
  'debug-duck': 'A cheerful illustrated yellow rubber duck with soft dimensional painted shading, an intelligent curious head tilt and a tiny pair of unbranded round glasses. Clear duck silhouette, not a photograph or a flat emoji.',
  'token-train': 'A playful short train made from three small distinct pearlescent token capsules on tiny copper wheels, linked by curved couplings. One leading cyan capsule has a simple friendly window, no letters.',
  'attention-lens': 'A floating oval magnifying lens in a copper-and-lavender frame focusing several small luminous dots into one sharp star point. Transparent glass depth and an airy asymmetrical silhouette.',
  'embedding-stars': 'A small original constellation of violet, pale-blue and warm-gold faceted stars joined by very fine curved filaments. Layered depth, different star sizes, no enclosing disk.',
  'gradient-trail': 'A winding stepped path of small lavender and blue polished stones gradually descends toward one warm glowing pebble. A gentle sculptural visualization of learning progress, no graph or label.',
  'inference-engine': 'A tiny friendly original AI engine with a translucent violet chamber, copper vents and a small cyan idea-crystal emerging from the top. Crafted industrial character without a face copied from any fictional robot.',
  'vector-index': 'A fan of three translucent blue glass index tabs surrounding one luminous copper search ring, with precise edges and small abstract data dots. No document icon printed on a badge.',
  'language-tile': 'Two interlocking translucent speech-bubble forms in lavender and rose with small luminous abstract dots inside. Dimensional glass forms with no readable text and no surrounding tile.',
  'merge-branch': 'Two curved copper and cyan branches rise separately then join into one graceful silver stem, with soft bead-like nodes. An elegant physical visualization of merging paths, no flat chart.',
  'passing-build': 'A tiny stack of three pastel building blocks with an original sculpted mint checkmark standing proudly on top. Tactile ceramic texture, celebratory but calm, no logo.',
  'stack-frame': 'Three thin open indigo and copper geometric frames nested at different depths, with one small luminous cube passing through them. Open dimensional structure, not a picture inside a frame.',
  'regex-knot': 'A playful intricately woven loop of rose and indigo cords, tied into a clever asymmetric knot with polished copper end caps. Textural illustration of an untangling puzzle, no symbols or letters.',
  'async-loop': 'Two soft glass loops in violet and cyan weave past one another without touching, with small gold travelling beads at different points. Airy sense of asynchronous flow, no box.',
  'recursion-shell': 'An iridescent peach-and-lavender spiral seashell with a beautiful visible inner spiral, sculpted ribbing and luminous depth. Natural spiral as a coding metaphor, painted illustration rather than a photo.',
  'foggy-bay': 'An original compact San Francisco Bay-inspired painted landscape with soft blue water, rolling coastal hills and a sweeping ribbon of low fog. Irregular natural silhouette, no rectangle or souvenir plaque.',
  'bridge-lights': 'An original warm-red suspension bridge with a gracefully curved span, two differently placed towers and tiny amber evening lights. Detailed dimensional illustration, no official seal or logo.',
  'city-tram': 'A cheerful vintage city tram in terracotta and cream, with finely painted windows, brass railings and an angled perspective. An original city-travel illustration without transit branding or route numbers.',
  'campus-path': 'A small winding footpath curves between two expressive trees and low modern glass campus buildings, illustrated with sunlight and warm copper foliage. Original compact scenic silhouette, not a photo or card.',
  'coffee-street': 'A charming original street-corner coffee cart beneath a small striped awning, with a tiny copper cup and leafy plant beside it. Rich hand-painted detail, no shop name or logo.',
  'mountain-sun': 'An original layered mountain silhouette with a warm half-sun peeking between rugged blue and lavender peaks, painted light catching the rock edges. Freeform landscape art with depth, not a circular badge.',
  'granite-dome': 'A Yosemite-inspired granite dome with expressive painted rock fissures, a few dark evergreen trees and warm afternoon light. Dimensional pictorial illustration, not a photograph, miniature souvenir, plaque or rectangular scene.',
  'redwood-grove': 'Three towering redwoods with warm deeply textured trunks, soft painterly evergreen canopies at different heights and a tiny sweep of forest ground. Natural irregular forest silhouette, not a photo cutout.',
  'desert-arch': 'An original sandstone arch with richly painted terracotta layers, a clear open hole, a little sage shrub and warm desert highlights. Sculptural landscape illustration without a backing plate.',
  'canyon-river': 'A ribbon of turquoise river curves between two warm layered canyon walls, with painterly striations and a small distant rock spire. Compact organic scenic composition, no badge.',
  'alpine-lake': 'A clear blue alpine lake nestled below two angular snow-dusted peaks and one graceful dark pine, with painterly reflections and luminous illustrated depth. No real-photo texture or card frame.',
  'pine-ridge': 'An irregular green mountain ridge with three distinct pine trees, textured trunks and small patches of golden sunlight. A crafted dimensional forest illustration, no decorative disk.',
  'coastal-trail': 'A winding sandy trail follows a rocky shoreline above a small curl of turquoise surf, with a single wind-shaped tree. Pictorial hand-painted travel artwork with an organic outline.',
  'night-sky': 'An elegant original crescent moon with painterly crater texture, three small faceted stars and one flowing indigo cloud ribbon. An open celestial silhouette rather than a night-sky picture inside a badge.',
};
export const additions = [
  { id: 'red-panda', name: 'Red Panda', group: 'Animals', accent: '#d58c68', subject: 'An original expressive red panda character with a curled striped tail and one curious raised paw. Natural proportions simplified into richly shaded painterly illustration; soft sculpted fur tufts, not real fur photography or a plush toy.' },
  { id: 'curled-cat', name: 'Curled Cat', group: 'Animals', accent: '#c09bbe', subject: 'An original contented ginger-and-cream cat curled into an asymmetric sleeping pose with a long tail around its paws. Fine painted fur shapes, expressive relaxed ears and dimensional storybook shading, not a pet photograph.' },
  { id: 'loyal-dog', name: 'Loyal Dog', group: 'Animals', accent: '#d5b18b', subject: 'An original friendly golden dog character sitting with a slight head tilt and one floppy ear. Warm painted fur, believable proportions and an expressive kind face, not a realistic camera photograph or an emoji.' },
  { id: 'bonsai-tree', name: 'Bonsai Tree', group: 'Trees & Forests', accent: '#83ae98', subject: 'An elegant bonsai with a dramatically curved textured trunk, layered dark jade foliage and a small irregular terracotta planter. Dimensional botanical illustration, no photograph, no neon green foliage.' },
  { id: 'ringed-planet', name: 'Ringed Planet', group: 'Stars & Galaxies', accent: '#b4a4dc', subject: 'A painterly fantastical ringed planet with softly sculpted amber and lavender cloud bands, broad icy rings tilted diagonally and small luminous copper accents. Expressive illustrated astronomy, not a telescope photograph.' },
  { id: 'spiral-galaxy', name: 'Spiral Galaxy', group: 'Stars & Galaxies', accent: '#a598d8', subject: 'An original sculptural spiral galaxy made from flowing violet, rose and pale-blue painted star-dust ribbons around a warm glowing core. Open swirling silhouette, no round badge and no flat starfield photograph.' },
  { id: 'filter-coffee', name: 'Filter Coffee', group: 'Local Culture', accent: '#c39267', subject: 'A traditional South Indian stainless-steel coffee tumbler sitting at an angle in its dabara saucer, with warm coffee froth and two graceful painted steam curls. Respectful detailed illustrated keepsake, no cafe branding.' },
  { id: 'tamil-kolam', name: 'Tamil Kolam', group: 'Local Culture', accent: '#d5b69a', subject: 'An original flowing Tamil kolam-inspired interlaced white rice-flour pattern with a few terracotta and marigold accents, composed as delicate dimensional strands with an open irregular silhouette. Respectful original geometry, no square floor tile or photograph.' },
  { id: 'city-auto', name: 'City Auto', group: 'Cities', accent: '#e0bc65', subject: 'An original cheerful yellow-and-black South Indian auto rickshaw in three-quarter view with hand-painted small metal details, cream seats and a little amber headlamp. No brand, registration number or text; rich illustrated character.' },
  { id: 'basketball', name: 'Basketball', group: 'Sports', accent: '#d58d57', subject: 'A vivid orange illustrated basketball with gently exaggerated sculpted grooves, tactile painted leather grain and warm dimensional lighting. A playful premium sports drawing with material depth, not a product photo; no logo, jersey number or keychain loop.' },
  { id: 'football', name: 'Football', group: 'Sports', accent: '#929cac', subject: 'An original black-and-ivory association-football ball with beautifully curved panels, stitched illustrated seams and a small flowing copper motion ribbon. Rich rendered illustration, no club crest, brand or photograph.' },
  { id: 'gridiron-ball', name: 'American Football', group: 'Sports', accent: '#b78367', subject: 'A warm brown American football with a clear elongated silhouette, carefully sculpted cream laces and rich painted leather texture, tilted diagonally. No league, team, manufacturer marks or text; not a real product photograph.' },
  { id: 'baseball-glove', name: 'Baseball Glove', group: 'Sports', accent: '#ba9367', subject: 'A richly illustrated worn tan baseball glove holding one clean ivory baseball with red stitches. Distinct fingers, lacing and dimensional soft shadows, original unbranded sporting art rather than a photograph.' },
];
const botanical = {
  sunflower: 'a richly layered golden sunflower with a dark patterned seed centre and two deep sage leaves',
  marigold: 'a round ruffled marigold bloom with dense warm orange petal layers and small dark-green leaves',
  hibiscus: 'a wide coral hibiscus with five sculpted petals and a distinct projecting golden staminal column',
  bluebell: 'a graceful curved stem carrying several hanging blue bell-shaped flowers with flared rims',
  iris: 'a violet iris with three upright standards, three curling falls and subtle golden accents',
  poppy: 'an airy red poppy with softly crinkled broad petals, a dark centre and a slender curved stem',
  orchid: 'an elegant lavender orchid spray with two distinctive five-petalled blooms and clearly shaped central lips',
  daisy: 'a cheerful ivory daisy with individually shaded slender petals and a golden textured centre',
  lavender: 'three slender lavender stems with many tiny purple florets and fine deep-sage leaves',
  cosmos: 'a rose cosmos flower with fine broad scalloped petals, a warm centre and delicate threadlike foliage',
  sakura: 'a small original cherry-blossom branch with two pale-pink five-petalled blooms and one closed bud',
  'wild-rose': 'a simple pink five-petalled wild rose with visible golden stamens and a small serrated sage leaf',
};
function realisticPrompt(subject) {
  return [
    'Create one original photographic-style CGI artwork of a recognizable physical object for a small app charm.',
    `SUBJECT: ${subject}`,
    'STYLE: believable anatomy or construction, natural material texture, restrained colours and carefully directed neutral studio lighting. Realistic rendered artwork with personality. Avoid fantasy machinery, jewel-like decoration, emoji styling, flat SVG symbols, cartoon exaggeration and repeated badge shapes.',
    'COMPOSITION: one complete compact subject centred within the middle 700 by 700 pixels of a square 1024-pixel canvas. Leave generous clear margins on every side. Keep every part fully visible and make the silhouette easy to recognize at 72 by 84 pixels. No surrounding frame, card, plaque, chain, cord, loop or hook unless explicitly requested as part of the actual object.',
    'BACKGROUND: every background pixel and every gap between parts must be perfectly flat chroma green RGB(0,255,0), hex #00FF00. No floor, cast shadow, gradient, texture, haze, green light spill or cropped part. Use deep forest green, not neon green, for any foreground foliage or circuit board.',
    'Finish with clear separated components, subtle highlights and physically believable proportions. No watermark, sponsor mark, company logo, celebrity likeness or copied character.',
  ].join('\n');
}

export async function artworkJobs(repo) {
  const builtins = JSON.parse(await readFile(join(repo, 'extension/src/builtin-charms.json'), 'utf8'));
  const extras = JSON.parse(await readFile(join(repo, 'website/extras.json'), 'utf8'));
  const refresh = JSON.parse(await readFile(join(repo, 'website/art-refresh-jobs.json'), 'utf8'));
  if (!Array.isArray(refresh) || refresh.length > 25 || refresh.some(item =>
    !/^[a-z][a-z0-9-]{0,31}$/.test(item.id) || typeof item.name !== 'string' || item.name.length > 48
    || typeof item.group !== 'string' || item.group.length > 48 || !/^#[0-9a-f]{6}$/i.test(item.accent)
    || typeof item.subject !== 'string' || item.subject.length > 2500)) throw new Error('Invalid bounded art-refresh inventory.');
  const records = [
    ...builtins.map(item => ({ ...item, key: `starter-${item.id}`, family: 'starters', subject: motifs[item.id], original: `default/${item.file}` })),
    ...extras.map(item => ({ ...item, key: `extra-${item.id}`, family: 'classics', subject: motifs[item.id], original: `extras/${item.file}` })),
    ...FLOWERS.map(item => ({ ...item, key: `flower-${item.id}`, family: 'flowers', group: 'Grown by you', description: `${item.name}, grown by you.`, subject: `An original botanical illustration of ${botanical[item.id]}. Natural flower anatomy with rich painterly detail and softly sculpted depth, not a real flower photograph.`, original: `garden/${item.id}.svg` })),
    ...additions.map(item => ({ ...item, key: `new-${item.id}`, family: 'new-worlds', description: `An original ${item.name.toLowerCase()} art-review candidate.`, original: null })),
    ...refresh.map(item => ({ ...item, key: `new-${item.id}`, family: 'new-worlds', description: `An original ${item.name.toLowerCase()} art-review candidate.`, original: null, realistic: true })),
  ];
  if (records.length !== 95 + refresh.length || records.length > 120 || new Set(records.map(item => item.key)).size !== records.length || records.some(item => !item.subject)) throw new Error('The art-review inventory is inconsistent.');
  const revisions = await readFile(join(repo, 'website/art-review-revisions.json'), 'utf8').then(JSON.parse, error => { if (error.code === 'ENOENT') return {}; throw error; });
  const jobs = records.map(item => ({ ...item, prompt: item.realistic ? realisticPrompt(item.subject) : [
    'Create one premium original digital illustration for a small hanging charm. This is an art-review candidate, not a real photograph.',
    `SUBJECT: ${item.subject}`,
    'STYLE: richly detailed pictorial artwork with photographic-style light and material depth, mixed with playful illustrated personality. Some sculpted 3D form is welcome. It must visibly feel artist-designed, not a literal photo cutout, stock photograph, flat SVG glyph, emoji, generic app icon or repeated badge template.',
    'COMPOSITION: one complete subject with a unique freeform silhouette, centred and fully visible, taking about 72 percent of the square canvas. Keep a clear margin on every side. No enclosing plaque, printed card, circle, shield, sticker outline, paper backing, captions or frame. Do not add dangling metal hardware unless it is explicitly part of the subject.',
    'BACKGROUND FOR MASKING: a perfectly flat uniform vivid chroma-key green RGB(0,255,0), hex #00FF00, across every background pixel. No background gradient, texture, checkerboard, cast shadow, ground plane, scenery, haze or green spill on the subject. Foreground foliage should be dark sage/jade, never chroma-key neon green. Keep all small holes between subject parts the same green.',
    'FINISH: clean readable shape at a small size, finely painted highlights and shadows, clear separated components, restrained pleasing colours. No typography, watermark, sponsor mark, company logo, official park badge, athlete likeness, copied character or proprietary chip floorplan.',
  ].join('\n') }));
  for (const key of Object.keys(revisions)) if (!jobs.some(job => job.key === key)) throw new Error(`Unknown artwork revision: ${key}`);
  return jobs.map(job => {
    const update = revisions[job.key];
    if (!update) return { ...job, revision: 1, variant: job.key };
    if (!Number.isInteger(update.revision) || update.revision < 2 || update.revision > 20 || typeof update.correction !== 'string' || update.correction.length > 2000) throw new Error('Invalid bounded artwork revision.');
    if (update.replacementPrompt !== undefined && (typeof update.replacementPrompt !== 'string' || update.replacementPrompt.length > 5000)) throw new Error('Invalid replacement art prompt.');
    if (update.realisticSubject !== undefined && (typeof update.realisticSubject !== 'string' || update.realisticSubject.length > 2500)) throw new Error('Invalid realistic art subject.');
    return { ...job, revision: update.revision, variant: `${job.key}-r${update.revision}`,
      prompt: update.replacementPrompt ?? (update.realisticSubject ? realisticPrompt(update.realisticSubject) : `${job.prompt}\nIMPORTANT ART-DIRECTION CORRECTION: ${update.correction}`) };
  });
}
