const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

// Hand-curated Hebrew/Greek roots for common biblical words
const BIBLICAL_ROOTS = {
  grace: { lang: 'Greek', word: 'χάρις', transliteration: 'charis', meaning: 'gift, favor, goodwill' },
  love: { lang: 'Greek', word: 'ἀγάπη', transliteration: 'agape', meaning: 'unconditional divine love' },
  faith: { lang: 'Greek', word: 'πίστις', transliteration: 'pistis', meaning: 'trust, belief, confidence' },
  peace: { lang: 'Hebrew', word: 'שָׁלוֹם', transliteration: 'shalom', meaning: 'completeness, welfare, prosperity' },
  holy: { lang: 'Hebrew', word: 'קָדוֹשׁ', transliteration: 'qadosh', meaning: 'set apart, sacred' },
  glory: { lang: 'Hebrew', word: 'כָּבוֹד', transliteration: 'kabod', meaning: 'weight, honor, splendor' },
  sin: { lang: 'Hebrew', word: 'חֵטְא', transliteration: 'chet', meaning: 'missing the mark' },
  salvation: { lang: 'Greek', word: 'σωτηρία', transliteration: 'soteria', meaning: 'deliverance, preservation' },
  righteousness: { lang: 'Greek', word: 'δικαιοσύνη', transliteration: 'dikaiosyne', meaning: 'justice, equity' },
  prayer: { lang: 'Greek', word: 'προσευχή', transliteration: 'proseuche', meaning: 'to speak toward God' },
  mercy: { lang: 'Hebrew', word: 'חֶסֶד', transliteration: 'hesed', meaning: 'steadfast love, loyalty' },
  covenant: { lang: 'Hebrew', word: 'בְּרִית', transliteration: 'berit', meaning: 'binding agreement' },
  spirit: { lang: 'Hebrew', word: 'רוּחַ', transliteration: 'ruach', meaning: 'breath, wind, spirit' },
  word: { lang: 'Greek', word: 'λόγος', transliteration: 'logos', meaning: 'word, reason, divine expression' },
  truth: { lang: 'Greek', word: 'ἀλήθεια', transliteration: 'aletheia', meaning: 'reality, what is true' },
  light: { lang: 'Greek', word: 'φῶς', transliteration: 'phos', meaning: 'light, illumination' },
  heart: { lang: 'Hebrew', word: 'לֵב', transliteration: 'lev', meaning: 'inner being, mind, will' },
  wisdom: { lang: 'Hebrew', word: 'חָכְמָה', transliteration: 'hokmah', meaning: 'skill, shrewdness, wisdom' },
  eternal: { lang: 'Greek', word: 'αἰώνιος', transliteration: 'aionios', meaning: 'agelong, everlasting' },
  kingdom: { lang: 'Greek', word: 'βασιλεία', transliteration: 'basileia', meaning: 'reign, royal power' },
};

// labs.bible.org's `passage` param only resolves real scripture
// references (e.g. "John 3:16") — it is not a keyword search API.
// Pair each curated word with real references and fetch their text.
const EXAMPLE_REFS = {
  grace: ['ephesians+2:8', 'john+1:16', 'romans+5:8'],
  love: ['1+corinthians+13:4', 'john+3:16', '1+john+4:8'],
  faith: ['hebrews+11:1', 'romans+10:17', 'james+2:17'],
  peace: ['john+14:27', 'philippians+4:7', 'isaiah+26:3'],
  holy: ['1+peter+1:16', 'leviticus+20:26', 'isaiah+6:3'],
  glory: ['romans+3:23', 'exodus+33:18', '1+corinthians+10:31'],
  sin: ['romans+3:23', 'romans+6:23', '1+john+1:9'],
  salvation: ['romans+10:9', 'acts+4:12', 'ephesians+2:8'],
  righteousness: ['matthew+6:33', '2+corinthians+5:21', 'romans+1:17'],
  prayer: ['philippians+4:6', 'matthew+6:9', 'james+5:16'],
  mercy: ['lamentations+3:22', 'titus+3:5', 'psalms+103:8'],
  covenant: ['genesis+9:13', 'jeremiah+31:33', 'hebrews+8:10'],
  spirit: ['john+4:24', 'galatians+5:22', 'romans+8:26'],
  word: ['john+1:1', 'hebrews+4:12', 'psalms+119:105'],
  truth: ['john+14:6', 'john+8:32', 'psalms+119:160'],
  light: ['john+8:12', 'matthew+5:14', '1+john+1:5'],
  heart: ['proverbs+4:23', 'jeremiah+29:13', 'matthew+22:37'],
  wisdom: ['james+1:5', 'proverbs+9:10', 'proverbs+3:13'],
  eternal: ['john+3:16', 'john+10:28', 'romans+6:23'],
  kingdom: ['matthew+6:33', 'matthew+3:2', 'luke+17:21'],
};

const RELATED_WORDS = {
  grace: ['mercy', 'forgiveness', 'salvation', 'love', 'redemption'],
  love: ['grace', 'mercy', 'faith', 'peace', 'heart'],
  faith: ['hope', 'trust', 'belief', 'righteousness', 'salvation'],
  peace: ['mercy', 'rest', 'love', 'hope', 'covenant'],
  holy: ['sin', 'righteousness', 'spirit', 'glory', 'truth'],
  glory: ['holy', 'kingdom', 'light', 'truth', 'eternal'],
  sin: ['mercy', 'grace', 'salvation', 'righteousness', 'holy'],
  salvation: ['grace', 'faith', 'mercy', 'righteousness', 'love'],
  righteousness: ['holy', 'truth', 'wisdom', 'sin', 'faith'],
  prayer: ['faith', 'spirit', 'peace', 'heart', 'wisdom'],
  mercy: ['grace', 'love', 'peace', 'forgiveness', 'covenant'],
  covenant: ['promise', 'faith', 'peace', 'mercy', 'kingdom'],
  spirit: ['holy', 'truth', 'prayer', 'light', 'heart'],
  word: ['truth', 'light', 'wisdom', 'spirit', 'faith'],
  truth: ['word', 'light', 'wisdom', 'righteousness', 'spirit'],
  light: ['truth', 'glory', 'word', 'spirit', 'eternal'],
  heart: ['love', 'spirit', 'wisdom', 'faith', 'prayer'],
  wisdom: ['truth', 'heart', 'righteousness', 'word', 'spirit'],
  eternal: ['kingdom', 'glory', 'light', 'salvation', 'truth'],
  kingdom: ['eternal', 'glory', 'covenant', 'righteousness', 'holy'],
};

router.get('/word-lookup', authenticate, async (req, res) => {
  const { word } = req.query;
  if (!word) return res.status(400).json({ error: 'Word required' });

  const cleanWord = word.toLowerCase().trim().replace(/[^a-z]/g, '');
  if (!cleanWord) return res.status(400).json({ error: 'Word required' });

  try {
    let definition = null;
    try {
      const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
      if (dictRes.ok) {
        const dictData = await dictRes.json();
        definition = Array.isArray(dictData)
          ? dictData[0]?.meanings?.[0]?.definitions?.[0]?.definition
          : null;
      }
    } catch (e) {
      console.error('Dictionary lookup failed:', e.message);
    }

    const refs = EXAMPLE_REFS[cleanWord] || [];
    let bibleVerses = [];
    if (refs.length > 0) {
      try {
        const results = await Promise.all(refs.map(async (ref) => {
          const r = await fetch(`https://bible-api.com/${ref}?translation=kjv`);
          if (!r.ok) return null;
          const d = await r.json();
          if (!d.verses?.length) return null;
          const v = d.verses[0];
          return { reference: `${v.book_name} ${v.chapter}:${v.verse}`, text: v.text.trim() };
        }));
        bibleVerses = results.filter(Boolean);
      } catch (e) {
        console.error('Bible verse lookup failed:', e.message);
      }
    }

    const root = BIBLICAL_ROOTS[cleanWord] || null;
    const related = RELATED_WORDS[cleanWord] || [];

    if (!definition && !root && bibleVerses.length === 0) {
      return res.json({ word: cleanWord, error: true });
    }

    res.json({
      word: cleanWord,
      definition: definition || null,
      root,
      related,
      verses: bibleVerses.slice(0, 5),
    });
  } catch (err) {
    console.error('Word lookup error:', err);
    res.status(500).json({ error: 'Lookup failed' });
  }
});

module.exports = router;
