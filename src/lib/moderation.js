// src/lib/moderation.js
import leoProfanity from "leo-profanity";

// -------------------------------
// Initialize profanity filter
// -------------------------------
leoProfanity.loadDictionary(); // loads default dictionary

// Add custom single words (not always caught by default dict)
leoProfanity.add([
  "idiot",
  "stupid",
  "dumb",
  "moron",
  "loser",
  "trash",
  "worthless",
  "pathetic",
  "ugly"
]);

// -------------------------------
// Add sentence-based phrase detection
// -------------------------------
const badPhrases = [
  // Direct insults
  "you are stupid",
  "you're stupid",
  "you are dumb",
  "you're dumb",
  "you are an idiot",
  "you're an idiot",
  "you are useless",
  "you're useless",
  "you are a loser",
  "you're a loser",
  "you are worthless",
  "you're worthless",
  "you are ugly",
  "you're ugly",
  "nobody likes you",
  "everyone hates you",

  // Threats / violence
  "i will kill you",
  "you should die",
  "go kill yourself",
  "you deserve to die",
  "i hope you die",
  "i will hurt you",
  "you will pay for this",

  // Harassment / bullying
  "get lost loser",
  "you are trash",
  "you're trash",
  "you’re nothing",
  "you are nothing",
  "shut up idiot",
  "stop talking to me loser",
  "you make me sick",
  "go to hell",
  "burn in hell",
  "no one cares about you",
  "kill yourself",

  // Misc abusive tone
  "you're such a freak",
  "what a pathetic person",
  "you don't deserve friends",
  "you're so pathetic",
  "you make everyone miserable"
];

// -------------------------------
// Local-only check (fast)
// -------------------------------
export function localIsOffensive(text) {
  if (!text || !text.trim()) return false;
  const clean = String(text).toLowerCase();

  // Check word-level via leo-profanity
  if (leoProfanity.check(clean)) {
    console.log("[moderation] local blocked by dictionary:", text);
    return true;
  }

  // Check phrase-level manually
  const phraseMatch = badPhrases.some((phrase) => clean.includes(phrase));
  if (phraseMatch) {
    console.log("[moderation] local blocked by phrase:", text);
    return true;
  }

  return false;
}

// -------------------------------
// Remote Hugging Face check (optional)
// -------------------------------
export async function remoteIsOffensive(text) {
  try {
    const headers = { "Content-Type": "application/json" };

    const resp = await fetch("https://api-inference.huggingface.co/models/unitary/toxic-bert", {
      method: "POST",
      headers,
      body: JSON.stringify({ inputs: text }),
    });

    if (!resp.ok) {
      console.warn("[moderation] HF returned", resp.status, await resp.text());
      return false;
    }

    const json = await resp.json();
    const preds = json?.[0];
    if (!Array.isArray(preds)) return false;

    const offensiveLabels = ["toxic", "insult", "obscene", "threat", "hate"];
    const found = preds.find(
      (p) => offensiveLabels.includes(String(p.label).toLowerCase()) && p.score > 0.7
    );

    console.log("[moderation] HF preds:", preds, "-> offensive:", !!found);
    return !!found;
  } catch (err) {
    console.error("[moderation] remote error:", err);
    return false;
  }
}

// -------------------------------
// Main exported check
// -------------------------------
export async function isOffensive(text, { useRemote = false } = {}) {
  if (!text || !text.trim()) return false;

  // 1) Local quick check (word + phrase)
  if (localIsOffensive(text)) return true;

  // 2) Optional remote check for smarter recall
  if (useRemote) {
    return await remoteIsOffensive(text);
  }

  return false; // clean
}
