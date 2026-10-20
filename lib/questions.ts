/**
 * Arena-themed question generator.
 * Every team gets its own questions — no prompt is ever repeated across teams.
 *   Arena 1  The Mind Maze       – logic, patterns, sequences
 *   Arena 2  The Gauntlet        – rapid-fire aptitude & quick tech trivia
 *   Arena 3  The Forbidden Files – ciphers, codes, cyber-security
 *   Arena 4  The Vault           – locks, numbers, combinations
 * Slot 4 of every arena except the last is a riddle naming the next arena.
 * In a team's last arena, slots 3 and 4 are about IEEE SB VU (with a takeaway).
 */

export type GenQ = {
  prompt: string;
  kind: "text" | "mcq";
  answers: string; // "|"-separated accepted answers; for MCQ the correct option
  options?: string[];
  category?: string;
  takeaway?: string;
};

export const ARENAS = [
  { id: 1, name: "The Mind Maze", color: "#FF7A66", aliases: ["The Mind Maze", "Mind Maze", "Mindmaze", "Maze"] },
  { id: 2, name: "The Gauntlet", color: "#2EC4B6", aliases: ["The Gauntlet", "Gauntlet"] },
  { id: 3, name: "The Forbidden Files", color: "#A78BFA", aliases: ["The Forbidden Files", "Forbidden Files", "Forbidden File", "Forbidden"] },
  { id: 4, name: "The Vault", color: "#F5B700", aliases: ["The Vault", "Vault"] },
];

/* ---------------- deterministic randomness ---------------- */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rand = mulberry32(2026);
const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

const text = (prompt: string, ...answers: (string | number)[]): GenQ => ({ prompt, kind: "text", answers: answers.join("|") });
const mcq = (prompt: string, correct: string | number, distractors: (string | number)[]): GenQ => {
  const c = String(correct);
  const d = [...new Set(distractors.map(String))].filter((x) => x !== c).slice(0, 3);
  return { prompt, kind: "mcq", answers: c, options: shuffle([c, ...d]) };
};
/** Three nearby wrong numbers. */
function nearby(n: number, spread = 3): number[] {
  const out = new Set<number>();
  while (out.size < 3) {
    const v = n + (rand() < 0.5 ? -1 : 1) * int(1, spread);
    if (v !== n && v > 0) out.add(v);
  }
  return [...out];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};

/* ---------------- Arena 1: The Mind Maze ---------------- */

const ODD_GROUPS: string[][][] = [
  [
    ["Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"],
    ["Sirius", "Polaris", "Vega", "Rigel", "Betelgeuse", "Antares"],
  ],
  [
    ["Keyboard", "Mouse", "Scanner", "Microphone", "Webcam", "Joystick"],
    ["Monitor", "Printer", "Speaker", "Projector", "Headphones", "Plotter"],
  ],
  [
    ["Chrome", "Firefox", "Safari", "Edge", "Opera", "Brave"],
    ["Python", "JavaScript", "Kotlin", "TypeScript", "Haskell", "Fortran"],
  ],
  [
    ["7", "11", "13", "17", "19", "23", "29", "31"],
    ["9", "15", "21", "25", "27", "33", "35", "49"],
  ],
  [
    ["Oxygen", "Nitrogen", "Hydrogen", "Helium", "Neon", "Argon"],
    ["Copper", "Iron", "Silver", "Gold", "Zinc", "Nickel"],
  ],
];

const ANALOGIES: [string, string, string[]][] = [
  ["Keyboard is to typing as Microphone is to ___", "Speaking", ["Seeing", "Printing", "Clicking"]],
  ["Pilot is to plane as Captain is to ___", "Ship", ["Car", "Train", "Bicycle"]],
  ["Bird is to nest as Bee is to ___", "Hive", ["Den", "Burrow", "Stable"]],
  ["Hour is to minute as Minute is to ___", "Second", ["Day", "Week", "Hour"]],
  ["Book is to library as Painting is to ___", "Gallery", ["Kitchen", "Garage", "Stadium"]],
  ["Thermometer is to temperature as Barometer is to ___", "Pressure", ["Speed", "Weight", "Distance"]],
  ["Cold is to hot as Ancient is to ___", "Modern", ["Old", "Antique", "Historic"]],
  ["Doctor is to hospital as Teacher is to ___", "School", ["Court", "Bank", "Farm"]],
  ["Byte is to bit as Kilometre is to ___", "Metre", ["Mile", "Litre", "Gram"]],
  ["Lock is to key as Password is to ___", "Account", ["Monitor", "Cable", "Charger"]],
  ["Ear is to hearing as Eye is to ___", "Seeing", ["Smelling", "Tasting", "Touching"]],
  ["Seed is to tree as Egg is to ___", "Bird", ["Nest", "Shell", "Feather"]],
  ["Author is to novel as Composer is to ___", "Symphony", ["Sculpture", "Bridge", "Poem"]],
  ["Glove is to hand as Sock is to ___", "Foot", ["Head", "Neck", "Arm"]],
];

const mindMaze = {
  text: [
    () => {
      const a = int(2, 40), d = int(2, 15);
      return text(`Crack the pattern: ${a}, ${a + d}, ${a + 2 * d}, ${a + 3 * d}, ?  (number)`, a + 4 * d);
    },
    () => {
      const a = int(1, 7), r = int(2, 4);
      return text(`What comes next? ${a}, ${a * r}, ${a * r ** 2}, ${a * r ** 3}, ?  (number)`, a * r ** 4);
    },
    () => {
      const n = int(2, 12), k = int(0, 9);
      const s = [0, 1, 2, 3].map((i) => (n + i) ** 2 + k);
      return text(`Find the next number in the maze: ${s.join(", ")}, ?  (number)`, (n + 4) ** 2 + k);
    },
    () => {
      const step = int(2, 5), start = int(0, 25 - 4 * step);
      const s = [0, 1, 2, 3].map((i) => LETTERS[start + i * step]);
      return text(`Which letter continues the path? ${s.join(", ")}, ?  (one letter)`, LETTERS[start + 4 * step]);
    },
    () => {
      const k = int(2, 4), b = int(4, 18);
      return text(`Aarav is ${k} times as old as his sister. Together their ages add up to ${(k + 1) * b}. How old is his sister?  (number)`, b);
    },
    () => {
      const a = int(3, 9), b = int(3, 9);
      return text(`A grid of rooms is ${a} rooms wide and ${b} rooms long. How many rooms are in the maze?  (number)`, a * b);
    },
    () => {
      const x = int(3, 25), y = int(2, 12);
      return text(`I think of a number, add ${y} and get ${x + y}. Then I double the original number. What do I get?  (number)`, 2 * x);
    },
  ],
  mcq: [
    () => {
      const start = int(0, 6);
      let n = int(3, 60);
      if (n % 7 === 0) n += 1;
      const ans = DAYS[(start + n) % 7];
      return mcq(`Today is ${DAYS[start]}. What day will it be ${n} days from today?`, ans, sample(DAYS.filter((d) => d !== ans), 3));
    },
    () => {
      const [main, other] = shuffle(pick(ODD_GROUPS));
      const odd = pick(other);
      return mcq(`Which one does NOT belong with the others?`, odd, sample(main, 3));
    },
    () => {
      const [p, c, d] = pick(ANALOGIES);
      return mcq(p, c, d);
    },
    () => {
      const n = int(4, 9);
      return mcq(`In a straight line of ${n} people, how many are standing between the first and the last person?`, n - 2, [n - 1, n, n + 1]);
    },
  ],
};

/* ---------------- Arena 2: The Gauntlet ---------------- */

const TECH_TRIVIA: [string, string, string[]][] = [
  ["What does CPU stand for?", "Central Processing Unit", ["Computer Personal Unit", "Central Program Utility", "Core Power Unit"]],
  ["What does RAM stand for?", "Random Access Memory", ["Read Access Memory", "Rapid Action Module", "Run All Memory"]],
  ["Which key combination usually copies selected text?", "Ctrl + C", ["Ctrl + V", "Ctrl + X", "Ctrl + Z"]],
  ["Which key combination usually undoes your last action?", "Ctrl + Z", ["Ctrl + Y", "Ctrl + U", "Ctrl + A"]],
  ["What does URL stand for?", "Uniform Resource Locator", ["Universal Routing Link", "User Resource Line", "Unified Remote Locator"]],
  ["What does HTML stand for?", "HyperText Markup Language", ["High Transfer Machine Language", "HyperLink Text Mode Language", "Home Tool Markup Language"]],
  ["Which unit is the largest?", "1 Terabyte", ["1 Gigabyte", "1 Megabyte", "1 Kilobyte"]],
  ["How many bits make one byte?", "8", ["4", "16", "10"]],
  ["What does USB stand for?", "Universal Serial Bus", ["Unified System Board", "Universal Signal Bridge", "User Storage Bus"]],
  ["What does GPU stand for?", "Graphics Processing Unit", ["General Purpose Utility", "Graphical Program Unit", "Global Processing Unit"]],
  ["What does AI stand for?", "Artificial Intelligence", ["Automated Interface", "Advanced Internet", "Analog Input"]],
  ["Which of these is a version-control system?", "Git", ["Excel", "Photoshop", "Zoom"]],
  ["What does IoT stand for?", "Internet of Things", ["Input of Technology", "Integration of Tools", "Internet of Transfer"]],
  ["Which company develops the Android operating system?", "Google", ["Microsoft", "Apple", "Intel"]],
  ["What does PDF stand for?", "Portable Document Format", ["Printed Data File", "Public Document Folder", "Personal Data Format"]],
  ["What does LED stand for?", "Light Emitting Diode", ["Low Energy Display", "Laser Electric Device", "Light Energy Detector"]],
];

const gauntlet = {
  text: [
    () => {
      const p = pick([10, 20, 25, 50, 75, 5, 15, 30, 40]);
      const n = (100 / gcd(p, 100)) * int(2, 20);
      return text(`Rapid fire: what is ${p}% of ${n}?  (number)`, (p * n) / 100);
    },
    () => {
      const s = 5 * int(4, 18), t = int(2, 6);
      return text(`A runner in the Gauntlet keeps a steady ${s} km/h for ${t} hours. How many km does she cover?  (number)`, s * t);
    },
    () => {
      const n = int(2, 45);
      return text(`Quick! How many seconds are there in ${n} minutes?  (number)`, n * 60);
    },
    () => {
      const n = int(2, 30);
      return text(`Quick! How many minutes are there in ${n} hours?  (number)`, n * 60);
    },
    () => {
      const a = int(3, 15), b = int(3, 15), c = int(2, 40);
      return text(`No calculator: ${a} × ${b} + ${c} = ?  (number)`, a * b + c);
    },
    () => {
      const m = int(10, 40), x = int(2, 9);
      return text(`The average of three scores is ${m}. Two of them are ${m - x} and ${m + x}. What is the third?  (number)`, m);
    },
    () => {
      const price = 20 * int(10, 45), off = pick([10, 20, 25, 50]);
      return text(`A gadget costs ₹${price}. It's on ${off}% off. What do you pay?  (number, in ₹)`, price - (price * off) / 100);
    },
  ],
  mcq: [
    () => {
      const fr = new Map<number, string>();
      while (fr.size < 4) {
        const b = int(2, 12), a = int(1, b - 1);
        const v = a / b;
        if (![...fr.keys()].some((k) => Math.abs(k - v) < 1e-9)) fr.set(v, `${a}/${b}`);
      }
      const big = rand() < 0.5;
      const sorted = [...fr.entries()].sort((x, y) => x[0] - y[0]);
      const ans = big ? sorted[3][1] : sorted[0][1];
      return mcq(`Which fraction is the ${big ? "LARGEST" : "SMALLEST"}?`, ans, sorted.map((e) => e[1]));
    },
    () => {
      const [p, c, d] = pick(TECH_TRIVIA);
      return mcq(`Rapid fire — ${p}`, c, d);
    },
    () => {
      const a = int(12, 99), b = int(12, 99);
      return mcq(`Fastest finger: ${a} + ${b} = ?`, a + b, nearby(a + b, 11));
    },
    () => {
      const a = int(6, 19), b = int(6, 19);
      return mcq(`Fastest finger: ${a} × ${b} = ?`, a * b, nearby(a * b, 12));
    },
  ],
};
function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

/* ---------------- Arena 3: The Forbidden Files ---------------- */

const WORDS = [
  "SECRET", "CIPHER", "AGENT", "CODE", "DECODE", "HIDDEN", "KEY", "SIGNAL", "MISSION", "SHADOW", "TOKEN", "BINARY", "PIXEL", "ROUTER",
  "SERVER", "FIREWALL", "LAPTOP", "ROBOT", "SENSOR", "CIRCUIT", "VOLTAGE", "PLANET", "ROCKET", "GALAXY", "PUZZLE", "RIDDLE", "TREASURE",
  "MAP", "COMPASS", "ISLAND", "ANCHOR", "PIRATE", "GOLDEN", "CRYSTAL", "PORTAL", "MATRIX", "VECTOR", "SYSTEM", "ACCESS", "ARCHIVE", "FOLDER",
  "DIGITAL", "NETWORK", "PACKET", "BITCOIN", "CAMERA", "GADGET", "ENGINE", "MAGNET", "QUANTUM",
];
const MORSE: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--",
  N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
};
const SHORT_WORDS = ["SOS", "MAP", "KEY", "BIT", "CODE", "GOLD", "SPY", "BYTE", "DATA", "CHIP", "WIFI", "HACK", "FILE", "LOCK", "TECH", "BOT", "WEB", "APP", "NET", "RAM"];

const CYBER: [string, string, string[]][] = [
  ["An email asks you to 'verify your bank password' through a link. This is most likely…", "Phishing", ["A software update", "Two-factor login", "A firewall alert"]],
  ["Which password is the strongest?", "T!g3r#Moon_92", ["password123", "qwerty", "12345678"]],
  ["The padlock icon and 'https' in a browser mean the connection is…", "Encrypted", ["Faster", "Ad-free", "Offline"]],
  ["Malware that locks your files and demands money is called…", "Ransomware", ["Firmware", "Freeware", "Shareware"]],
  ["A one-time code sent to your phone after your password is an example of…", "Two-factor authentication", ["Phishing", "Spam", "Caching"]],
  ["What does a firewall mainly do?", "Filters network traffic", ["Cools the CPU", "Speeds up Wi-Fi", "Stores passwords"]],
  ["What does VPN stand for?", "Virtual Private Network", ["Very Private Node", "Verified Public Network", "Virtual Protected Name"]],
  ["Turning readable data into scrambled data that needs a key is called…", "Encryption", ["Compression", "Formatting", "Rendering"]],
  ["Someone watching over your shoulder to steal your PIN is doing…", "Shoulder surfing", ["Spoofing", "Sniffing", "Spamming"]],
  ["A program that looks useful but secretly harms your system is a…", "Trojan horse", ["Firewall", "Patch", "Cookie"]],
  ["The safest thing to do with an unknown USB drive found on the floor is…", "Hand it to IT/security", ["Plug it in to check", "Copy its files", "Format your laptop"]],
  ["What should you do before connecting to public Wi-Fi for banking?", "Use a VPN or avoid banking", ["Turn off antivirus", "Share your hotspot", "Disable the screen lock"]],
  ["Which of these is personal data you should never share publicly?", "Your OTP", ["Your favourite colour", "Your college name", "Your hobby"]],
  ["Fake emails pretending to be from your college admin are an example of…", "Spoofing", ["Debugging", "Caching", "Routing"]],
  ["Software updates are important mainly because they…", "Fix security holes", ["Change wallpaper", "Delete old files", "Slow down hackers' Wi-Fi"]],
];

function caesar(word: string, k: number) {
  return [...word].map((c) => LETTERS[(LETTERS.indexOf(c) + k) % 26]).join("");
}

const forbiddenFiles = {
  text: [
    () => {
      const w = pick(WORDS), k = int(1, 5);
      return text(`Classified! This word was encrypted with a Caesar cipher — every letter shifted FORWARD by ${k}: ${caesar(w, k)}\nDecrypt it.  (one word)`, w);
    },
    () => {
      const n = int(9, 127);
      return text(`A leaked file shows the binary code ${n.toString(2)}. What is it in decimal?  (number)`, n);
    },
    () => {
      const n = int(26, 255);
      return text(`Hex dump fragment: 0x${n.toString(16).toUpperCase()}. Convert it to decimal.  (number)`, n);
    },
    () => {
      const w = pick(SHORT_WORDS);
      return text(`Intercepted Morse transmission (letters separated by spaces):\n${[...w].map((c) => MORSE[c]).join("   ")}\nWhat word is it?  (one word)`, w);
    },
    () => {
      const w = pick(WORDS);
      return text(`The file name is written backwards: ${[...w].reverse().join("")}. What is the real word?  (one word)`, w);
    },
    () => {
      const i = int(0, 25);
      return text(`In ASCII, the number ${65 + i} represents which capital letter?  (one letter)`, LETTERS[i]);
    },
    () => {
      const w = pick(SHORT_WORDS);
      const nums = [...w].map((c) => LETTERS.indexOf(c) + 1);
      return text(`A = 1, B = 2 … Z = 26. Decode the file label: ${nums.join(" - ")}  (one word)`, w);
    },
  ],
  mcq: [
    () => {
      const [p, c, d] = pick(CYBER);
      return mcq(`Security briefing: ${p}`, c, d);
    },
    () => {
      const n = int(5, 63);
      const wrong = nearby(n, 6).map((x) => x.toString(2));
      return mcq(`Which binary code equals ${n} in decimal?`, n.toString(2), wrong);
    },
    () => {
      const w = pick(WORDS), k = int(1, 4);
      const wrong = [caesar(w, k + 1), caesar(w, k === 1 ? 3 : k - 1), [...caesar(w, k)].reverse().join("")];
      return mcq(`Which is "${w}" encrypted with a Caesar shift of +${k}?`, caesar(w, k), wrong);
    },
  ],
};

/* ---------------- Arena 4: The Vault ---------------- */

const VAULT_TRIVIA: [string, string, string[]][] = [
  ["A 4-digit PIN uses digits 0–9. How many different PINs are possible?", "10,000", ["9,999", "1,000", "40"]],
  ["A 3-digit lock uses digits 0–9. How many combinations does it have?", "1,000", ["999", "300", "100"]],
  ["Which of these is the hardest to brute-force?", "A 12-character mixed password", ["A 4-digit PIN", "A 6-letter word", "Your birth year"]],
  ["A 2-digit lock uses digits 0–9. How many combinations does it have?", "100", ["99", "20", "90"]],
  ["Roman numeral C stands for…", "100", ["50", "500", "1000"]],
  ["Roman numeral D stands for…", "500", ["50", "100", "1000"]],
];

const ROMAN: [number, string][] = [
  [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];
const toRoman = (n: number) => {
  let s = "";
  for (const [v, r] of ROMAN) while (n >= v) {
    s += r;
    n -= v;
  }
  return s;
};

const vault = {
  text: [
    () => {
      const n = int(11, 99);
      return text(`The vault door is engraved with ${toRoman(n)}. Enter that number.  (number)`, n);
    },
    () => {
      const n = int(10, 95);
      let p = n + 1;
      while (!isPrime(p)) p++;
      return text(`The lock opens with the first PRIME number greater than ${n}.  (number)`, p);
    },
    () => {
      const n = int(1000, 9999);
      const s = [...String(n)].reduce((a, c) => a + Number(c), 0);
      return text(`Vault code = the sum of the digits of ${n}.  (number)`, s);
    },
    () => {
      const a = int(4, 15), b = int(4, 15), c = int(1, 30);
      return text(`Combination = (${a} × ${b}) − ${c}.  (number)`, a * b - c);
    },
    () => {
      const n = int(9, 63);
      return text(`An old vault uses base-8 (octal). Its dial reads ${n.toString(8)}. What is that in decimal?  (number)`, n);
    },
    () => {
      const a = int(2, 9), b = int(2, 9);
      return text(`The first two digits of the code are ${a} and ${b}. The last digit is the last digit of their product. What is the last digit?  (number)`, (a * b) % 10);
    },
  ],
  mcq: [
    () => {
      const k = int(3, 9);
      const good = k * int(12, 111);
      const bad = new Set<number>();
      while (bad.size < 3) {
        const v = good + int(-40, 40);
        if (v > 0 && v % k !== 0) bad.add(v);
      }
      return mcq(`Only one of these vault codes is divisible by ${k}. Which?`, good, [...bad]);
    },
    () => {
      let p = int(20, 97);
      while (!isPrime(p)) p++;
      const bad = new Set<number>();
      while (bad.size < 3) {
        const v = int(20, 99);
        if (!isPrime(v) && v % 2 === 1) bad.add(v);
      }
      return mcq(`The vault accepts only a PRIME number. Which one opens it?`, p, [...bad]);
    },
    () => {
      const [p, c, d] = pick(VAULT_TRIVIA);
      return mcq(p, c, d);
    },
  ],
};

const THEMED: Record<number, { text: (() => GenQ)[]; mcq: (() => GenQ)[] }> = {
  1: mindMaze,
  2: gauntlet,
  3: forbiddenFiles,
  4: vault,
};

/* ---------------- Riddles that point to the next arena ---------------- */

const RIDDLE_CLUES: Record<number, string[]> = {
  1: [
    "Corridors loop back on themselves and every wall is a puzzle.",
    "Here logic is the only map, and every wrong turn is a dead end.",
    "Brains, not brawn, find the way out of this tangled place.",
    "Paths fork, thoughts knot — only clear thinking walks you out.",
    "A labyrinth built not of bricks but of thoughts.",
    "Lose your way here and you nearly lose your mind.",
    "Patterns hide the exit; sequences show the way.",
    "Theseus needed a thread; you will need your wits.",
  ],
  2: [
    "A run of challenges thrown at you one after another — survive them all.",
    "Speed and nerve are tested here; only the quick get through.",
    "To 'run' it is to face attack from both sides.",
    "Once, a knight threw down an armoured glove by this name to issue a challenge.",
    "Rapid fire, no rest — a trial of endurance.",
    "Every step is a test, and every test is a little faster.",
    "Challengers line up here and only the fearless finish.",
    "A medieval trial of courage, now a race against the clock.",
  ],
  3: [
    "Classified secrets locked away from prying eyes.",
    "Documents you were never meant to read.",
    "Stamped TOP SECRET and hidden in a cabinet no one may open.",
    "Ciphers guard whatever is written inside these folders.",
    "Hackers dream of opening these restricted records.",
    "Redacted lines and coded messages are waiting here.",
    "The archive no one is allowed to access — until now.",
    "Decode the text and the secrets inside are yours.",
  ],
  4: [
    "Steel doors, thick walls and a dial that clicks.",
    "Banks keep their gold here; you will need to keep your nerve.",
    "Only the right combination swings this door open.",
    "The safest room in every heist movie.",
    "Treasure sleeps here behind a twisting lock.",
    "Crack the code and the riches inside are yours.",
    "Bolted, barred and guarded by numbers.",
    "Valuables rest here behind a heavy round door.",
  ],
};

/* ---------------- IEEE SB VU (last arena, slots 3 & 4) ---------------- */

const PILLARS = ["Research support", "Patent filing support", "Startup funding support", "Tech community", "Hackathons"];
const PILLAR_TAKEAWAY: Record<string, string> = {
  "Research support":
    "IEEE SB VU mentors students from idea to published paper — with guidance on research methods, writing and getting your work into IEEE conferences.",
  "Patent filing support":
    "Got an original idea? IEEE SB VU helps you protect it — from checking prior art to preparing and filing your patent.",
  "Startup funding support":
    "IEEE SB VU helps student founders turn projects into startups — pitch practice, mentor connections and routes to startup funding.",
  "Tech community":
    "IEEE SB VU is a community of builders — workshops, talks, project teams and peers who share your passion for tech.",
  Hackathons:
    "IEEE SB VU organises hackathons where you build real solutions against the clock, learn fast and get noticed.",
};

const PILLAR_SCENARIOS: [string, string][] = [
  ["You want to publish your first research paper and need someone to guide you. Which IEEE SB VU pillar is made for this?", "Research support"],
  ["You've read 20 papers on drones and want to write your own. Where does IEEE SB VU help you?", "Research support"],
  ["Your professor says your project could become a conference paper. Which IEEE SB VU support do you need?", "Research support"],
  ["You need help with research methodology and literature review. Which IEEE SB VU pillar fits?", "Research support"],
  ["You want to present your work at an IEEE conference. Which IEEE SB VU pillar helps you get there?", "Research support"],
  ["You want your final-year project to turn into publishable research. Which pillar of IEEE SB VU helps?", "Research support"],
  ["You invented a low-cost water-quality sensor and want to legally protect it. Which IEEE SB VU support do you need?", "Patent filing support"],
  ["You want to make sure nobody can copy your original invention. Which IEEE SB VU pillar helps?", "Patent filing support"],
  ["Your team's hackathon gadget is truly new. To protect the idea, which IEEE SB VU support should you approach?", "Patent filing support"],
  ["You need help checking whether your idea already exists (prior art). Which IEEE SB VU pillar covers this?", "Patent filing support"],
  ["You want your name officially recorded as the inventor of your device. Which IEEE SB VU pillar helps?", "Patent filing support"],
  ["You designed a new algorithm-based product and want intellectual-property protection. Which IEEE SB VU support fits?", "Patent filing support"],
  ["Your app has 1,000 users and you need money to grow it into a company. Which IEEE SB VU pillar helps?", "Startup funding support"],
  ["You want to pitch your idea to investors. Which IEEE SB VU support should you approach?", "Startup funding support"],
  ["You need mentors and funding leads to launch your startup. Which IEEE SB VU pillar is for you?", "Startup funding support"],
  ["Your prototype works and you want to turn it into a real business. Which IEEE SB VU support fits?", "Startup funding support"],
  ["You need help preparing a pitch deck for a startup competition. Which IEEE SB VU pillar helps?", "Startup funding support"],
  ["You want seed money to build the first version of your product. Which IEEE SB VU support is right?", "Startup funding support"],
  ["You love tech but don't know anyone who builds projects. Which IEEE SB VU pillar connects you?", "Tech community"],
  ["You want to attend workshops, talks and meet seniors working on AI. Which IEEE SB VU pillar is this?", "Tech community"],
  ["You're looking for teammates for a robotics project. Where does IEEE SB VU help?", "Tech community"],
  ["You want to learn from peers, share ideas and grow your network. Which IEEE SB VU pillar fits?", "Tech community"],
  ["You'd like to volunteer, lead events and build leadership skills. Which IEEE SB VU pillar offers this?", "Tech community"],
  ["You want a place to discuss the latest tech trends every week. Which IEEE SB VU pillar is it?", "Tech community"],
  ["You want to build a working solution in 24 hours with your friends. What does IEEE SB VU conduct for this?", "Hackathons"],
  ["You want to test your coding skills against the clock and win prizes. Which IEEE SB VU activity is this?", "Hackathons"],
  ["You want to solve a real-world problem statement in a team, overnight. Which IEEE SB VU activity fits?", "Hackathons"],
  ["You want to prototype fast, get judged by experts and get noticed. Which IEEE SB VU activity is this?", "Hackathons"],
  ["You want to practise teamwork under pressure while building an app. Which IEEE SB VU activity helps?", "Hackathons"],
  ["You want to turn a weekend into a working demo and a certificate. Which IEEE SB VU activity is this?", "Hackathons"],
];

/** Final question of the hunt (slot 4 of the last arena): IEEE SB VU knowledge with a takeaway. */
const IEEE_FINALS: GenQ[] = [
  { kind: "mcq", prompt: "IEEE SB VU is a student branch of IEEE. What does IEEE stand for?", answers: "Institute of Electrical and Electronics Engineers", options: ["Institute of Electrical and Electronics Engineers", "International Electronics and Engineering Exchange", "Institute of Electronic Equipment Engineers", "Indian Electrical Engineering Establishment"] },
  { kind: "text", prompt: "Complete IEEE's tagline, which IEEE SB VU lives by: \"Advancing Technology for ______\"  (one word)", answers: "Humanity" },
  { kind: "mcq", prompt: "IEEE SB VU helps you publish research. IEEE's digital library of research papers is called…", answers: "IEEE Xplore", options: ["IEEE Xplore", "IEEE Explorer", "IEEE Library Pro", "IEEE Archive"] },
  { kind: "text", prompt: "Before a research paper is published, experts check it. This process is called ____ review.  (one word)", answers: "Peer" },
  { kind: "mcq", prompt: "IEEE SB VU supports patents. What does a patent protect?", answers: "An invention", options: ["An invention", "A company logo", "A song's lyrics", "A website's domain"] },
  { kind: "mcq", prompt: "Before filing a patent, you search whether your idea already exists. This existing knowledge is called…", answers: "Prior art", options: ["Prior art", "Open source", "Fine print", "Public domain"] },
  { kind: "mcq", prompt: "Patent tip from IEEE SB VU: what should you do BEFORE showing your invention publicly?", answers: "File a patent application", options: ["File a patent application", "Post it on social media", "Sell it online", "Present it at a fest"] },
  { kind: "text", prompt: "IEEE SB VU supports startups. The very first money raised to start a company is called ____ funding.  (one word)", answers: "Seed" },
  { kind: "mcq", prompt: "IEEE SB VU helps founders build an MVP. What does MVP stand for?", answers: "Minimum Viable Product", options: ["Minimum Viable Product", "Most Valuable Player", "Maximum Value Proposal", "Main Version Prototype"] },
  { kind: "mcq", prompt: "A short presentation you show investors to explain your startup is called a…", answers: "Pitch deck", options: ["Pitch deck", "Balance sheet", "Patent claim", "Code review"] },
  { kind: "mcq", prompt: "IEEE SB VU conducts hackathons. A hackathon is best described as…", answers: "A time-bound event to build solutions in teams", options: ["A time-bound event to build solutions in teams", "A cyber-attack competition", "A typing speed test", "A sports tournament"] },
  { kind: "text", prompt: "IEEEXtreme is a global IEEE programming competition that lasts how many hours?  (number)", answers: "24" },
  { kind: "mcq", prompt: "In a hackathon, the first working model of your idea is called a…", answers: "Prototype", options: ["Prototype", "Patent", "Prospectus", "Protocol"] },
  { kind: "mcq", prompt: "IEEE SB VU builds a tech community. IEEE WIE stands for…", answers: "Women in Engineering", options: ["Women in Engineering", "Workshop in Electronics", "World IEEE Event", "Wireless Internet Engineering"] },
  { kind: "mcq", prompt: "Every IEEE Student Branch, including IEEE SB VU, is guided by a faculty member called the Branch…", answers: "Counselor", options: ["Counselor", "Director", "Principal", "Sponsor"] },
  { kind: "text", prompt: "India belongs to IEEE Region number ____. (IEEE SB VU is part of it.)  (number)", answers: "10|ten|region 10" },
  { kind: "mcq", prompt: "IEEE SB VU members can join IEEE Societies. Which society focuses on computing and software?", answers: "IEEE Computer Society", options: ["IEEE Computer Society", "IEEE Power & Energy Society", "IEEE Photonics Society", "IEEE Oceanic Engineering Society"] },
  { kind: "mcq", prompt: "IEEE standards power everyday tech. IEEE 802.11 is better known as…", answers: "Wi-Fi", options: ["Wi-Fi", "Bluetooth", "USB", "HDMI"] },
  { kind: "mcq", prompt: "IEEE 802.3 is the standard for wired networking known as…", answers: "Ethernet", options: ["Ethernet", "Wi-Fi", "5G", "Zigbee"] },
  { kind: "mcq", prompt: "The IEEE 754 standard defines how computers store…", answers: "Floating-point numbers", options: ["Floating-point numbers", "Images", "Passwords", "Web pages"] },
  { kind: "mcq", prompt: "IEEE was formed in 1963 by merging the AIEE with the…", answers: "IRE", options: ["IRE", "ACM", "ISRO", "NASA"] },
  { kind: "mcq", prompt: "IEEE SIGHT, which student branches like IEEE SB VU can join, focuses on…", answers: "Technology for humanitarian causes", options: ["Technology for humanitarian causes", "Eye care research", "Sightseeing trips", "Video game design"] },
  { kind: "mcq", prompt: "IEEE's flagship magazine about technology news and ideas is…", answers: "IEEE Spectrum", options: ["IEEE Spectrum", "IEEE Times", "Tech Weekly", "IEEE Gazette"] },
  { kind: "mcq", prompt: "IEEE is known as the world's largest…", answers: "Technical professional organisation", options: ["Technical professional organisation", "Electronics manufacturer", "Software company", "University network"] },
  { kind: "text", prompt: "IEEE members, including IEEE SB VU members, follow the IEEE Code of ______.  (one word)", answers: "Ethics" },
  { kind: "mcq", prompt: "How is \"IEEE\" usually pronounced?", answers: "Eye-triple-E", options: ["Eye-triple-E", "Eee-ee-ee-ee", "I-E-E-E-E", "Ieee"] },
  { kind: "mcq", prompt: "IEEE Day celebrates the first time IEEE's founders gathered. In which month is it celebrated?", answers: "October", options: ["October", "January", "March", "July"] },
  { kind: "mcq", prompt: "Zigbee, used in smart-home devices, is built on which IEEE standard?", answers: "IEEE 802.15.4", options: ["IEEE 802.15.4", "IEEE 754", "IEEE 1394", "IEEE 802.3"] },
  { kind: "mcq", prompt: "IEEE's highest honour, awarded for exceptional contributions to technology, is the IEEE…", answers: "Medal of Honor", options: ["Medal of Honor", "Gold Cup", "Nobel Prize", "Tech Oscar"] },
  { kind: "mcq", prompt: "Which IEEE SB VU pillar helps you turn a working prototype into a funded company?", answers: "Startup funding support", options: ["Startup funding support", "Research support", "Hackathons", "Tech community"] },
  { kind: "mcq", prompt: "Who runs an IEEE Student Branch like IEEE SB VU day to day?", answers: "Student volunteers", options: ["Student volunteers", "A private company", "The government", "Only alumni"] },
];

const FINAL_TAKEAWAY =
  "IEEE SB VU is more than research — we back your patents, help fund your startup, build a tech community around you and run hackathons. Join us!";

/* ---------------- assembly ---------------- */

export function generateQuestionSet(teams: { id: number; order: number[] }[], seed = 2026) {
  rand = mulberry32(seed);
  const used = new Set<string>();
  const out: (GenQ & { teamId: number; trackId: number; slot: number })[] = [];

  function unique(make: () => GenQ): GenQ {
    for (let i = 0; i < 5000; i++) {
      const q = make();
      // Same wording with a different set of options counts as a different question.
      const key = q.prompt + "||" + [...(q.options ?? [])].sort().join("|");
      if (!used.has(key)) {
        used.add(key);
        return q;
      }
    }
    throw new Error("Ran out of unique questions");
  }
  const themed = (arena: number, kind: "text" | "mcq") => unique(() => pick(THEMED[arena][kind])());

  // Riddle clue pairs are dealt so no two teams get the same riddle.
  const riddle = (next: number) =>
    unique(() => {
      const clues = RIDDLE_CLUES[next];
      const [c1, c2] = sample(clues, 2).sort((x, y) => clues.indexOf(x) - clues.indexOf(y));
      return {
        prompt: `Riddle to your next arena:\n“${c1} ${c2}”\nName the arena.`,
        kind: "text" as const,
        answers: ARENAS.find((a) => a.id === next)!.aliases.join("|"),
        category: "riddle",
      };
    });

  const scenarios = shuffle(PILLAR_SCENARIOS);
  const finals = shuffle(IEEE_FINALS);
  if (teams.length > scenarios.length || teams.length > finals.length) throw new Error("Not enough IEEE questions for this many teams");

  teams.forEach((team, ti) => {
    team.order.forEach((trackId, stage) => {
      const last = stage === team.order.length - 1;
      const push = (slot: number, q: GenQ) => out.push({ ...q, teamId: team.id, trackId, slot });

      push(1, themed(trackId, "text"));
      push(2, themed(trackId, "mcq"));
      if (!last) {
        push(3, themed(trackId, (ti + stage) % 2 === 0 ? "text" : "mcq"));
        push(4, riddle(team.order[stage + 1]));
      } else {
        const [prompt, correct] = scenarios[ti];
        used.add(prompt);
        push(3, {
          ...mcq(prompt, correct, sample(PILLARS.filter((p) => p !== correct), 3)),
          category: "ieee",
          takeaway: PILLAR_TAKEAWAY[correct],
        });
        const f = finals[ti];
        used.add(f.prompt);
        push(4, { ...f, options: f.options ? shuffle(f.options) : undefined, category: "ieee", takeaway: FINAL_TAKEAWAY });
      }
    });
  });

  return out;
}
