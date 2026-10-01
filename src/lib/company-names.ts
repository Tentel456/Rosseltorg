const cache = new Map<string, CompanyProfile | null>();

type NalogToken = { t?: string; captchaRequired?: boolean };
type NalogRow = { i?: string; n?: string; c?: string; o?: string; r?: string; g?: string; k?: string; p?: string; a?: string; rn?: string };
type NalogResult = { rows?: NalogRow[] };

export type CompanyProfile = {
  inn: string;
  name: string;
  shortName: string;
  person: string;
  address: string;
  ogrn: string;
  kpp: string;
  registered: string;
  region: string;
  kind: "company" | "person";
};

function clean(value?: string) {
  return (value ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function registeredOn(value?: string) {
  const digits = clean(value);
  const iso = digits.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dotted = digits.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  const match = iso ?? dotted;
  if (!match) return digits;
  const [year, month, day] = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : [Number(dotted?.[3]), Number(dotted?.[2]), Number(dotted?.[1])];
  return new Date(year, month - 1, day).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function lookup(inn: string): Promise<CompanyProfile | null> {
  const tokenResponse = await fetch("https://egrul.nalog.ru/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ query: inn, vyn: "" }),
    signal: AbortSignal.timeout(8000),
  });
  const token = (await tokenResponse.json()) as NalogToken;
  if (!token.t || token.captchaRequired) return null;

  await new Promise((resolve) => setTimeout(resolve, 400));
  const resultResponse = await fetch(`https://egrul.nalog.ru/search-result/${token.t}`, {
    signal: AbortSignal.timeout(8000),
  });
  const result = (await resultResponse.json()) as NalogResult;
  const row = result.rows?.find((item) => item.i === inn) ?? result.rows?.[0];
  if (!row) return null;

  const fullName = clean(row.c) || clean(row.n);
  return {
    inn,
    name: fullName,
    shortName: clean(row.c),
    person: clean(row.g),
    address: clean(row.a),
    ogrn: clean(row.o),
    kpp: clean(row.p),
    registered: registeredOn(row.r),
    region: clean(row.rn),
    kind: row.k === "fl" ? "person" : "company",
  };
}

export async function companyProfile(inn: string) {
  if (cache.has(inn)) return cache.get(inn) ?? null;
  try {
    const profile = await lookup(inn);
    cache.set(inn, profile);
    return profile;
  } catch {
    cache.set(inn, null);
    return null;
  }
}

export async function companyNames(inns: string[]) {
  const unique = [...new Set(inns.filter(Boolean))];
  const profiles = await Promise.all(unique.map(companyProfile));
  return Object.fromEntries(unique.map((inn, index) => [inn, profiles[index]?.name ?? ""]));
}
