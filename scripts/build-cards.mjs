/**
 * Карточка поставщика: последние лоты и живые наименования товаров.
 *
 * Поиск остаётся в supplier-index.bin. Здесь только то, что нужно открыть
 * на странице юрлица: до 12 последних лотов и до 8 товаров с кодом ОКПД2.
 *
 * Запуск: node scripts/build-cards.mjs
 */
import { createReadStream } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const OUT_DIR = path.join(ROOT, "src", "data");
const TMP = path.join(OUT_DIR, ".cards-tmp");
const OUT_FILE = path.join(OUT_DIR, "supplier-cards.json");

const SUPPLIERS = path.join(DATA, "Postavshiki.csv");
const NOTICES = path.join(DATA, "Izvesheniya.csv");
const TRU = ["tru_part1.csv", "tru_part2.csv", "tru_part3.csv"].map((name) => path.join(DATA, name));

const LOTS_PER_SUPPLIER = 12;
const PRODUCTS_PER_SUPPLIER = 8;

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

function yearOf(value) {
  const match = String(value ?? "").match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : 0;
}

function priceOf(value) {
  const number = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
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
    if (count % 500_000 === 0) console.log(`    ${count.toLocaleString("ru-RU")}`);
  }
  console.log(`  ${path.basename(file)}: ${count.toLocaleString("ru-RU")}`);
}

await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });

console.log("1/3 извещения");
const notices = new Map();
await readCsv(NOTICES, (row) => {
  const lot = clean(row.lot_id);
  if (!lot || notices.has(lot)) return;
  notices.set(lot, {
    name: clean(row.procedure_name || row.subject).slice(0, 240),
    year: yearOf(row.publish_date),
    price: priceOf(row.start_price),
    customer: normalizeInn(row.customer_inn),
    channel: row.is_eshop_or_aisgz === "АИС ГЗ" || row.is_eshop_or_aisgz === "ЭМ" ? row.is_eshop_or_aisgz : "",
  });
});

console.log("2/3 товары");
const productsByLot = new Map();
for (const file of TRU) {
  await readCsv(file, (row) => {
    const lot = clean(row.lot_id);
    const name = clean(row.product_name).slice(0, 180);
    if (!lot || !name) return;
    let products = productsByLot.get(lot);
    if (!products) {
      products = [];
      productsByLot.set(lot, products);
    }
    if (products.length >= 4 || products.some((item) => item.name === name)) return;
    products.push({ name, okpd2: clean(row.okpd2_code) });
  });
}

console.log("3/3 поставщики");
const cards = new Map();
await readCsv(SUPPLIERS, (row) => {
  const inn = normalizeInn(row.supplier_inn);
  const lot = clean(row.lot_id);
  if (!inn || !lot) return;
  let card = cards.get(inn);
  if (!card) {
    card = { lots: [], products: [], seenLots: new Set(), seenProducts: new Set() };
    cards.set(inn, card);
  }
  if (card.seenLots.has(lot)) return;
  card.seenLots.add(lot);

  const notice = notices.get(lot);
  if (notice && card.lots.length < LOTS_PER_SUPPLIER) {
    card.lots.push({
      id: lot,
      name: notice.name,
      year: notice.year,
      price: notice.price,
      won: row.is_winner === "true",
      customer: notice.customer,
      channel: notice.channel,
    });
  }

  const products = productsByLot.get(lot) ?? [];
  for (const product of products) {
    if (card.products.length >= PRODUCTS_PER_SUPPLIER || card.seenProducts.has(product.name)) continue;
    card.seenProducts.add(product.name);
    card.products.push(product);
  }
});

const output = {};
for (const [inn, card] of cards) {
  card.lots.sort((a, b) => b.year - a.year || b.price - a.price);
  if (!card.lots.length && !card.products.length) continue;
  output[inn] = { lots: card.lots, products: card.products };
}

const temp = path.join(TMP, "supplier-cards.json");
await writeFile(temp, JSON.stringify(output));
await rename(temp, OUT_FILE);
await rm(TMP, { recursive: true, force: true });
console.log(`готово: ${Object.keys(output).length.toLocaleString("ru-RU")} карточек`);
