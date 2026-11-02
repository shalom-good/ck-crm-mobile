/** The same curated rotation the CRM sign-in page uses, keyed by day of
 *  year so the start screen feels alive across visits but stays stable
 *  within a day. */
// Warm lines only (A-11, C-15, 2026-11-02): families in a hard month see
// this first, so nothing about laziness, being content, or being pressed.
export const QUOTES = [
  { text: "Whoever saves a single life, it is as if they have saved an entire world.", source: "Talmud · Sanhedrin 4:5" },
  { text: "If I am not for myself, who will be for me? And if I am only for myself, what am I?", source: "Hillel · Pirkei Avot 1:14" },
  { text: "You are not obligated to complete the work, but neither are you free to abandon it.", source: "Rabbi Tarfon · Pirkei Avot 2:21" },
  { text: "Do not judge your fellow until you have stood in their place.", source: "Hillel · Pirkei Avot 2:4" },
  { text: "Make for yourself a teacher, acquire for yourself a friend, and judge every person favorably.", source: "Yehoshua ben Perachya · Pirkei Avot 1:6" },
  { text: "All of Israel are responsible for one another.", source: "Talmud · Shevuot 39a" },
  { text: "A little bit of light pushes away a lot of darkness.", source: "Chassidic saying" },
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
