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
    {
      id: 'canaan', name: 'Canaan', color: '#C4A35A',
      // West: Mediterranean coast Sidon→Gaza; East: Jordan River / Dead Sea
      coordinates: [
        [35.38,33.56],[35.20,33.27],[35.07,32.92],[34.95,32.61],[34.82,32.30],
        [34.75,32.06],[34.67,31.78],[34.56,31.54],[34.50,31.32],
        [34.88,31.00],[35.10,30.85],[35.20,30.95],
        [35.40,31.10],[35.55,31.50],[35.55,31.78],[35.55,31.95],
        [35.60,32.20],[35.62,32.50],[35.70,32.70],[35.80,32.95],
        [35.90,33.20],[35.70,33.45],[35.55,33.55],[35.38,33.56],
      ],
    },
    {
      id: 'egypt', name: 'Egypt', color: '#5B7A9D',
      // Nile Delta fan in north, Sinai coast east, Nile Valley south
      coordinates: [
        [29.80,31.10],[30.20,31.35],[30.60,31.50],[31.10,31.55],
        [31.50,31.45],[31.90,31.25],[32.30,31.15],[32.55,31.00],
        [32.80,30.80],[33.00,30.20],[32.70,29.10],[32.50,27.50],
        [32.20,25.50],[31.90,24.00],[31.00,23.50],[30.00,23.50],
        [29.00,24.50],[28.50,26.50],[28.60,28.00],[29.00,29.50],
        [29.30,30.20],[29.50,30.60],[29.65,30.90],[29.80,31.10],
      ],
    },
  ],
  exodus: [
    {
      id: 'egypt', name: 'Egypt', color: '#5B7A9D',
      coordinates: [
        [29.80,31.10],[30.20,31.35],[30.60,31.50],[31.10,31.55],
        [31.50,31.45],[31.90,31.25],[32.30,31.15],[32.55,31.00],
        [32.80,30.80],[33.00,30.20],[32.70,29.10],[32.50,27.50],
        [32.20,25.50],[31.90,24.00],[31.00,23.50],[30.00,23.50],
        [29.00,24.50],[28.50,26.50],[28.60,28.00],[29.00,29.50],
        [29.30,30.20],[29.50,30.60],[29.65,30.90],[29.80,31.10],
      ],
    },
    {
      id: 'sinai', name: 'Wilderness of Sinai', color: '#8B6914',
      // Triangular peninsula: Gulf of Suez (west), Gulf of Aqaba (east), Med coast (north)
      coordinates: [
        [32.55,31.00],[32.80,30.80],[33.00,30.00],[33.10,29.30],
        [33.15,28.50],[33.05,27.80],[32.70,27.20],[32.40,28.00],
        [32.20,28.80],[32.00,29.60],[31.90,30.20],[32.10,30.60],
        [32.30,31.00],[32.55,31.00],
      ],
    },
    {
      id: 'canaan', name: 'Canaan', color: '#C4A35A',
      coordinates: [
        [35.38,33.56],[35.20,33.27],[35.07,32.92],[34.95,32.61],[34.82,32.30],
        [34.75,32.06],[34.67,31.78],[34.56,31.54],[34.50,31.32],
        [34.88,31.00],[35.10,30.85],[35.20,30.95],
        [35.40,31.10],[35.55,31.50],[35.55,31.78],[35.55,31.95],
        [35.60,32.20],[35.62,32.50],[35.70,32.70],[35.80,32.95],
        [35.90,33.20],[35.70,33.45],[35.55,33.55],[35.38,33.56],
      ],
    },
  ],
  judges: [
    {
      id: 'israel_tribes', name: 'Twelve Tribes', color: '#6B4E1A',
      coordinates: [
        [35.38,33.56],[35.20,33.27],[35.07,32.92],[34.95,32.61],[34.82,32.30],
        [34.75,32.06],[34.67,31.78],[34.56,31.54],[34.50,31.32],
        [34.88,31.00],[35.10,30.85],[35.20,30.95],
        [35.55,31.10],[35.65,31.40],[35.60,31.78],[35.60,32.00],
        [35.68,32.20],[35.75,32.55],[35.85,32.80],[36.10,33.00],
        [36.30,33.20],[36.10,33.50],[35.80,33.60],[35.55,33.55],[35.38,33.56],
      ],
    },
  ],
  kingdom: [
    {
      id: 'united_kingdom', name: 'United Kingdom of Israel', color: '#4A3728',
      // Wider than twelve tribes — included Transjordan regions under David/Solomon
      coordinates: [
        [35.38,33.60],[35.10,33.35],[34.95,32.92],[34.82,32.45],[34.70,32.00],
        [34.60,31.70],[34.50,31.40],[34.45,31.10],[34.70,30.90],[35.00,30.75],
        [35.25,30.90],[35.55,31.10],[35.70,31.50],[35.65,31.85],
        [35.75,32.10],[35.90,32.40],[36.10,32.70],[36.40,32.90],
        [36.70,33.10],[36.90,32.80],[37.10,32.50],[37.00,32.00],
        [36.80,31.50],[36.60,31.00],[36.30,30.70],[36.00,30.85],
        [35.80,31.10],[35.75,31.50],[35.80,32.00],[35.90,32.50],
        [36.10,33.00],[36.00,33.40],[35.75,33.60],[35.55,33.65],[35.38,33.60],
      ],
    },
  ],
  divided: [
    {
      id: 'israel_north', name: 'Israel (Northern Kingdom)', color: '#6B8E4E',
      coordinates: [
        [35.15,33.35],[35.05,33.10],[34.95,32.80],[34.90,32.55],
        [34.88,32.25],[34.95,32.00],[35.05,31.95],
        [35.55,31.95],[35.65,32.05],[35.75,32.30],[35.80,32.55],
        [35.90,32.80],[36.10,33.05],[36.20,33.25],[36.00,33.45],
        [35.75,33.50],[35.50,33.45],[35.30,33.40],[35.15,33.35],
      ],
    },
    {
      id: 'judah_south', name: 'Judah (Southern Kingdom)', color: '#3D2B1F',
      coordinates: [
        [34.88,32.00],[34.75,31.75],[34.62,31.52],[34.50,31.30],
        [34.75,31.00],[35.00,30.80],[35.20,30.90],[35.45,31.10],
        [35.58,31.35],[35.60,31.60],[35.55,31.80],[35.55,31.95],
        [35.05,31.95],[34.95,31.90],[34.88,32.00],
      ],
    },
  ],
  exile: [
    {
      id: 'babylon_empire', name: 'Babylonian Empire', color: '#2C1810',
      // Rough outline of Neo-Babylonian Empire: Anatolia border → Persian Gulf → Sinai
      coordinates: [
        [36.20,37.10],[37.50,37.00],[38.80,36.80],[40.00,36.60],
        [41.50,36.50],[43.00,36.40],[44.50,36.20],[46.00,35.50],
        [47.50,34.50],[48.00,33.00],[47.50,31.50],[46.50,30.50],
        [45.00,29.80],[43.50,29.50],[42.00,30.00],[40.50,31.00],
        [39.00,31.80],[37.50,32.20],[36.00,33.00],[35.50,33.80],
        [35.80,35.00],[36.00,36.20],[36.20,37.10],
      ],
    },
    {
      id: 'judah_conquered', name: 'Judah (Conquered)', color: '#1A1008',
      coordinates: [
        [34.88,32.00],[34.75,31.75],[34.62,31.52],[34.50,31.30],
        [34.75,31.00],[35.00,30.80],[35.20,30.90],[35.45,31.10],
        [35.58,31.35],[35.60,31.60],[35.55,31.80],[35.55,31.95],
        [35.05,31.95],[34.95,31.90],[34.88,32.00],
      ],
    },
  ],
  jesus: [
    {
      id: 'galilee_prov', name: 'Galilee', color: '#1A3A2A',
      // From Litani River in north to Jezreel Valley in south
      coordinates: [
        [35.15,33.35],[35.05,33.10],[34.95,32.80],[34.90,32.55],
        [34.92,32.35],[35.05,32.25],[35.20,32.20],[35.40,32.22],
        [35.55,32.30],[35.70,32.45],[35.82,32.60],[35.90,32.80],
        [36.10,33.05],[36.00,33.30],[35.75,33.45],[35.50,33.45],
        [35.30,33.40],[35.15,33.35],
      ],
    },
    {
      id: 'samaria_prov', name: 'Samaria', color: '#2A4A3A',
      // Between Jezreel Valley and Jerusalem hills
      coordinates: [
        [34.92,32.35],[34.85,32.10],[34.78,31.90],[34.85,31.80],
        [35.00,31.78],[35.20,31.82],[35.40,31.90],[35.55,31.95],
        [35.65,32.05],[35.70,32.20],[35.65,32.35],[35.50,32.38],
        [35.30,32.32],[35.10,32.28],[34.92,32.35],
      ],
    },
    {
      id: 'judea_prov', name: 'Judea', color: '#1A3A2A',
      // Jerusalem highlands to Negev, Mediterranean coast to Jordan/Dead Sea
      coordinates: [
        [34.85,31.80],[34.72,31.62],[34.58,31.42],[34.48,31.22],
        [34.60,31.00],[34.80,30.80],[35.00,30.72],[35.20,30.80],
        [35.40,31.00],[35.55,31.25],[35.62,31.50],[35.60,31.70],
        [35.55,31.90],[35.40,31.90],[35.20,31.85],[35.00,31.80],
        [34.85,31.80],
      ],
    },
    {
      id: 'perea_prov', name: 'Perea', color: '#2A4A3A',
      // Transjordan strip east of Jordan River and Dead Sea
      coordinates: [
        [35.65,32.35],[35.80,32.30],[36.00,32.15],[36.20,31.90],
        [36.30,31.60],[36.20,31.30],[36.00,31.10],[35.80,31.00],
        [35.65,31.10],[35.60,31.40],[35.60,31.70],[35.65,32.00],
        [35.65,32.20],[35.65,32.35],
      ],
    },
  ],
};

export const BIBLE_FIGURES = [
  {
    id: 'abraham',
    era: 'abraham',
    name: 'Abraham',
    title: 'Father of Faith',
    hook: 'Called by God to leave his homeland',
    info: 'Abraham left Ur at God\'s command with nothing but a promise. He believed God could do the impossible — and it was counted to him as righteousness. (Gen 12:1-4)',
    reference: 'Gen 12:1',
    accessory: 'staff',
  },
  {
    id: 'moses',
    era: 'exodus',
    name: 'Moses',
    title: 'Deliverer of Israel',
    hook: 'Led Israel out of Egypt',
    info: 'Raised in Pharaoh\'s palace but called to lead his people. Moses stood before the most powerful empire on earth and said, "Let my people go." The sea opened. (Ex 14:21)',
    reference: 'Ex 3:10',
    accessory: 'staff',
  },
  {
    id: 'deborah',
    era: 'judges',
    name: 'Deborah',
    title: 'Judge & Prophetess',
    hook: 'Led Israel to victory when others would not',
    info: 'Deborah held court under a palm tree and dispensed God\'s wisdom. When the general Barak refused to march without her, she went — and Israel was delivered. (Judg 4)',
    reference: 'Judg 4:4',
    accessory: 'none',
  },
  {
    id: 'samson',
    era: 'judges',
    name: 'Samson',
    title: 'Nazirite Judge',
    hook: 'Mighty in strength, tested by weakness',
    info: 'God set Samson apart before birth. His strength was supernatural, his struggle was human. In his final act of faith he accomplished more than in all his years of battle. (Judg 16:30)',
    reference: 'Judg 16:28',
    accessory: 'none',
  },
  {
    id: 'david',
    era: 'kingdom',
    name: 'David',
    title: 'King of Israel',
    hook: 'Shepherd boy who became king',
    info: 'The youngest son, overlooked by his father, anointed by the prophet Samuel. David slew giants, wrote psalms, conquered Jerusalem, and was called a man after God\'s own heart. (1 Sam 13:14)',
    reference: '1 Sam 16:13',
    accessory: 'crown',
  },
  {
    id: 'solomon',
    era: 'kingdom',
    name: 'Solomon',
    title: 'Builder of the Temple',
    hook: 'Built the First Temple in Jerusalem',
    info: 'Given wisdom beyond any king before or after, Solomon built the Temple where God\'s glory descended like a cloud. His prayer at its dedication is one of scripture\'s most beautiful. (1 Kgs 8:27)',
    reference: '1 Kgs 6:1',
    accessory: 'crown',
  },
  {
    id: 'elijah',
    era: 'divided',
    name: 'Elijah',
    title: 'Prophet of Fire',
    hook: 'Called down fire from heaven',
    info: 'Elijah confronted 450 prophets of Baal on Mount Carmel, prayed once, and fire fell from heaven. Then he fled into the wilderness — and God met him there in a still small voice. (1 Kgs 18-19)',
    reference: '1 Kgs 18:36',
    accessory: 'none',
  },
  {
    id: 'isaiah',
    era: 'divided',
    name: 'Isaiah',
    title: 'Prophet of Hope',
    hook: 'Saw the Messiah centuries before his birth',
    info: 'Isaiah prophesied during the reigns of four kings, warning of judgment and proclaiming future redemption. He wrote of a Suffering Servant who would bear the sins of the world. (Isa 53)',
    reference: 'Isa 53:5',
    accessory: 'none',
  },
  {
    id: 'daniel',
    era: 'exile',
    name: 'Daniel',
    title: 'Faithful in Exile',
    hook: 'Stayed faithful in a foreign empire',
    info: 'Taken to Babylon as a young man, Daniel refused to compromise — in food, in prayer, in the lion\'s den. God elevated him to counsel kings while keeping him faithful to one. (Dan 6)',
    reference: 'Dan 6:10',
    accessory: 'none',
  },
  {
    id: 'ezekiel',
    era: 'exile',
    name: 'Ezekiel',
    title: 'Prophet of Visions',
    hook: 'Preached resurrection to dry bones',
    info: 'Ezekiel stood among the exiles by the Chebar River and received visions of God\'s glory, Israel\'s sin, and coming restoration. He saw a valley of dry bones breathe again. (Ezek 37)',
    reference: 'Ezek 37:4',
    accessory: 'none',
  },
  {
    id: 'jesus',
    era: 'jesus',
    name: 'Jesus',
    title: 'The Messiah',
    hook: 'The Messiah, God with us',
    info: 'The Word became flesh and dwelt among us. Jesus healed the sick, raised the dead, stilled the storm — then gave himself as the final sacrifice. Three days later, the tomb was empty. (John 1:14)',
    reference: 'John 3:16',
    accessory: 'halo',
  },
  {
    id: 'john_baptist',
    era: 'jesus',
    name: 'John',
    title: 'Voice in the Wilderness',
    hook: 'Prepared the way for Jesus',
    info: 'John the Baptist preached repentance in the desert and baptized multitudes in the Jordan. He recognised Jesus before anyone else did: "Behold, the Lamb of God." (John 1:29)',
    reference: 'Matt 3:3',
    accessory: 'none',
  },
  {
    id: 'paul',
    era: 'jesus',
    name: 'Paul',
    title: 'Apostle to the Nations',
    hook: 'Carried the gospel across the Roman world',
    info: 'Once a persecutor of the church, Paul met the risen Jesus on the road to Damascus. He planted churches from Jerusalem to Rome, and wrote nearly half the New Testament. (Acts 9)',
    reference: 'Acts 9:15',
    accessory: 'none',
  },
];

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
