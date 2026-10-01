import { readFile } from "node:fs/promises";
import path from "node:path";

export type SupplierLot = {
  id: string;
  name: string;
  year: number;
  price: number;
  won: boolean;
  customer: string;
  channel: string;
};

export type SupplierProduct = {
  name: string;
  okpd2: string;
};

export type SupplierDetails = {
  lots: SupplierLot[];
  products: SupplierProduct[];
};

type CardFile = Record<string, SupplierDetails>;

const FILE = path.join(process.cwd(), "src", "data", "supplier-cards.json");
let loading: Promise<CardFile> | null = null;

function loadCards() {
  loading ??= readFile(FILE, "utf8")
    .then((text) => JSON.parse(text) as CardFile)
    .catch(() => ({}));
  return loading;
}

export async function supplierDetails(inn: string): Promise<SupplierDetails> {
  const cards = await loadCards();
  return cards[inn.replace(/\D/g, "")] ?? { lots: [], products: [] };
}
