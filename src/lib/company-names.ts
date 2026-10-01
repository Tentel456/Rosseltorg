const cache = new Map<string, string>();

type NalogToken = { t?: string; captchaRequired?: boolean };
type NalogRow = { i?: string; n?: string; c?: string };
type NalogResult = { rows?: NalogRow[] };

async function lookup(inn: string) {
  const tokenResponse = await fetch("https://egrul.nalog.ru/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ query: inn, vyn: "" }),
    signal: AbortSignal.timeout(8000),
  });
  const token = (await tokenResponse.json()) as NalogToken;
  if (!token.t || token.captchaRequired) return "";

  await new Promise((resolve) => setTimeout(resolve, 400));
  const resultResponse = await fetch(`https://egrul.nalog.ru/search-result/${token.t}`, {
    signal: AbortSignal.timeout(8000),
  });
  const result = (await resultResponse.json()) as NalogResult;
  const row = result.rows?.find((item) => item.i === inn) ?? result.rows?.[0];
  return row?.c || row?.n || "";
}

export async function companyNames(inns: string[]) {
  const unique = [...new Set(inns.filter(Boolean))];
  await Promise.all(
    unique.map(async (inn) => {
      if (cache.has(inn)) return;
      try {
        cache.set(inn, await lookup(inn));
      } catch {
        cache.set(inn, "");
      }
    })
  );
  return Object.fromEntries(unique.map((inn) => [inn, cache.get(inn) ?? ""]));
}
