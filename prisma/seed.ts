import { writeFileSync } from "node:fs";
import { db } from "../lib/db";
import { randomPassword } from "../lib/format";
import { buildTeams, generatePlaceholderQuestions, TeamInput } from "../lib/setup";

const FIRST = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Isha", "Arjun", "Anaya", "Vihaan", "Saanvi", "Aditya", "Kiara", "Reyansh", "Myra", "Ishaan"];
const LAST = ["Sharma", "Patel", "Iyer", "Reddy", "Nair", "Gupta", "Khan", "Das", "Menon", "Joshi"];
const TEAM_NAMES = [
  "Black Pearl", "Sea Wolves", "Gold Diggers", "Map Makers", "Storm Chasers", "Iron Anchors", "Night Owls", "Red Compass",
  "Coral Kings", "Silver Sails", "Jade Hunters", "Lost Lanterns", "Deep Divers", "Sky Pirates", "Ruby Raiders", "Tide Turners",
  "Rogue Wave", "Brass Keys", "Shadow Fleet", "Sun Seekers", "Code Breakers", "Wild Cards", "Skull Island", "Mystic Crew",
  "Treasure Trove", "Hidden Cove", "North Star", "Thunder Bay", "Dune Riders", "Final Clue",
];

async function main() {
  const teams: TeamInput[] = TEAM_NAMES.map((name, i) => ({
    code: `TEAM${String(i + 1).padStart(2, "0")}`,
    name,
    password: randomPassword(),
    members: [0, 1, 2].map((j) => ({
      name: `${FIRST[(i * 3 + j) % FIRST.length]} ${LAST[(i + j * 3) % LAST.length]}`,
      rollNo: `21CS${String(i * 3 + j + 101)}`,
      phone: `98${String(76543210 + i * 3 + j).padStart(8, "0")}`,
    })),
  }));

  teams[0].password = "demo123"; // fixed password for quick testing

  await db.setting.deleteMany();
  await db.qrCode.deleteMany(); // fresh QR tokens on every seed
  await buildTeams(teams);
  const n = await generatePlaceholderQuestions();

  writeFileSync(
    "credentials.csv",
    "team_code,team_name,password\n" + teams.map((t) => `${t.code},${t.name},${t.password}`).join("\n") + "\n",
  );

  console.log(`Seeded ${teams.length} teams, ${n} questions. Credentials → credentials.csv (TEAM01 password: demo123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
