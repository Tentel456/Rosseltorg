/**
 * Собирает поисковый индекс поставщиков из CSV в data/.
 *
 * Память не растёт вместе с числом строк: поставщики схлопываются до одного
 * ИНН, а текст извещения или ТРУ сразу раскладывается по этим карточкам.
 * Колонки читаются по имени, поэтому новый датасет подключается повторным запуском.
 *
 * Запуск: node scripts/build-index.mjs
 */
import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const OUT_DIR = path.join(ROOT, "src", "data");

const NOTICES = path.join(DATA, "Izvesheniya.csv");
const SUPPLIERS = path.join(DATA, "Postavshiki.csv");
const TRU = ["tru_part1.csv", "tru_part2.csv", "tru_part3.csv"].map((name) => path.join(DATA, name));

const MIN_LOTS = 3;
const MIN_WIN_RATE = 0.3;
const SNIPPETS_PER_SUPPLIER = 3;
const STEMS_PER_SUPPLIER = 40;
const POSTINGS_PER_STEM = 2500;

const STOP = new Set(
  `и в во на с со по о об от до для из за к ко у а но или же ли бы не ни что это как при без над под про через между
   оказание услуги услуга услуг организация организации поставка поставки выполнение выполнения работ работа работы
   осуществление предоставление обеспечение нужд нуждам части пункта статьи федерального закона прочие прочее прочая
   прочий другие группировки год года период включая применяемые средства товар товары предмет предметы`.split(/\s+/)
);

const SUFFIXES = [
  "иями", "ями", "ами", "ого", "ему", "ому", "ыми", "ими",
  "ая", "яя", "ое", "ее", "ые", "ие", "ой", "ий", "ый", "ою", "ею", "ую", "юю",
  "ам", "ям", "ах", "ях", "ов", "ев", "ом", "ем", "ым", "им",
  "а", "я", "ы", "и", "е", "у", "ю", "о",
];

function stem(word) {
  if (word.length <= 4) return word;
  for (const suffix of SUFFIXES) {
    if (word.length - suffix.length >= 4 && word.endsWith(suffix)) return word.slice(0, -suffix.length);
  }
  return word;
}

function tokensOf(text) {
  const stems = [];
  for (const word of text.toLowerCase().replaceAll("ё", "е").split(/[^a-zа-я0-9]+/i)) {
    if (word.length < 3 || STOP.has(word) || /^\d+$/.test(word)) continue;
    stems.push(stem(word));
  }
  return stems;
}

function tradeOf(text) {
  const value = text.toLowerCase();
  if (value.includes("рознич")) return "retail";
  if (value.includes("оптов")) return "wholesale";
  return "";
}

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
    onRow(row);
    count += 1;
  }
  console.log(`  ${path.basename(file)}: ${count}`);
  return count;
}

console.log("1/4 поставщики");
const byInn = new Map();
const lotToId = new Map();
const lotSuppliers = [];
const inns = [];

await readCsv(SUPPLIERS, (row) => {
  const inn = normalizeInn(row.supplier_inn);
  const lot = (row.lot_id || "").trim();
  if (!inn || !lot) return;

  let supplier = byInn.get(inn);
  if (!supplier) {
    supplier = { id: byInn.size, kpp: row.supplier_kpp || "", lots: 0, wins: 0, customers: new Set(), channels: new Set(), trade: new Set(), codes: new Set(), stems: new Set(), snippets: [] };
    byInn.set(inn, supplier);
    inns.push(inn);
  }
  supplier.lots += 1;
  if (row.is_winner === "true") supplier.wins += 1;

  let lotId = lotToId.get(lot);
  if (lotId === undefined) {
    lotId = lotToId.size;
    lotToId.set(lot, lotId);
    lotSuppliers.push([]);
  }
  const list = lotSuppliers[lotId];
  if (list.length < 12 && !list.includes(supplier.id)) list.push(supplier.id);
});

const suppliers = [...byInn.values()].sort((a, b) => a.id - b.id);
byInn.clear();
console.log(`  уникальных ИНН: ${suppliers.length}, лотов с поставщиками: ${lotToId.size}`);

console.log("2/4 текст лотов");
function remember(lotId, text, channel, customer, code) {
  const list = lotSuppliers[lotId];
  if (!list || !text) return;
  const stems = tokensOf(text);
  const trade = tradeOf(text);
  for (const id of list) {
    const supplier = suppliers[id];
    if (channel) supplier.channels.add(channel);
    if (customer && supplier.customers.size < 400) supplier.customers.add(customer);
    if (code && supplier.codes.size < 8) supplier.codes.add(code);
    if (trade) supplier.trade.add(trade);
    if (supplier.snippets.length < SNIPPETS_PER_SUPPLIER && !supplier.snippets.includes(text)) supplier.snippets.push(text);
    if (supplier.stems.size < STEMS_PER_SUPPLIER) {
      for (const token of stems) {
        supplier.stems.add(token);
        if (supplier.stems.size >= STEMS_PER_SUPPLIER) break;
      }
    }
  }
}

function writeLot(lot, text, channel, customer) {
  const lotId = lotToId.get(lot);
  if (lotId === undefined || !text) return;
  remember(lotId, text, channel === 1 ? "АИС ГЗ" : channel === 2 ? "ЭМ" : "", customer, "");
}

await readCsv(NOTICES, (row) => {
  const channel = row.is_eshop_or_aisgz === "АИС ГЗ" ? 1 : row.is_eshop_or_aisgz === "ЭМ" ? 2 : 0;
  writeLot((row.lot_id || "").trim(), (row.procedure_name || row.subject || "").trim(), channel, (row.customer_inn || "").trim());
});

for (const file of TRU) {
  await readCsv(file, (row) => {
    const product = (row.product_name || "").trim();
    const lotId = lotToId.get((row.lot_id || "").trim());
    if (lotId === undefined || !product) return;
    remember(lotId, product, "", "", (row.okpd2_code || "").trim());
  });
}

lotSuppliers.length = 0;
lotToId.clear();

console.log("3/3 запись индекса");
const cards = suppliers.map((supplier, id) => {
  const winRate = supplier.lots ? supplier.wins / supplier.lots : 0;
  const reliable = supplier.lots >= MIN_LOTS;
  return {
    inn: inns[id],
    kpp: supplier.kpp,
    lots: supplier.lots,
    wins: supplier.wins,
    winRate: Math.round(winRate * 100),
    score: Math.round(100 * (supplier.wins + 2) / (supplier.lots + 4)),
    status: reliable && winRate >= MIN_WIN_RATE ? "proven" : reliable ? "review" : "risk",
    customers: supplier.customers.size,
    channels: [...supplier.channels],
    trade: [...supplier.trade],
    codes: [...supplier.codes],
    snippets: supplier.snippets,
  };
});

const index = {};
for (const [id, supplier] of suppliers.entries()) {
  for (const token of supplier.stems) {
    const posting = index[token] ?? (index[token] = []);
    if (posting.length < POSTINGS_PER_STEM) posting.push(id);
  }
}

await mkdir(OUT_DIR, { recursive: true });
const outFile = path.join(OUT_DIR, "supplier-index.json");
const payload = { builtAt: new Date().toISOString(), suppliers: cards.length, cards, index };
await writeFile(outFile, JSON.stringify(payload));
console.log(`готово: ${cards.length} поставщиков, ${Object.keys(index).length} слов -> ${path.relative(ROOT, outFile)}`);
