/**
 * Проверка ИНН в реестре недобросовестных поставщиков на zakupki.gov.ru.
 *
 * ЕИС не отдаёт открытый JSON, поэтому читается публичная страница поиска.
 * Если сайт не ответил, статус остаётся unknown: отсутствие ответа не значит,
 * что поставщика в реестре нет.
 */
export type RnpStatus = "listed" | "clear" | "unknown";

const cache = new Map<string, RnpStatus>();

function decode(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function dishonestSupplier(inn: string): Promise<RnpStatus> {
  const wanted = inn.replace(/\D/g, "");
  if (!wanted) return "unknown";
  const cached = cache.get(wanted);
  if (cached) return cached;

  try {
    const url = new URL("https://zakupki.gov.ru/epz/dishonestsupplier/search/results.html");
    url.searchParams.set("searchString", wanted);
    url.searchParams.set("morphology", "on");
    url.searchParams.set("pageNumber", "1");
    url.searchParams.set("recordsPerPage", "_10");
    url.searchParams.set("fz94", "on");
    url.searchParams.set("fz223", "on");
    const response = await fetch(url, {
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      cache.set(wanted, "unknown");
      return "unknown";
    }
    const page = decode(await response.text());
    const status: RnpStatus = page.includes(wanted) && /недобросовест/i.test(page) ? "listed" : "clear";
    cache.set(wanted, status);
    return status;
  } catch {
    cache.set(wanted, "unknown");
    return "unknown";
  }
}
