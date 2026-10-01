/**
 * Открытые сведения о компании из государственных реестров.
 *
 * ЕГРЮЛ (egrul.nalog.ru) — наименование, руководитель, ОГРН, адрес, регион.
 * ГИР БО (bo.nalog.gov.ru) — форма, собственность, выручка, прибыль, активы.
 * Реестр МСП (rmsp.nalog.ru) — категория, ОКВЭД, дата включения.
 *
 * Это публичные страницы реестров, а не платный API. Если реестр не ответил
 * или попросил капчу, соответствующий блок просто остаётся пустым.
 */
import { companyProfile, type CompanyProfile } from "@/lib/company-names";

export type { CompanyProfile };

export type FinanceYear = {
  year: number;
  revenue: number | null;
  profit: number | null;
  assets: number | null;
};

export type SmeRecord = {
  category: string;
  okved: string;
  activity: string;
  included: string;
  active: boolean;
  region: string;
};

export type AccountingRecord = {
  fullName: string;
  address: string;
  okpo: string;
  form: string;
  ownership: string;
  status: string;
  years: FinanceYear[];
};

export type OpenProfile = {
  registry: CompanyProfile | null;
  accounting: AccountingRecord | null;
  sme: SmeRecord | null;
};

const cache = new Map<string, OpenProfile>();
const BROWSER = {
  Accept: "application/json, text/plain, */*",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
};

const SME_CATEGORY: Record<number, string> = {
  1: "Микропредприятие",
  2: "Малое предприятие",
  3: "Среднее предприятие",
};

const ACCOUNTING_STATUS: Record<string, string> = {
  ACTIVE: "Действует",
  LIQUIDATION_STAGE: "В стадии ликвидации",
  LIQUIDATED: "Ликвидирована",
  BANKRUPT: "Банкротство",
  REORGANIZATION: "Реорганизация",
};

function text(value: unknown) {
  return String(value ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function amount(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dateLabel(value: unknown) {
  const raw = text(value);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dotted = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (!iso && !dotted) return raw;
  const year = Number(iso ? iso[1] : dotted?.[3]);
  const month = Number(iso ? iso[2] : dotted?.[2]);
  const day = Number(iso ? iso[3] : dotted?.[1]);
  return new Date(year, month - 1, day).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function readJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { ...BROWSER, ...init?.headers },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  return response.json() as Promise<unknown>;
}

type AccountingSearch = {
  content?: Array<{
    id?: number;
    inn?: string;
    statusCode?: string;
  }>;
};

type AccountingReport = {
  period?: string;
  actives?: number;
  organizationInfo?: {
    fullName?: string;
    address?: string;
    okpo?: string;
    okopf?: { name?: string };
    okfs?: { name?: string };
  };
  typeCorrections?: Array<{
    correction?: {
      balance?: Record<string, number | null>;
      financialResult?: Record<string, number | null>;
    };
  }>;
};

async function accountingOf(inn: string): Promise<AccountingRecord | null> {
  const search = (await readJson(
    `https://bo.nalog.gov.ru/advanced-search/organizations/search?query=${encodeURIComponent(inn)}&page=0`,
    { headers: { Referer: "https://bo.nalog.gov.ru/" } },
  )) as AccountingSearch | null;
  const match = search?.content?.find((item) => text(item.inn) === inn);
  if (!match?.id) return null;

  const reports = (await readJson(`https://bo.nalog.gov.ru/nbo/organizations/${match.id}/bfo/`, {
    headers: { Referer: "https://bo.nalog.gov.ru/" },
  })) as AccountingReport[] | null;
  if (!reports?.length) return null;

  const latest = reports[0];
  const info = latest.organizationInfo;
  const years = reports
    .map((report) => {
      const correction = report.typeCorrections?.[0]?.correction;
      return {
        year: Number(report.period),
        revenue: amount(correction?.financialResult?.current2110),
        profit: amount(correction?.financialResult?.current2400),
        assets: amount(correction?.balance?.current1600 ?? report.actives),
      };
    })
    .filter((year) => Number.isFinite(year.year))
    .sort((a, b) => b.year - a.year)
    .slice(0, 4);

  return {
    fullName: text(info?.fullName),
    address: text(info?.address),
    okpo: text(info?.okpo),
    form: text(info?.okopf?.name),
    ownership: text(info?.okfs?.name),
    status: ACCOUNTING_STATUS[text(match.statusCode)] ?? "",
    years,
  };
}

type SmeSearch = {
  data?: Array<{
    inn?: string;
    category?: number;
    okved1?: string;
    okved1name?: string;
    dtregistry?: string;
    is_active?: number;
    regionname?: string;
  }>;
};

async function smeOf(inn: string): Promise<SmeRecord | null> {
  const result = (await readJson("https://rmsp.nalog.ru/search-proc.json", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Referer: "https://rmsp.nalog.ru/search.html",
    },
    body: new URLSearchParams({ mode: "quick", page: "1", query: inn, pageSize: "10" }),
  })) as SmeSearch | null;
  const row = result?.data?.find((item) => text(item.inn) === inn) ?? result?.data?.[0];
  if (!row || text(row.inn) !== inn) return null;

  return {
    category: SME_CATEGORY[Number(row.category)] ?? "В реестре МСП",
    okved: text(row.okved1),
    activity: text(row.okved1name),
    included: dateLabel(row.dtregistry),
    active: row.is_active === 1,
    region: text(row.regionname),
  };
}

export async function openProfile(inn: string): Promise<OpenProfile> {
  const cached = cache.get(inn);
  if (cached) return cached;

  const [registry, accounting, sme] = await Promise.all([
    companyProfile(inn),
    accountingOf(inn).catch(() => null),
    smeOf(inn).catch(() => null),
  ]);
  const profile = { registry, accounting, sme };
  cache.set(inn, profile);
  return profile;
}
