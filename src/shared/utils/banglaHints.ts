/**
 * Latin → Bangla name-part suggestions.
 *
 * NOT a real transliterator. Just a curated dictionary of common Bangladeshi
 * name components. Given a Latin name, produces 2–5 plausible Bangla spellings
 * so the user can click-to-add rather than typing Bangla script by hand.
 *
 * Coverage is intentionally shallow — a few hundred common name parts. Unknown
 * words are dropped from suggestions rather than romanized incorrectly.
 */

// Each Latin key maps to one or more Bangla variants. Keys are lowercase.
const PART_MAP: Record<string, string[]> = {
  // Given names (male)
  rashed: ["রাশেদ"],
  rashid: ["রাশিদ", "রশিদ"],
  ahmed: ["আহমেদ", "আহমদ"],
  ahmad: ["আহমদ", "আহমাদ"],
  mohammad: ["মোহাম্মদ", "মোহাম্মাদ", "মুহাম্মদ"],
  mohammed: ["মোহাম্মদ", "মোহাম্মেদ"],
  muhammad: ["মুহাম্মদ", "মুহাম্মাদ"],
  md: ["মো", "মোঃ", "মো."],
  abdul: ["আব্দুল", "আবদুল"],
  abul: ["আবুল"],
  rahim: ["রহিম", "রাহিম"],
  karim: ["করিম", "কারিম"],
  kabir: ["কবির"],
  hasan: ["হাসান"],
  hossain: ["হোসেন", "হুসাইন"],
  husain: ["হুসাইন", "হোসাইন"],
  hussain: ["হুসাইন", "হোসাইন"],
  mahmud: ["মাহমুদ"],
  mahmood: ["মাহমুদ"],
  masud: ["মাসুদ"],
  mahbub: ["মাহবুব"],
  mustafa: ["মোস্তফা", "মুস্তাফা"],
  mostafa: ["মোস্তফা"],
  ali: ["আলী", "আলি"],
  omar: ["ওমর", "উমর"],
  umar: ["উমর"],
  ismail: ["ইসমাইল"],
  ibrahim: ["ইব্রাহিম"],
  yousuf: ["ইউসুফ", "ইউছুফ"],
  yusuf: ["ইউসুফ"],
  shakib: ["সাকিব"],
  tamim: ["তামিম"],
  mustafiz: ["মুস্তাফিজ"],
  mashrafe: ["মাশরাফি"],
  sohel: ["সোহেল"],
  arif: ["আরিফ", "আরেফ"],
  asif: ["আসিফ"],
  akhtar: ["আখতার", "আক্তার"],
  akhter: ["আখতার", "আক্তার"],
  anwar: ["আনোয়ার"],
  aslam: ["আসলাম"],
  amin: ["আমিন", "আমীন"],
  jamil: ["জামিল"],
  jamal: ["জামাল"],
  kamal: ["কামাল"],
  faisal: ["ফয়সাল"],
  fahim: ["ফাহিম"],
  farhan: ["ফারহান"],
  fakhrul: ["ফখরুল"],
  imran: ["ইমরান"],
  irfan: ["ইরফান"],
  nazrul: ["নজরুল"],
  nasir: ["নাসির"],
  nasrin: ["নাসরিন"],
  reza: ["রেজা"],
  saiful: ["সাইফুল"],
  sayem: ["সায়েম"],
  shahriar: ["শাহরিয়ার"],
  shafiul: ["শফিউল"],
  shafiqul: ["শফিকুল"],
  shafiq: ["শফিক"],
  siraj: ["সিরাজ"],
  sohan: ["সোহান"],
  sumon: ["সুমন"],
  tanvir: ["তানভীর", "তানভির"],
  tareq: ["তারেক", "তারিক"],
  tarik: ["তারিক", "তারেক"],
  wasim: ["ওয়াসিম"],
  zahir: ["জাহির"],
  zahid: ["জাহিদ"],
  ziaur: ["জিয়াউর"],

  // Given names (female)
  ayesha: ["আয়েশা"],
  aisha: ["আয়েশা", "আইশা"],
  fatema: ["ফাতেমা"],
  fatima: ["ফাতিমা", "ফাতেমা"],
  khadija: ["খাদিজা"],
  meghna: ["মেঘনা"],
  nusrat: ["নুসরাত"],
  rehana: ["রেহানা"],
  sabina: ["সাবিনা"],
  sadia: ["সাদিয়া"],
  sanjida: ["সানজিদা"],
  shabnam: ["শবনম"],
  sharmin: ["শারমিন"],
  shirin: ["শিরিন"],
  taslima: ["তাসলিমা"],
  zaida: ["জায়দা"],
  hasina: ["হাসিনা"],
  khaleda: ["খালেদা"],

  // Surnames / family names
  khan: ["খান", "খাঁন"],
  chowdhury: ["চৌধুরী", "চৌধুরি"],
  choudhury: ["চৌধুরী"],
  rahman: ["রহমান", "রাহমান"],
  sheikh: ["শেখ", "শেইখ"],
  siddique: ["সিদ্দিক", "সিদ্দিকী"],
  siddiqui: ["সিদ্দিকী"],
  haque: ["হক", "হাক"],
  huq: ["হক"],
  islam: ["ইসলাম"],
  akbar: ["আকবর"],
  aziz: ["আজিজ"],
  bhuiyan: ["ভূঁইয়া", "ভুইয়া"],
  bhuiya: ["ভুইয়া", "ভূঁইয়া"],
  mia: ["মিয়া", "মিঞা"],
  miah: ["মিয়া"],
  ahmed_sur: ["আহমেদ"],
  hoque: ["হক"],
  roy: ["রায়", "রয়"],
  das: ["দাস"],
  ghosh: ["ঘোষ"],
  saha: ["সাহা"],
  sarkar: ["সরকার", "সরকার"],
  sen: ["সেন"],
  dey: ["দে", "দেয়"],
  paul: ["পাল", "পল"],
  dutta: ["দত্ত"],
  bose: ["বোস", "বসু"],
  chakraborty: ["চক্রবর্তী"],
  banerjee: ["বন্দ্যোপাধ্যায়", "ব্যানার্জী"],
  mukherjee: ["মুখোপাধ্যায়", "মুখার্জী"],
  chowdhary: ["চৌধুরী"],
  ullah: ["উল্লাহ", "উল্লা"],
  mollah: ["মোল্লা"],
  mia_hon: ["মিয়া"],

  // Titles / honorifics (used at start of name)
  mr: ["জনাব"],
  dr: ["ডা.", "ডক্টর"],
  prof: ["অধ্যাপক"],
};

/**
 * Generate Bangla-spelling suggestions for a Latin (English-transliterated)
 * name. Returns 0–6 candidate full-name spellings for the user to click-to-add.
 * Unknown name parts are dropped; if every part is unknown, returns [].
 */
export function suggestBanglaVariants(latin: string, cap = 6): string[] {
  const parts = latin
    .toLowerCase()
    .replace(/[.,]/g, "")
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return [];

  // Look up each part; if unknown, keep it as the Latin token so the final
  // suggestion isn't a mangled partial. But if EVERY part is unknown, we
  // return empty — no point suggesting garbage back to the user.
  let anyKnown = false;
  const perPart = parts.map((p) => {
    const opts = PART_MAP[p];
    if (opts && opts.length) {
      anyKnown = true;
      return opts;
    }
    return [p];
  });
  if (!anyKnown) return [];

  // Cartesian product, capped.
  const out: string[] = [];
  const walk = (i: number, acc: string[]) => {
    if (out.length >= cap) return;
    if (i === perPart.length) {
      const s = acc.join(" ");
      if (!out.includes(s)) out.push(s);
      return;
    }
    for (const opt of perPart[i]) {
      walk(i + 1, [...acc, opt]);
    }
  };
  walk(0, []);
  return out;
}

/** True if input has at least one Latin letter (heuristic for "needs Bangla suggestions"). */
export function isLatinName(s: string): boolean {
  return /[A-Za-z]/.test(s);
}
