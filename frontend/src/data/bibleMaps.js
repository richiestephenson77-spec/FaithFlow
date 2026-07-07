export const BIBLE_ERAS = [
  {
    id: 'abraham',
    year: '2000 BC',
    label: 'Age of Abraham',
    color: '#C4A35A',
    description: 'The time of the Patriarchs — Abraham, Isaac and Jacob',
  },
  {
    id: 'exodus',
    year: '1400 BC',
    label: 'The Exodus',
    color: '#8B6914',
    description: "Moses leads Israel out of Egypt through the wilderness",
  },
  {
    id: 'judges',
    year: '1100 BC',
    label: 'Time of Judges',
    color: '#6B4E1A',
    description: 'Israel settles Canaan under the leadership of Judges',
  },
  {
    id: 'kingdom',
    year: '1000 BC',
    label: 'United Kingdom',
    color: '#4A3728',
    description: 'Israel united under Kings Saul, David and Solomon',
  },
  {
    id: 'divided',
    year: '900 BC',
    label: 'Divided Kingdom',
    color: '#3D2B1F',
    description: 'Israel splits into Northern Kingdom and Judah',
  },
  {
    id: 'exile',
    year: '600 BC',
    label: 'Babylonian Exile',
    color: '#2C1810',
    description: 'Jerusalem falls, Israel taken captive to Babylon',
  },
  {
    id: 'jesus',
    year: '30 AD',
    label: "Jesus' Ministry",
    color: '#1A3A2A',
    description: 'The life, death and resurrection of Jesus Christ',
  },
];

// Territory outlines are approximate scholarly reconstructions for
// illustrative/devotional purposes — not precise cartography. Ancient
// political borders have no single authoritative source; these polygons
// reflect general historical consensus. Facts and approximate geography
// are not copyrightable; only specific artistic renditions are.
export const BIBLE_TERRITORIES = {
  abraham: [
    { id: 'canaan', name: 'Canaan', color: '#C4A35A', coordinates: [[34.9,33.3],[35.9,33.3],[36.0,31.9],[35.9,31.0],[34.8,31.0],[34.2,31.5],[34.3,32.5],[34.9,33.3]] },
    { id: 'egypt', name: 'Egypt', color: '#5B7A9D', coordinates: [[31.0,31.5],[32.9,31.3],[33.0,29.5],[32.5,24.0],[30.5,24.0],[29.5,29.0],[30.0,31.0],[31.0,31.5]] },
  ],
  exodus: [
    { id: 'egypt', name: 'Egypt', color: '#5B7A9D', coordinates: [[31.0,31.5],[32.9,31.3],[33.0,29.5],[32.5,24.0],[30.5,24.0],[29.5,29.0],[30.0,31.0],[31.0,31.5]] },
    { id: 'sinai', name: 'Wilderness of Sinai', color: '#8B6914', coordinates: [[32.3,31.2],[34.9,29.5],[34.0,27.7],[32.6,29.0],[32.3,31.2]] },
    { id: 'canaan', name: 'Canaan', color: '#C4A35A', coordinates: [[34.9,33.3],[35.9,33.3],[36.0,31.9],[35.9,31.0],[34.8,31.0],[34.2,31.5],[34.3,32.5],[34.9,33.3]] },
  ],
  judges: [
    { id: 'israel_tribes', name: 'Twelve Tribes', color: '#6B4E1A', coordinates: [[34.9,33.3],[36.3,33.1],[36.4,31.8],[35.9,31.0],[34.8,31.0],[34.2,31.5],[34.3,32.5],[34.9,33.3]] },
  ],
  kingdom: [
    { id: 'united_kingdom', name: 'United Kingdom of Israel', color: '#4A3728', coordinates: [[34.9,33.5],[36.4,33.3],[36.5,31.6],[35.9,30.9],[34.7,30.9],[34.2,31.5],[34.3,32.6],[34.9,33.5]] },
  ],
  divided: [
    { id: 'israel_north', name: 'Israel (Northern Kingdom)', color: '#6B8E4E', coordinates: [[34.9,33.3],[35.9,33.0],[35.7,32.0],[34.9,31.9],[34.6,32.4],[34.9,33.3]] },
    { id: 'judah_south', name: 'Judah (Southern Kingdom)', color: '#3D2B1F', coordinates: [[35.4,31.9],[35.9,31.2],[35.3,30.8],[34.6,31.0],[34.7,31.7],[35.4,31.9]] },
  ],
  exile: [
    { id: 'babylon_empire', name: 'Babylonian Empire', color: '#2C1810', coordinates: [[44.0,36.5],[48.0,33.0],[45.0,29.5],[38.0,31.0],[35.0,33.5],[36.0,36.0],[44.0,36.5]] },
    { id: 'judah_conquered', name: 'Judah (Conquered)', color: '#1A1008', coordinates: [[35.4,31.9],[35.9,31.2],[35.3,30.8],[34.6,31.0],[34.7,31.7],[35.4,31.9]] },
  ],
  jesus: [
    { id: 'galilee_prov', name: 'Galilee', color: '#1A3A2A', coordinates: [[34.9,33.3],[35.9,33.0],[35.7,32.5],[34.9,32.5],[34.9,33.3]] },
    { id: 'samaria_prov', name: 'Samaria', color: '#2A4A3A', coordinates: [[34.9,32.5],[35.6,32.5],[35.5,31.9],[34.9,31.9],[34.9,32.5]] },
    { id: 'judea_prov', name: 'Judea', color: '#1A3A2A', coordinates: [[34.9,31.9],[35.5,31.9],[35.3,31.2],[34.6,31.2],[34.7,31.7],[34.9,31.9]] },
    { id: 'perea_prov', name: 'Perea', color: '#2A4A3A', coordinates: [[35.6,32.8],[36.3,32.8],[36.0,31.5],[35.6,31.9],[35.6,32.8]] },
  ],
};

export const BIBLE_LOCATIONS = [
  {
    id: 'jerusalem',
    coordinates: [35.2137, 31.7683],
    names: {
      abraham: 'Salem',
      exodus: 'Jerusalem (Jebus)',
      judges: 'Jebus',
      kingdom: 'Jerusalem ✦',
      divided: 'Jerusalem (Judah)',
      exile: 'Fallen Jerusalem',
      jesus: 'Jerusalem ✦',
    },
    info: {
      abraham: 'Salem — City of Melchizedek, priest of God Most High (Gen 14:18)',
      exodus: 'Known as Jebus, home of the Jebusites before David',
      judges: 'Jebus — not yet conquered by Israel',
      kingdom: "Jerusalem — Capital of David's kingdom, site of Solomon's Temple",
      divided: 'Jerusalem — Capital of Judah (Southern Kingdom)',
      exile: 'Jerusalem destroyed by Nebuchadnezzar in 586 BC',
      jesus: 'Jerusalem — Where Jesus was crucified, buried and rose again',
    },
    important: true,
  },
  {
    id: 'bethlehem',
    coordinates: [35.2024, 31.7054],
    names: {
      abraham: 'Ephrath',
      exodus: 'Ephrath',
      judges: 'Bethlehem',
      kingdom: 'Bethlehem (City of David)',
      divided: 'Bethlehem',
      exile: 'Bethlehem',
      jesus: 'Bethlehem ✦ (Birth of Jesus)',
    },
    info: {
      jesus: 'Birthplace of Jesus Christ, fulfilling Micah 5:2',
      kingdom: 'City of David — where David was born and anointed king',
    },
  },
  {
    id: 'nazareth',
    coordinates: [35.2976, 32.6996],
    names: {
      abraham: null,
      exodus: null,
      judges: null,
      kingdom: 'Nazareth',
      divided: 'Nazareth',
      exile: 'Nazareth',
      jesus: 'Nazareth ✦ (Hometown of Jesus)',
    },
    info: {
      jesus: 'Where Jesus grew up. "Can anything good come from Nazareth?" (John 1:46)',
    },
  },
  {
    id: 'egypt',
    coordinates: [31.2357, 30.0444],
    names: {
      abraham: 'Egypt (Mitzraim)',
      exodus: 'Egypt ✦ (The Exodus)',
      judges: 'Egypt',
      kingdom: 'Egypt',
      divided: 'Egypt',
      exile: 'Egypt',
      jesus: 'Egypt (Flight of the Holy Family)',
    },
    info: {
      abraham: 'Abraham went to Egypt during famine (Gen 12:10)',
      exodus: "Israel enslaved here for 400 years. Moses led them out with God's mighty hand",
    },
  },
  {
    id: 'babylon',
    coordinates: [44.4215, 32.5355],
    names: {
      abraham: "Ur (Abraham's birthplace)",
      exodus: 'Babylon',
      judges: 'Babylon',
      kingdom: 'Babylon',
      divided: 'Babylon',
      exile: 'Babylon ✦ (Israel in Exile)',
      jesus: 'Babylon (Parthian Empire)',
    },
    info: {
      abraham: 'Ur of the Chaldeans — where God called Abraham to leave (Gen 12:1)',
      exile: 'Nebuchadnezzar brought Israel here in 586 BC. Daniel and Ezekiel ministered here',
    },
  },
  {
    id: 'sinai',
    coordinates: [33.9739, 28.5397],
    names: {
      abraham: 'Wilderness of Sinai',
      exodus: 'Mount Sinai ✦ (Ten Commandments)',
      judges: 'Sinai',
      kingdom: 'Sinai',
      divided: 'Sinai',
      exile: 'Sinai',
      jesus: 'Sinai Peninsula',
    },
    info: {
      exodus: 'God gave Moses the Ten Commandments here. Israel camped for a year (Ex 19-40)',
    },
  },
  {
    id: 'galilee',
    coordinates: [35.5, 32.8],
    names: {
      abraham: null,
      exodus: null,
      judges: 'Galilee',
      kingdom: 'Galilee',
      divided: 'Galilee (Northern Kingdom)',
      exile: 'Galilee',
      jesus: "Sea of Galilee ✦ (Jesus' Ministry)",
    },
    info: {
      jesus: 'Jesus performed many miracles here — walking on water, feeding 5000, calming the storm',
    },
  },
  {
    id: 'jordan',
    coordinates: [35.5498, 31.8897],
    names: {
      abraham: 'Jordan River',
      exodus: 'Jordan River ✦ (Crossing into Canaan)',
      judges: 'Jordan River',
      kingdom: 'Jordan River',
      divided: 'Jordan River',
      exile: 'Jordan River',
      jesus: 'Jordan River ✦ (Baptism of Jesus)',
    },
    info: {
      exodus: 'Israel crossed the Jordan into the Promised Land under Joshua (Josh 3)',
      jesus: 'Jesus was baptized here by John the Baptist (Matt 3:13-17)',
    },
  },
  {
    id: 'canaan',
    coordinates: [35.0, 31.5],
    names: {
      abraham: 'Canaan ✦ (Promised Land)',
      exodus: 'Canaan (Promised Land)',
      judges: 'Israel (Twelve Tribes)',
      kingdom: 'Israel ✦',
      divided: 'Judah / Israel',
      exile: 'Judah (Conquered)',
      jesus: 'Judea',
    },
    info: {
      abraham: 'God promised this land to Abraham and his descendants forever (Gen 12:7)',
      kingdom: 'United Kingdom of Israel under David and Solomon',
    },
  },
  {
    id: 'damascus',
    coordinates: [36.2765, 33.5102],
    names: {
      abraham: 'Damascus',
      exodus: 'Damascus (Aram)',
      judges: 'Damascus (Aram)',
      kingdom: 'Damascus',
      divided: 'Damascus (Syria/Aram)',
      exile: 'Damascus',
      jesus: "Damascus ✦ (Paul's Conversion nearby)",
    },
    info: {
      jesus: 'Saul of Tarsus was on his way to Damascus when Jesus appeared to him (Acts 9)',
    },
  },
];
