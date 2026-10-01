/**
 * Формат supplier-index.bin. Все числа little-endian, текст UTF-8.
 * Файл читается с диска по смещениям, поэтому поиск не загружает индекс целиком.
 *
 *  0  magic "RSET"            4
 *  4  version u16 = 1         2
 *  6  flags u16               2
 *  8  builtAt u64, unix ms    8
 * 16  suppliers u32           4
 * 20  terms u32               4
 * 24  dictionaryOffset u64    8
 * 32  postingsOffset u64      8
 * 40  cardsOffset u64         8
 * 48  reserved                16
 * ---- header, 64 байта ----
 *
 * Словарь: terms записей по 16 байт, отсортирован по termHash.
 *   termHash u32, postingCount u32, postingOffset u32, cardCount u32
 * Постинги одного слова лежат подряд и отсортированы по cardId,
 * поэтому пересечение нескольких слов идёт слиянием.
 *
 * Карточка — плотная запись фиксированной ширины. Строки — смещение и длина
 * в общем блоке строк, который начинается сразу после карточек.
 */

export const MAGIC = "RSET";
export const VERSION = 1;
export const HEADER_SIZE = 64;
export const TERM_SIZE = 16;
export const CARD_SIZE = 40;

export const TRADE_RETAIL = 1;
export const TRADE_WHOLESALE = 2;

export const STATUS_RISK = 0;
export const STATUS_REVIEW = 1;
export const STATUS_PROVEN = 2;

export type SupplierStatus = "risk" | "review" | "proven";

export const STATUS_NAME: SupplierStatus[] = ["risk", "review", "proven"];

const textEncoder = new TextEncoder();

/** FNV-1a по байтам UTF-8. Совпадает в сборщике и в поиске на любой архитектуре. */
export function hashTerm(term: string) {
  const bytes = textEncoder.encode(term);
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i += 1) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
