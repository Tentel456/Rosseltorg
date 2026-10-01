/**
 * Поиск по supplier-index.bin.
 *
 * Словарь и карточки читаются один раз. Списки поставщиков для слов запроса
 * читаются с диска по смещению, поэтому в память не попадает весь индекс.
 * Пересечение списков точное: поставщик попадает в ответ, только если у него
 * есть каждое слово запроса.
 */
import { open, stat } from "node:fs/promises";
import path from "node:path";
import {
  CARD_SIZE,
  hashTerm,
  HEADER_SIZE,
  MAGIC,
  STATUS_NAME,
  TERM_SIZE,
  type SupplierStatus,
} from "@/lib/index-format";
import { tokensOf, tradeOfQuery, type Trade } from "@/lib/text";

export type { SupplierStatus, Trade };

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
  matched: number;
  coverage: number;
};

type TermEntry = {
  count: number;
  offset: number;
};

type IndexData = {
  builtAt: string;
  suppliers: number;
  terms: number;
  dictionary: Buffer;
  cards: Buffer;
  strings: Buffer;
  postingsOffset: number;
  file: string;
};

const INDEX_FILE = path.join(process.cwd(), "src", "data", "supplier-index.bin");
const CHANNELS = ["АИС ГЗ", "ЭМ"];

let loading: Promise<IndexData> | null = null;

function loadIndex() {
  loading ??= readIndex();
  return loading;
}

async function readIndex(): Promise<IndexData> {
  const file = await open(INDEX_FILE, "r");
  try {
    const header = Buffer.alloc(HEADER_SIZE);
    await file.read(header, 0, HEADER_SIZE, 0);
    if (header.toString("ascii", 0, 4) !== MAGIC) throw new Error("supplier-index.bin повреждён");

    const suppliers = header.readUInt32LE(16);
    const terms = header.readUInt32LE(20);
    const dictionaryOffset = Number(header.readBigUInt64LE(24));
    const postingsOffset = Number(header.readBigUInt64LE(32));
    const cardsOffset = Number(header.readBigUInt64LE(40));
    const dictionary = Buffer.alloc(terms * TERM_SIZE);
    const cards = Buffer.alloc(suppliers * CARD_SIZE);
    const size = (await stat(INDEX_FILE)).size;
    const strings = Buffer.alloc(size - cardsOffset - cards.length);

    await file.read(dictionary, 0, dictionary.length, dictionaryOffset);
    await file.read(cards, 0, cards.length, cardsOffset);
    if (strings.length) await file.read(strings, 0, strings.length, cardsOffset + cards.length);

    return {
      builtAt: new Date(Number(header.readBigUInt64LE(8))).toISOString(),
      suppliers,
      terms,
      dictionary,
      cards,
      strings,
      postingsOffset,
      file: INDEX_FILE,
    };
  } finally {
    await file.close();
  }
}

function findTerm(dictionary: Buffer, hash: number): TermEntry | null {
  let low = 0;
  let high = dictionary.length / TERM_SIZE;
  while (low < high) {
    const mid = (low + high) >> 1;
    const at = mid * TERM_SIZE;
    const value = dictionary.readUInt32LE(at);
    if (value === hash) {
      return { count: dictionary.readUInt32LE(at + 4), offset: dictionary.readUInt32LE(at + 8) };
    }
    if (value < hash) low = mid + 1;
    else high = mid;
  }
  return null;
}

async function readPostings(index: IndexData, term: TermEntry) {
  const bytes = Buffer.allocUnsafe(term.count * 4);
  const file = await open(index.file, "r");
  try {
    await file.read(bytes, 0, bytes.length, index.postingsOffset + term.offset * 4);
  } finally {
    await file.close();
  }
  const ids = new Uint32Array(term.count);
  for (let i = 0; i < term.count; i += 1) ids[i] = bytes.readUInt32LE(i * 4);
  return ids;
}

function intersect(lists: Uint32Array[]) {
  const [first, ...rest] = [...lists].sort((a, b) => a.length - b.length);
  const hits: number[] = [];
  for (const id of first) {
    if (rest.every((list) => contains(list, id))) hits.push(id);
  }
  return hits;
}

function contains(list: Uint32Array, id: number) {
  let low = 0;
  let high = list.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (list[mid] === id) return true;
    if (list[mid] < id) low = mid + 1;
    else high = mid;
  }
  return false;
}

function textAt(index: IndexData, offset: number, length: number) {
  return index.strings.toString("utf8", offset, offset + length);
}

function cardAt(index: IndexData, id: number, matched = 0, requested = 0): SupplierCard {
  const at = id * CARD_SIZE;
  const { cards } = index;
  const channels = cards.readUInt8(at + 25);
  const trade = cards.readUInt8(at + 26);
  return {
    inn: textAt(index, cards.readUInt32LE(at), cards.readUInt16LE(at + 4)),
    kpp: textAt(index, cards.readUInt32LE(at + 6), cards.readUInt16LE(at + 10)),
    lots: cards.readUInt32LE(at + 12),
    wins: cards.readUInt32LE(at + 16),
    winRate: cards.readUInt16LE(at + 20),
    score: cards.readUInt16LE(at + 22),
    status: STATUS_NAME[cards.readUInt8(at + 24)] ?? "risk",
    customers: cards.readUInt32LE(at + 28),
    channels: CHANNELS.filter((_, bit) => channels & (1 << bit)),
    trade: (["retail", "wholesale"] as Trade[]).filter((_, bit) => trade & (1 << bit)),
    matched,
    coverage: requested ? matched / requested : 0,
  };
}

export async function searchSuppliers(query: string, limit = 20): Promise<SupplierCard[]> {
  const terms = [...new Set(tokensOf(query))];
  if (!terms.length) return [];

  const index = await loadIndex();
  const trade = tradeOfQuery(query, terms);
  const found = terms
    .map((term) => findTerm(index.dictionary, hashTerm(term)))
    .filter((term): term is TermEntry => term !== null);
  if (!found.length) return [];

  const lists = await Promise.all(found.map((term) => readPostings(index, term)));
  const ranked = found.length === terms.length
    ? intersect(lists).map((id) => ({ id, matched: terms.length }))
    : union(lists);

  return ranked
    .map(({ id, matched }) => cardAt(index, id, matched, terms.length))
    .filter((card) => !trade || card.trade.includes(trade))
    .sort((a, b) => b.coverage - a.coverage || b.score - a.score || b.wins - a.wins || a.inn.localeCompare(b.inn))
    .slice(0, limit);
}

/** Если совпали не все слова, поставщик ранжируется по числу совпавших слов. */
function union(lists: Uint32Array[]) {
  const counts = new Map<number, number>();
  for (const list of lists) {
    for (const id of list) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const best = Math.max(...counts.values());
  return [...counts.entries()]
    .filter(([, count]) => count === best)
    .map(([id, matched]) => ({ id, matched }));
}

export async function findSupplier(inn: string): Promise<SupplierCard | null> {
  const wanted = inn.replace(/\D/g, "");
  if (!wanted) return null;
  const index = await loadIndex();
  for (let id = 0; id < index.suppliers; id += 1) {
    const card = cardAt(index, id);
    if (card.inn === wanted) return card;
  }
  return null;
}

export async function indexInfo() {
  const index = await loadIndex();
  return { builtAt: index.builtAt, suppliers: index.suppliers, terms: index.terms };
}
