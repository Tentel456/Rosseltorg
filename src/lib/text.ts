/**
 * Общие правила разбора текста для сборки индекса и для запроса.
 * Оба пути импортируют этот файл, поэтому одно и то же слово всегда
 * превращается в один и тот же ключ.
 *
 * Русские слова приводятся к основе по правилам Snowball:
 * https://snowballstem.org/algorithms/russian/stemmer.html
 */

export const MIN_TOKEN = 2;

const STOP = new Set(
  `и в во на с со по о об от до для из за к ко у а но или же ли бы не ни
   что это как при без над под про через между`.split(/\s+/),
);

const VOWEL = new Set("аеиоуыэюя");
const SIZE_MARK = new Set(["х", "x"]);

const PERFECTIVE_GERUND = [
  "ившись", "ывшись", "ивши", "ывши", "вшись",
  "ив", "ыв", "вши", "в",
];
const PERFECTIVE_AFTER_A = new Set(["вшись", "вши", "в"]);

const ADJECTIVE = [
  "ими", "ыми", "его", "ого", "ему", "ому", "ее", "ие", "ые", "ое",
  "ей", "ий", "ый", "ой", "ем", "им", "ым", "ом", "их", "ых",
  "ую", "юю", "ая", "яя", "ою", "ею",
];
const PARTICIPLE = ["ивши", "ывши", "ующ", "ем", "нн", "вш", "ющ", "щ"];
const PARTICIPLE_AFTER_A = new Set(["ем", "нн", "вш", "ющ", "щ"]);

const REFLEXIVE = ["ся", "сь"];

const VERB = [
  "ейте", "уйте", "ете", "йте", "ешь", "нно", "ила", "ыла", "ена",
  "ите", "или", "ыли", "ило", "ыло", "ено", "ует", "уют", "ены",
  "ить", "ыть", "ишь", "ла", "на", "ли", "ем", "ло", "но", "ет",
  "ют", "ны", "ть", "ей", "уй", "ил", "ыл", "им", "ым", "ен",
  "ят", "ит", "ыт", "ую", "ю", "й", "л", "н",
];
const VERB_AFTER_A = new Set([
  "ла", "на", "ете", "йте", "ли", "й", "л", "ем", "н",
  "ло", "но", "ет", "ют", "ны", "ть", "ешь", "нно",
]);

const NOUN = [
  "иями", "ями", "ами", "ией", "иям", "ием", "иях", "ями",
  "ев", "ов", "ие", "ье", "еи", "ии", "ей", "ой", "ий",
  "ям", "ем", "ам", "ом", "ах", "ях", "ию", "ью", "ия", "ья",
  "а", "е", "и", "й", "о", "у", "ы", "ь", "ю", "я",
];

const SUPERLATIVE = ["ейше", "ейш"];
const DERIVATIONAL = ["ость", "ост"];

function region(word: string) {
  let vowelAt = -1;
  for (let i = 0; i < word.length; i += 1) {
    if (VOWEL.has(word[i])) {
      vowelAt = i;
      break;
    }
  }
  const rv = vowelAt + 1;
  let r1 = word.length;
  for (let i = vowelAt + 1; i < word.length; i += 1) {
    if (!VOWEL.has(word[i])) {
      r1 = i + 1;
      break;
    }
  }
  let r2 = word.length;
  for (let i = r1; i < word.length; i += 1) {
    if (VOWEL.has(word[i])) {
      for (let j = i + 1; j < word.length; j += 1) {
        if (!VOWEL.has(word[j])) {
          r2 = j + 1;
          break;
        }
      }
      break;
    }
  }
  return { rv, r2 };
}

function cut(word: string, ending: string, min: number) {
  if (word.length - ending.length < min || !word.endsWith(ending)) return "";
  return word.slice(0, -ending.length);
}

function longest(word: string, endings: readonly string[], min: number, afterA?: Set<string>) {
  for (const ending of endings) {
    const stem = cut(word, ending, min);
    if (!stem) continue;
    if (afterA?.has(ending)) {
      const mark = stem.at(-1);
      if ((mark !== "а" && mark !== "я") || stem.length < min + 1) continue;
      return stem.slice(0, -1);
    }
    return stem;
  }
  return "";
}

/** Snowball Russian stemmer. Буква «ё» должна быть заменена на «е» заранее. */
export function stem(word: string) {
  if (word.length <= 2 || !/[а-я]/.test(word)) return word;
  // «4х95» — размер, а не слово: кириллическая «х» не должна запускать стеммер.
  if (/^\d/.test(word) && [...word].some((char) => SIZE_MARK.has(char))) return word;
  const { rv, r2 } = region(word);
  let value = word;

  const perfective = longest(value, PERFECTIVE_GERUND, rv, PERFECTIVE_AFTER_A);
  if (perfective) {
    value = perfective;
  } else {
    for (const ending of REFLEXIVE) {
      const next = cut(value, ending, rv);
      if (next) {
        value = next;
        break;
      }
    }
    const adjectival = longest(value, ADJECTIVE, rv);
    if (adjectival) {
      value = longest(adjectival, PARTICIPLE, rv, PARTICIPLE_AFTER_A) || adjectival;
    } else {
      value = longest(value, VERB, rv, VERB_AFTER_A) || longest(value, NOUN, rv) || value;
    }
  }

  value = cut(value, "и", rv) || value;
  for (const ending of DERIVATIONAL) {
    const next = cut(value, ending, r2);
    if (next) {
      value = next;
      break;
    }
  }

  if (value.endsWith("ейше")) value = value.slice(0, -4);
  else if (value.endsWith("ейш")) value = value.slice(0, -3);
  if (value.endsWith("нн")) value = value.slice(0, -1);
  else if (value.endsWith("ь")) value = value.slice(0, -1);
  return value.length >= 2 ? value : word;
}

export function normalize(text: string) {
  return text.toLowerCase().replaceAll("ё", "е");
}

/** Слова текста в порядке появления. Цифры и короткие значимые слова сохраняются. */
export function tokensOf(text: string) {
  const tokens: string[] = [];
  for (const word of normalize(text).split(/[^a-zа-я0-9]+/i)) {
    if (word.length < MIN_TOKEN || STOP.has(word)) continue;
    tokens.push(stem(word));
  }
  return tokens;
}

export type Trade = "retail" | "wholesale";

export function tradeOf(text: string): Trade | "" {
  const value = normalize(text);
  if (value.includes("рознич")) return "retail";
  if (value.includes("оптов")) return "wholesale";
  return "";
}

/** Признак розницы или опта по уже разобранному запросу. */
export function tradeOfQuery(query: string, tokens: string[]): Trade | null {
  if (normalize(query).includes("рознич")) return "retail";
  if (tokens.some((token) => token.startsWith("опт"))) return "wholesale";
  return null;
}
