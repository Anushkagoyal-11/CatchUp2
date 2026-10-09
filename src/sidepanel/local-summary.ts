export type SummarySource = { id: string; label: string; content: string };

const stopWords = new Set("a an and are as at be been but by can could did do for from had has have he her here him his i if in into is it its me my of on or our she so that the their them then there they this to was we were what when where which who will with would you your please thanks thank".split(" "));
const actionWords = /\b(please|need to|needs to|todo|to-do|follow up|follow-up|send|share|review|check|finish|complete|prepare|schedule|call|reply|respond|submit|update|remind|bring|book|confirm|upload|deliver)\b/i;
const decisionWords = /\b(decided|agreed|confirmed|approved|we will|let's|plan is|going ahead|final decision)\b/i;
const explicitDate = /\b(?:by|before|due|deadline|on)\s+(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(?:\/|-)\d{1,2}(?:(?:\/|-)\d{2,4})?|\d{4}-\d{2}-\d{2}|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2})\b/i;

export function makeLocalSummary(sources: SummarySource[]): string {
  const sentences = sources.flatMap((source) => (source.content.match(/[^.!?\n]+[.!?]?/g) ?? [])
    .map((text) => ({ id: source.id, label: source.label, text: text.trim() }))
    .filter((item) => item.text.length >= 18 && item.text.length <= 500));
  if (!sentences.length) return "No readable text was found in the selected messages or screenshots.";

  const frequency = new Map<string, number>();
  for (const sentence of sentences) for (const word of words(sentence.text)) frequency.set(word, (frequency.get(word) ?? 0) + 1);
  const ranked = sentences.map((sentence, index) => {
    const terms = words(sentence.text);
    const distinct = new Set(terms);
    const lexical = terms.length ? [...distinct].reduce((sum, word) => sum + Math.min(frequency.get(word) ?? 1, 4), 0) / Math.sqrt(terms.length) : 0;
    const cue = actionWords.test(sentence.text) || decisionWords.test(sentence.text) || explicitDate.test(sentence.text) ? 2 : 0;
    return { ...sentence, index, score: lexical + cue };
  });
  const unique = ranked.filter((row, index) => ranked.findIndex((other) => normalize(other.text) === normalize(row.text)) === index);
  const overview = [...unique].sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 3).sort((a, b) => a.index - b.index);
  const actions = unique.filter((item) => actionWords.test(item.text) || explicitDate.test(item.text)).slice(0, 10);
  const decisions = unique.filter((item) => decisionWords.test(item.text)).slice(0, 8);
  const format = (item: typeof sentences[number]) => `• ${item.text}\n  Source: ${item.label} (${item.id})`;

  return [
    "LOCAL SUMMARY — generated on this device; verify against the source",
    "",
    "OVERVIEW",
    ...overview.map((item) => format(item)),
    "",
    "POSSIBLE ACTION ITEMS",
    ...(actions.length ? actions.map((item) => `${format(item)}${explicitDate.test(item.text) ? " · explicit date/deadline wording detected" : " · action wording detected"}`) : ["No clear action wording detected."]),
    "",
    "POSSIBLE DECISIONS",
    ...(decisions.length ? decisions.map(format) : ["No clear decision wording detected."]),
    "",
    "NOTE",
    "This extractive summary uses local text matching. It may miss context and does not infer an owner or deadline.",
  ].join("\n");
}

function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9']{3,}/g) ?? []).filter((word) => !stopWords.has(word));
}

function normalize(text: string): string { return text.toLowerCase().replace(/\s+/g, " ").trim(); }
