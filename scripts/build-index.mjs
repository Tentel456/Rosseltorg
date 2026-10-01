/**
 * Собирает полный поисковый индекс поставщиков из CSV в data/.
 *
 * В индекс попадает каждый лот, каждый товар и каждое слово. Память при этом
 * не растёт вместе с числом строк: связи лота с поставщиками и поисковые
 * постинги пишутся во временные файлы фиксированными записями, сортируются
 * на диске и склеиваются в один supplier-index.bin.
 *
 * Формат описан в src/lib/index-format.ts. Все числа little-endian, поэтому
 * файл одинаково читается на любой архитектуре.
 *
 * Запуск: node scripts/build-index.mjs
 */
import { createReadStream } from "node:fs";
import { mkdir, open, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { CARD_SIZE, hashTerm, HEADER_SIZE, MAGIC, TERM_SIZE, VERSION } from "../src/lib/index-format.ts";
import { tokensOf, tradeOf } from "../src/lib/text.ts";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const OUT_DIR = path.join(ROOT, "src", "data");
const TMP = path.join(OUT_DIR, ".index-tmp");

const SUPPLIERS = path.join(DATA, "Postavshiki.csv");
const NOTICES = path.join(DATA, "Izvesheniya.csv");
const TRU = ["tru_part1.csv", "tru_part2.csv", "tru_part3.csv"].map((name) => path.join(DATA, name));

const MIN_LOTS = 3;
const MIN_WIN_RATE = 0.3;
const SORT_CHUNK = 750_000;

const LOTS_FILE = path.join(TMP, "lots.bin");
const POSTING_FILE = path.join(TMP, "postings.bin");
const OUT_FILE = path.join(OUT_DIR, "supplier-index.bin");

const encoder = new TextEncoder();

function normalizeInn(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/e/i.test(raw)) {
    const numeric = Number(raw.replace(",", "."));
    if (Number.isFinite(numeric)) return String(Math.round(numeric)).padStart(10, "0");
  }
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.length < 10 ? digits.padStart(10, "0") : digits;
}

function parseLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else quoted = false;
      } else current += char;
    } else if (char === '"') quoted = true;
    else if (char === ";") {
      cells.push(current);
      current = "";
    } else current += char;
  }
  cells.push(current);
  return cells;
}

async function readCsv(file, onRow) {
  const lines = readline.createInterface({
    input: createReadStream(file, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  let header = null;
  let count = 0;
  for await (const line of lines) {
    if (!line) continue;
    const cells = parseLine(line);
    if (!header) {
      header = cells.map((cell, index) => (index === 0 ? cell.replace(/^﻿/, "") : cell));
      continue;
    }
    const row = {};
    for (let i = 0; i < header.length; i += 1) row[header[i]] = cells[i] ?? "";
    await onRow(row);
    count += 1;
    if (count % 500_000 === 0) console.log(`    ${count.toLocaleString("ru-RU")}`);
  }
  console.log(`  ${path.basename(file)}: ${count.toLocaleString("ru-RU")}`);
}

function countRecords(size, recordSize) {
  return Math.floor(Number(size) / recordSize);
}

function compareU32(data, left, right, width) {
  for (let offset = 0; offset < width; offset += 4) {
    const diff = data.readUInt32LE(left + offset) - data.readUInt32LE(right + offset);
    if (diff) return diff;
  }
  return 0;
}

/** Внешняя сортировка записей фиксированной ширины: кусками в памяти, затем слияние на диске. */
async function sortFixed(file, recordSize, width) {
  const source = await open(file, "r");
  const records = countRecords((await source.stat()).size, recordSize);
  if (!records) {
    await source.close();
    return 0;
  }

  const runs = [];
  for (let position = 0, run = 0; position < records; run += 1) {
    const count = Math.min(SORT_CHUNK, records - position);
    const bytes = Buffer.allocUnsafe(count * recordSize);
    await source.read(bytes, 0, bytes.length, position * recordSize);
    const order = Array.from({ length: count }, (_, index) => index);
    order.sort((a, b) => compareU32(bytes, a * recordSize, b * recordSize, width));
    const sorted = Buffer.allocUnsafe(bytes.length);
    for (let i = 0; i < count; i += 1) {
      bytes.copy(sorted, i * recordSize, order[i] * recordSize, (order[i] + 1) * recordSize);
    }
    const runFile = `${file}.${run}`;
    const output = await open(runFile, "w");
    await output.write(sorted);
    await output.close();
    runs.push(runFile);
    position += count;
    console.log(`    кусок ${run + 1}: ${count.toLocaleString("ru-RU")}`);
  }
  await source.close();

  const inputs = [];
  for (const runFile of runs) {
    const handle = await open(runFile, "r");
    inputs.push({
      handle,
      remaining: countRecords((await handle.stat()).size, recordSize),
      record: Buffer.allocUnsafe(recordSize),
      ready: false,
    });
  }
  const readNext = async (input) => {
    if (!input.remaining) {
      input.ready = false;
      return;
    }
    await input.handle.read(input.record, 0, recordSize, null);
    input.remaining -= 1;
    input.ready = true;
  };
  await Promise.all(inputs.map(readNext));

  const sortedFile = `${file}.sorted`;
  const output = await open(sortedFile, "w");
  const batch = Buffer.allocUnsafe(recordSize * 4096);
  let filled = 0;
  let written = 0;
  while (true) {
    let best = null;
    for (const input of inputs) {
      if (input.ready && (!best || compareU32(input.record, 0, best.record, 0, width) < 0)) best = input;
    }
    if (!best) break;
    best.record.copy(batch, filled * recordSize);
    filled += 1;
    if (filled === 4096) {
      await output.write(batch);
      filled = 0;
    }
    written += 1;
    if (written % 5_000_000 === 0) console.log(`    слито ${written.toLocaleString("ru-RU")} из ${records.toLocaleString("ru-RU")}`);
    await readNext(best);
  }
  if (filled) await output.write(batch.subarray(0, filled * recordSize));
  await output.close();
  await Promise.all(inputs.map((input) => input.handle.close()));
  await Promise.all(runs.map((runFile) => rm(runFile, { force: true })));
  await rm(file, { force: true });
  await rename(sortedFile, file);
  return records;
}

class Writer {
  constructor(handle) {
    this.handle = handle;
    this.batch = Buffer.allocUnsafe(8 * 1024 * 1024);
    this.filled = 0;
  }

  async push(record) {
    const bytes = Buffer.isBuffer(record) ? record : Buffer.from(record);
    if (this.filled + bytes.length > this.batch.length) await this.flush();
    bytes.copy(this.batch, this.filled);
    this.filled += bytes.length;
  }

  async flush() {
    if (!this.filled) return;
    await this.handle.write(this.batch.subarray(0, this.filled));
    this.filled = 0;
  }
}

await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });

console.log("1/5 поставщики");
const byInn = new Map();
const lotToId = new Map();
const lotHandle = await open(LOTS_FILE, "w");
const lots = new Writer(lotHandle);
const lotRecord = Buffer.allocUnsafe(8);

await readCsv(SUPPLIERS, async (row) => {
  const inn = normalizeInn(row.supplier_inn);
  const lot = (row.lot_id || "").trim();
  if (!inn || !lot) return;

  let supplier = byInn.get(inn);
  if (!supplier) {
    supplier = { id: byInn.size, kpp: row.supplier_kpp || "", lots: 0, wins: 0, customers: new Set(), channels: 0, trade: 0 };
    byInn.set(inn, supplier);
  }
  supplier.lots += 1;
  if (row.is_winner === "true") supplier.wins += 1;

  let lotId = lotToId.get(lot);
  if (lotId === undefined) {
    lotId = lotToId.size;
    lotToId.set(lot, lotId);
  }
  lotRecord.writeUInt32LE(lotId, 0);
  lotRecord.writeUInt32LE(supplier.id, 4);
  await lots.push(lotRecord);
});
await lots.flush();
await lotHandle.close();

const suppliers = [...byInn.values()].sort((a, b) => a.id - b.id);
const inns = [...byInn.keys()];
byInn.clear();
console.log(`  уникальных ИНН: ${suppliers.length.toLocaleString("ru-RU")}, лотов: ${lotToId.size.toLocaleString("ru-RU")}`);

console.log("  сортирую связи лот-поставщик");
const lotRecords = await sortFixed(LOTS_FILE, 8, 4);

console.log("2/5 текст извещений и товары");
const postingHandle = await open(POSTING_FILE, "w");
const postings = new Writer(postingHandle);
const postingRecord = Buffer.allocUnsafe(8);
let postingCount = 0;

async function addPosting(term, cardId) {
  postingRecord.writeUInt32LE(hashTerm(term), 0);
  postingRecord.writeUInt32LE(cardId, 4);
  await postings.push(postingRecord);
  postingCount += 1;
}

const TEXT_FILE = path.join(TMP, "texts.bin");
const textHandle = await open(TEXT_FILE, "w");
const texts = new Writer(textHandle);
let textCount = 0;

/** Текст лота пишется один раз. Повторы одного лота не раздувают индекс. */
async function rememberText(lotKey, text, channel, customer) {
  const lotId = lotToId.get(lotKey);
  const clean = text.trim();
  if (lotId === undefined || !clean) return;
  const tokens = [...new Set(tokensOf(clean))];
  if (!tokens.length && !channel && !customer) return;
  const payload = {
    tokens,
    channel: channel === "АИС ГЗ" ? 1 : channel === "ЭМ" ? 2 : 0,
    trade: tradeOf(clean) === "retail" ? 1 : tradeOf(clean) === "wholesale" ? 2 : 0,
    customer,
  };
  const bytes = Buffer.from(encoder.encode(JSON.stringify(payload)));
  const packed = Buffer.allocUnsafe(8 + bytes.length);
  packed.writeUInt32LE(lotId, 0);
  packed.writeUInt32LE(bytes.length, 4);
  bytes.copy(packed, 8);
  await texts.push(packed);
  textCount += 1;
}

await readCsv(NOTICES, async (row) => {
  const channel = row.is_eshop_or_aisgz === "АИС ГЗ" || row.is_eshop_or_aisgz === "ЭМ" ? row.is_eshop_or_aisgz : "";
  await rememberText((row.lot_id || "").trim(), row.procedure_name || row.subject || "", channel, (row.customer_inn || "").trim());
});
for (const file of TRU) {
  await readCsv(file, async (row) => {
    await rememberText((row.lot_id || "").trim(), row.product_name || "", "", "");
  });
}
await texts.flush();
await textHandle.close();
console.log(`  текстов лотов: ${textCount.toLocaleString("ru-RU")}`);

console.log("  раскладываю тексты по поставщикам");
const textReader = await open(TEXT_FILE, "r");
const textHeader = Buffer.allocUnsafe(8);
let textOffset = 0;
const textEntries = [];
for (let i = 0; i < textCount; i += 1) {
  await textReader.read(textHeader, 0, 8, textOffset);
  const lotId = textHeader.readUInt32LE(0);
  const length = textHeader.readUInt32LE(4);
  textEntries.push({ lotId, offset: textOffset + 8, length });
  textOffset += 8 + length;
}
textEntries.sort((a, b) => a.lotId - b.lotId || a.offset - b.offset);

const lotReader = await open(LOTS_FILE, "r");
const lotWindow = Buffer.allocUnsafe(8);
let lotCursor = 0;
let textCursor = 0;
let current = null;

async function nextLot() {
  if (lotCursor >= lotRecords) return null;
  await lotReader.read(lotWindow, 0, 8, lotCursor * 8);
  lotCursor += 1;
  return { lotId: lotWindow.readUInt32LE(0), cardId: lotWindow.readUInt32LE(4) };
}

current = await nextLot();
while (current && textCursor < textEntries.length) {
  const entry = textEntries[textCursor];
  while (current && current.lotId < entry.lotId) current = await nextLot();
  if (!current) break;
  if (current.lotId > entry.lotId) {
    textCursor += 1;
    continue;
  }

  const payloadBytes = Buffer.allocUnsafe(entry.length);
  await textReader.read(payloadBytes, 0, entry.length, entry.offset);
  const payload = JSON.parse(payloadBytes.toString("utf8"));
  while (current && current.lotId === entry.lotId) {
    const supplier = suppliers[current.cardId];
    supplier.channels |= payload.channel;
    supplier.trade |= payload.trade;
    if (payload.customer) supplier.customers.add(payload.customer);
    for (const token of payload.tokens) await addPosting(token, current.cardId);
    current = await nextLot();
  }
  textCursor += 1;
  if (textCursor % 250_000 === 0) console.log(`    ${textCursor.toLocaleString("ru-RU")} из ${textCount.toLocaleString("ru-RU")}`);
}
await textReader.close();
await lotReader.close();
await postings.flush();
await postingHandle.close();
lotToId.clear();
console.log(`  постингов: ${postingCount.toLocaleString("ru-RU")}`);

console.log("3/5 сортировка постингов");
const sortedPostings = await sortFixed(POSTING_FILE, 8, 8);

console.log("4/5 словарь и карточки");
const sourcePostings = await open(POSTING_FILE, "r");
const seen = Buffer.allocUnsafe(8);
const terms = [];
let previousTerm = -1;
let previousCard = -1;
let runStart = 0;
let uniqueInRun = 0;
for (let i = 0; i < sortedPostings; i += 1) {
  await sourcePostings.read(seen, 0, 8, i * 8);
  const term = seen.readUInt32LE(0);
  const cardId = seen.readUInt32LE(4);
  if (term !== previousTerm) {
    if (previousTerm !== -1) terms.push({ term: previousTerm, offset: runStart, count: uniqueInRun });
    previousTerm = term;
    previousCard = cardId;
    runStart = i;
    uniqueInRun = 1;
  } else if (cardId !== previousCard) {
    previousCard = cardId;
    uniqueInRun += 1;
  }
  if (i % 5_000_000 === 0 && i) console.log(`    словарь ${i.toLocaleString("ru-RU")} из ${sortedPostings.toLocaleString("ru-RU")}`);
}
if (previousTerm !== -1) terms.push({ term: previousTerm, offset: runStart, count: uniqueInRun });

const strings = [];
let stringBytes = 0;
const addString = (text) => {
  const bytes = encoder.encode(text);
  const offset = stringBytes;
  stringBytes += bytes.length;
  strings.push(bytes);
  return { offset, length: bytes.length };
};

const cards = Buffer.alloc(suppliers.length * CARD_SIZE);
for (const supplier of suppliers) {
  const winRate = supplier.lots ? supplier.wins / supplier.lots : 0;
  const reliable = supplier.lots >= MIN_LOTS;
  const status = reliable && winRate >= MIN_WIN_RATE ? 2 : reliable ? 1 : 0;
  const inn = addString(inns[supplier.id]);
  const kpp = addString(supplier.kpp);
  const at = supplier.id * CARD_SIZE;
  cards.writeUInt32LE(inn.offset, at);
  cards.writeUInt16LE(inn.length, at + 4);
  cards.writeUInt32LE(kpp.offset, at + 6);
  cards.writeUInt16LE(kpp.length, at + 10);
  cards.writeUInt32LE(supplier.lots, at + 12);
  cards.writeUInt32LE(supplier.wins, at + 16);
  cards.writeUInt16LE(Math.round(winRate * 100), at + 20);
  cards.writeUInt16LE(Math.round((100 * (supplier.wins + 2)) / (supplier.lots + 4)), at + 22);
  cards.writeUInt8(status, at + 24);
  cards.writeUInt8(supplier.channels, at + 25);
  cards.writeUInt8(supplier.trade, at + 26);
  cards.writeUInt32LE(supplier.customers.size, at + 28);
}

console.log("5/5 сборка supplier-index.bin");
const dictionary = Buffer.alloc(terms.length * TERM_SIZE);
let compactCount = 0;
for (let i = 0; i < terms.length; i += 1) {
  const at = i * TERM_SIZE;
  dictionary.writeUInt32LE(terms[i].term, at);
  dictionary.writeUInt32LE(terms[i].count, at + 4);
  dictionary.writeUInt32LE(compactCount, at + 8);
  dictionary.writeUInt32LE(terms[i].count, at + 12);
  compactCount += terms[i].count;
}

const output = await open(OUT_FILE, "w");
const dictionaryOffset = BigInt(HEADER_SIZE);
const postingsOffset = dictionaryOffset + BigInt(dictionary.length);
const cardsOffset = postingsOffset + BigInt(compactCount * 4);
const header = Buffer.alloc(HEADER_SIZE);
header.write(MAGIC, 0, "ascii");
header.writeUInt16LE(VERSION, 4);
header.writeBigUInt64LE(BigInt(Date.now()), 8);
header.writeUInt32LE(suppliers.length, 16);
header.writeUInt32LE(terms.length, 20);
header.writeBigUInt64LE(dictionaryOffset, 24);
header.writeBigUInt64LE(postingsOffset, 32);
header.writeBigUInt64LE(cardsOffset, 40);
await output.write(header, 0, HEADER_SIZE, 0);
await output.write(dictionary, 0, dictionary.length, Number(dictionaryOffset));

const compact = Buffer.allocUnsafe(4 * 65_536);
let compactFilled = 0;
let compactOffset = Number(postingsOffset);
let previousKey = "";
for (let i = 0; i < sortedPostings; i += 1) {
  await sourcePostings.read(seen, 0, 8, i * 8);
  const key = `${seen.readUInt32LE(0)}:${seen.readUInt32LE(4)}`;
  if (key === previousKey) continue;
  previousKey = key;
  seen.copy(compact, compactFilled * 4, 4, 8);
  compactFilled += 1;
  if (compactFilled === 65_536) {
    await output.write(compact, 0, compact.length, compactOffset);
    compactOffset += compact.length;
    compactFilled = 0;
  }
}
if (compactFilled) await output.write(compact, 0, compactFilled * 4, compactOffset);
await sourcePostings.close();

await output.write(cards, 0, cards.length, Number(cardsOffset));
let stringOffset = Number(cardsOffset) + cards.length;
for (const bytes of strings) {
  await output.write(bytes, 0, bytes.length, stringOffset);
  stringOffset += bytes.length;
}
await output.close();

await rm(TMP, { recursive: true, force: true });
const result = await stat(OUT_FILE);
console.log(`готово: ${suppliers.length.toLocaleString("ru-RU")} поставщиков, ${terms.length.toLocaleString("ru-RU")} слов, ${(result.size / 1048576).toFixed(1)} МБ`);
