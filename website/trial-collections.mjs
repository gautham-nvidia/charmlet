/** The current trial's themed packs; archival collection metadata stays intact. */
export function trialCollections(legacy) {
  const original = new Map(legacy.map(collection => [collection.id, collection]));
  const pack = (id, name, changes = {}) => ({ ...original.get(id), id, name, ...changes });
  return [
    pack('coding', 'Terminal', { description: 'A sharp little terminal for your desk. The starting charm, ready when you are.', ideas: ['Terminal'] }),
    pack('live', 'Live 3D', { description: 'Cali’s wardrobe and playful gestures, Sunny’s quick expressions, Nimbus’s weather, Byte’s binary display and eleven California companions.', ideas: ['Cali', 'Sunny', 'Nimbus', 'Byte', 'California companions'] }),
    pack('stress', 'Stress Busters', { description: 'Four draggable spinners, reusable bubbles, a worry stone, soft squishies and three optional brain-puzzle boards.', ideas: ['Four spinners', 'Bubble Pop', 'Worry Stone', 'Twisty Cube', 'Sliding Tiles', 'Lights Out'] }),
    { id: 'music', name: 'Music', code: 'MUS', accent: '#d2a474', description: 'Twelve instruments and music-making tools, with natural wood, polished metal, keys, strings and controls.', ideas: ['MIDI & synth', 'Grand piano', 'Guitars & ukulele', 'Flute & sax', 'Violin & drums', 'DJ controller'] },
    { id: 'california', name: 'California', code: 'CA', accent: '#8cb8a1', description: 'Familiar California architecture and landscapes, from Painted Ladies and Palace of Fine Arts to Pebble Beach, Yosemite and the original Cupertino campus.', ideas: ['San Francisco', 'Silicon Valley', 'Pebble Beach', 'Coastal cypress', 'Granite Dome'] },
    pack('animals', 'Pets & Wildlife', { description: 'Seven dog breeds, a giant panda, a red panda and a few feline friends.', ideas: ['Golden Retriever', 'Goldendoodle', 'Husky', 'Corgi', 'Giant Panda', 'Tabby & Tuxedo'] }),
    pack('silicon', 'Tech & Lab', { description: 'Recognizable chips, computer parts and bench instruments, with a little AI company.', ideas: ['Chip & wafer', 'GPU & CPU', 'Circuit board', 'Oscilloscope', 'Multimeter'] }),
    pack('parks', 'Nature & Places', { description: 'Mountain lakes, forest trees, desert stone and familiar places for a quieter moment.', ideas: ['Alpine lake', 'Desert arch', 'Canyon river', 'Bonsai', 'Pine forest'] }),
    pack('space', 'Space & Stars', { description: 'All eight planets, the Sun and Moon, plus a little starlight from farther away.', ideas: ['Solar System', 'Nebula', 'Galaxy', 'Shooting star'] }),
    pack('zodiac', 'Zodiac'),
    pack('gemstones', 'Gemstones'),
    pack('culture', 'Culture & Traditions', { description: 'Colourful devotional figures, South Indian traditions, everyday rituals and familiar good-luck symbols.', ideas: ['Ganesha & Murugan', 'Kuthuvilakku', 'Kolam', 'Filter coffee', 'Lotus'] }),
    pack('sports', 'Sports'),
    pack('seasonal', 'Celebrations', { description: 'Diwali lamps, a Halloween lantern, Christmas favourites and other celebrations through the year. Automatic holiday choices respect your pinned favourite.', ideas: ['Diwali', 'Halloween', 'Christmas', 'Thanksgiving', 'Black Friday', 'Cyber Monday'] }),
    pack('flowers', 'Flowers'),
  ];
}
