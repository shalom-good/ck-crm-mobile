/** The same curated rotation the CRM sign-in page uses, keyed by day of
 *  year so the start screen feels alive across visits but stays stable
 *  within a day. */
export const QUOTES = [
  { text: "Whoever saves a single life, it is as if they have saved an entire world.", source: "Talmud · Sanhedrin 4:5" },
  { text: "If I am not for myself, who will be for me? And if I am only for myself, what am I?", source: "Hillel · Pirkei Avot 1:14" },
  { text: "You are not obligated to complete the work, but neither are you free to abandon it.", source: "Rabbi Tarfon · Pirkei Avot 2:21" },
  { text: "Who is rich? The one who is content with their portion.", source: "Ben Zoma · Pirkei Avot 4:1" },
  { text: "In a place where there are no decent people, strive to be a decent person.", source: "Hillel · Pirkei Avot 2:6" },
  { text: "The day is short, the work is great, the workers are lazy, the reward is great, and the Master of the house is pressing.", source: "Rabbi Tarfon · Pirkei Avot 2:20" },
  { text: "Make for yourself a teacher, acquire for yourself a friend, and judge every person favorably.", source: "Yehoshua ben Perachya · Pirkei Avot 1:6" },
];

export function quoteForToday() {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start) / 86_400_000);
  return QUOTES[dayOfYear % QUOTES.length];
}

export const greetingWord = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};
