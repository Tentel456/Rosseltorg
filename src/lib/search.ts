import indexData from "@/data/supplier-index.json";

export type SupplierStatus = "proven" | "review" | "risk";
export type Trade = "retail" | "wholesale";

export type SupplierCard = {
  inn: string;
  kpp: string;
  lots: number;
  wins: number;
  winRate: number;
  score: number;
  status: SupplierStatus;
  customers: number;
  channels: string[];
  trade: Trade[];
  codes: string[];
  snippets: string[];
};

export type SearchHit = SupplierCard & {
  snippet: string;
};

type IndexFile = {
  builtAt: string;
  suppliers: number;
  cards: SupplierCard[];
  index: Record<string, number[]>;
};

const data = indexData as IndexFile;

const STOP = new Set(
  `и в во на с со по о об от до для из за к ко у а но или же ли бы не ни
   что это как при без над под про через между`.split(/\s+/)
);

const SUFFIXES = [
  "иями", "ями", "ами", "ого", "ему", "ому", "ыми", "ими",
  "ая", "яя", "ое", "ее", "ые", "ие", "ой", "ий", "ый", "ою", "ею", "ую", "юю",
  "ам", "ям", "ах", "ях", "ов", "ев", "ом", "ем", "ым", "им",
  "а", "я", "ы", "и", "е", "у", "ю", "о",
];

export function stem(word: string) {
  if (word.length <= 4) return word;
  for (const suffix of SUFFIXES) {
    if (word.length - suffix.length >= 4 && word.endsWith(suffix)) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

function normalize(text: string) {
  return text.toLowerCase().replaceAll("ё", "е");
}

export function queryTerms(query: string) {
  return normalize(query)
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP.has(word) && !/^\d+$/.test(word))
    .map(stem);
}

function tradeOf(query: string): Trade | null {
  const value = normalize(query);
  if (value.includes("розниц") || value.includes("розничн")) return "retail";
  if (value.includes("опт")) return "wholesale";
  return null;
}

function snippetFor(card: SupplierCard, terms: string[]) {
  const snippets = card.snippets.length ? card.snippets : ["Участие в закупках Росэлторг"];
  const match = snippets.find((snippet) => {
    const stems = new Set(
      normalize(snippet)
        .replace(/[^a-zа-я0-9]+/gi, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 3)
        .map(stem)
    );
    return terms.some((term) => stems.has(term));
  });
  return match ?? snippets[0];
}

export function searchSuppliers(query: string, limit = 20): SearchHit[] {
  const terms = [...new Set(queryTerms(query))];
  if (!terms.length) return [];

  const trade = tradeOf(query);
  const hits = new Map<number, number>();
  for (const term of terms) {
    for (const id of data.index[term] ?? []) {
      hits.set(id, (hits.get(id) ?? 0) + 1);
    }
  }

  return [...hits.entries()]
    .map(([id, matched]) => ({ card: data.cards[id], matched }))
    .filter(({ card, matched }) => card && matched === terms.length && (!trade || card.trade.includes(trade)))
    .sort((a, b) => b.card.score - a.card.score || b.card.wins - a.card.wins)
    .slice(0, limit)
    .map(({ card }) => ({ ...card, snippet: snippetFor(card, terms) }));
}

export const indexInfo = {
  builtAt: data.builtAt,
  suppliers: data.suppliers,
};
