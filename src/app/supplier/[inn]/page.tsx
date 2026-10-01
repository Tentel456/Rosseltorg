"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

type Supplier = {
  inn: string;
  kpp: string;
  lots: number;
  wins: number;
  winRate: number;
  score: number;
  status: "proven" | "review" | "risk";
  customers: number;
  channels: string[];
  trade: Array<"retail" | "wholesale">;
};

type Registry = {
  name: string;
  person: string;
  address: string;
  ogrn: string;
  kpp: string;
  registered: string;
  region: string;
  kind: "company" | "person";
};

type FinanceYear = {
  year: number;
  revenue: number | null;
  profit: number | null;
  assets: number | null;
};

type Accounting = {
  fullName: string;
  address: string;
  okpo: string;
  form: string;
  ownership: string;
  status: string;
  years: FinanceYear[];
};

type Sme = {
  category: string;
  okved: string;
  activity: string;
  included: string;
  active: boolean;
  region: string;
};

type SupplierProduct = { name: string; okpd2: string };
type SupplierLot = {
  id: string;
  name: string;
  year: number;
  price: number;
  won: boolean;
  customer: string;
  channel: string;
};
type SupplierDetails = { lots: SupplierLot[]; products: SupplierProduct[] };
type RnpStatus = "listed" | "clear" | "unknown";
type OpenProfile = {
  registry: Registry | null;
  accounting: Accounting | null;
  sme: Sme | null;
};

const statusLabel = {
  proven: "Проверен",
  review: "На проверке",
  risk: "Мало данных",
};

const tradeLabel = { retail: "Розница", wholesale: "Опт" };

function rubles(value: number) {
  if (!value) return "цена не указана";
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function plural(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function money(value: number | null) {
  if (value === null) return "—";
  const sign = value < 0 ? "−" : "";
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${sign}${(absolute / 1_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млрд ₽`;
  if (absolute >= 1_000) return `${sign}${(absolute / 1_000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млн ₽`;
  return `${sign}${absolute.toLocaleString("ru-RU")} тыс. ₽`;
}

export default function SupplierPage() {
  const params = useParams<{ inn: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [profile, setProfile] = useState<OpenProfile | null>(null);
  const [details, setDetails] = useState<SupplierDetails>({ lots: [], products: [] });
  const [rnp, setRnp] = useState<RnpStatus>("unknown");
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/supplier/${params.inn}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("missing");
        return response.json() as Promise<{ supplier: Supplier; profile: OpenProfile; details: SupplierDetails; rnp: RnpStatus }>;
      })
      .then((payload) => {
        if (!active) return;
        setSupplier(payload.supplier);
        setProfile(payload.profile);
        setDetails(payload.details ?? { lots: [], products: [] });
        setRnp(payload.rnp ?? "unknown");
      })
      .catch(() => {
        if (active) setMissing(true);
      });
    return () => {
      active = false;
    };
  }, [params.inn]);

  const registry = profile?.registry;
  const accounting = profile?.accounting;
  const sme = profile?.sme;
  const name = registry?.name || accounting?.fullName || (supplier ? `ИНН ${supplier.inn}` : "Карточка поставщика");
  const address = registry?.address || accounting?.address;

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-12 text-white antialiased [font-synthesis:none] sm:px-10 lg:px-16 lg:py-20">
      <div className="w-full">
        <a href="/dashboard" className="inline-flex items-center gap-2 text-sm text-white/45 transition-colors hover:text-white">
          <ArrowLeft className="size-4" />
          К поиску
        </a>

        {missing ? (
          <div className="mt-20 rounded-md border border-dashed border-white/15 px-8 py-12">
            <h1 className="text-3xl font-medium tracking-[-0.04em]">Поставщик не найден</h1>
            <p className="mt-3 max-w-md text-sm leading-5 text-white/45">Этого ИНН нет в индексе закупок Росэлторг.</p>
          </div>
        ) : !supplier ? (
          <div className="mt-20 h-72 animate-pulse rounded-md border border-white/10 bg-white/[0.03]" />
        ) : (
          <div className="mt-16 space-y-24 sm:mt-20">
            <header className="space-y-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/20 px-2.5 py-1 text-[12px] text-white/70">
                  {registry?.kind === "person" ? "Индивидуальный предприниматель" : "Юридическое лицо"}
                </span>
                <span className="rounded-full border border-white/20 px-2.5 py-1 text-[12px] text-white/70">
                  {statusLabel[supplier.status]}
                </span>
                {rnp === "listed" && (
                  <span className="rounded-full bg-white px-2.5 py-1 text-[12px] text-black">В реестре недобросовестных</span>
                )}
                {rnp === "clear" && (
                  <span className="rounded-full border border-white/20 px-2.5 py-1 text-[12px] text-white/70">Нет в РНП</span>
                )}
                {(accounting?.status === "В стадии ликвидации" || accounting?.status === "Ликвидирована" || accounting?.status === "Банкротство") ? (
                  <span className="rounded-full bg-white px-2.5 py-1 text-[12px] text-black">{accounting.status}</span>
                ) : accounting?.status ? (
                  <span className="rounded-full border border-dashed border-white/20 px-2.5 py-1 text-[12px] text-white/45">
                    {accounting.status}
                  </span>
                ) : null}
                {sme && (
                  <span className="rounded-full border border-dashed border-white/20 px-2.5 py-1 text-[12px] text-white/45">
                    {sme.active ? sme.category : `Было в МСП: ${sme.category.toLowerCase()}`}
                  </span>
                )}
              </div>

              <div className="space-y-5">
                <h1 className="max-w-6xl text-5xl font-medium tracking-[-0.04em] sm:text-6xl sm:leading-[1.02] lg:text-7xl">{name}</h1>
                <p className="text-base text-white/45">
                  ИНН {supplier.inn}
                  {(registry?.kpp || supplier.kpp) && ` · КПП ${registry?.kpp || supplier.kpp}`}
                  {registry?.ogrn && ` · ОГРН ${registry.ogrn}`}
                </p>
              </div>

              <BoldStats supplier={supplier} accounting={accounting} sme={sme} />
            </header>

            <Section
              index="01"
              title="Закупки Росэлторг"
              note={`${supplier.wins} ${plural(supplier.wins, "победа", "победы", "побед")} в ${supplier.lots} ${plural(supplier.lots, "лоте", "лотах", "лотах")}.`}
            >
              <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
                <WinRing wins={supplier.wins} lots={supplier.lots} rate={supplier.winRate} />
                <div className="rounded-md border border-white/15 bg-black px-5 py-5 sm:px-6">
                  <Bars
                    rows={[
                      { label: "Победы", value: supplier.wins, max: supplier.lots, hint: String(supplier.wins) },
                      { label: "Без победы", value: Math.max(0, supplier.lots - supplier.wins), max: supplier.lots, hint: String(Math.max(0, supplier.lots - supplier.wins)), muted: true },
                      { label: "Заказчики", value: supplier.customers, max: Math.max(supplier.customers, supplier.lots), hint: String(supplier.customers) },
                      { label: "Рейтинг", value: supplier.score, max: 100, hint: `${supplier.score} / 100` },
                    ]}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {supplier.channels.map((channel) => (
                  <span key={channel} className="rounded-[8px] border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80">{channel}</span>
                ))}
                {supplier.trade.map((trade) => (
                  <span key={trade} className="rounded-[8px] border border-white/15 bg-white px-3 py-2 text-sm text-black">{tradeLabel[trade]}</span>
                ))}
                {supplier.channels.length === 0 && supplier.trade.length === 0 && (
                  <span className="text-sm text-white/45">Канал поставки в данных не указан.</span>
                )}
              </div>
            </Section>

            {(details.lots.length > 0 || details.products.length > 0) && (
              <Section index="02" title="Лоты и поставки" note="Последние закупки и живые наименования из ТРУ.">
                <div className="grid gap-10 xl:grid-cols-[1.4fr_0.8fr]">
                  <div>
                    {details.lots.length > 0 ? (
                      <div className="divide-y divide-white/10 border-y border-white/10">
                        {details.lots.map((lot) => (
                          <div key={lot.id} className="grid gap-3 py-5 sm:grid-cols-[5.5rem_1fr_auto] sm:items-baseline">
                            <p className="text-sm text-white/40">{lot.year || "—"}</p>
                            <div className="min-w-0">
                              <p className="text-base leading-6 text-white">{lot.name || `Лот ${lot.id}`}</p>
                              <p className="mt-1 text-xs text-white/35">
                                {lot.customer ? `Заказчик ИНН ${lot.customer}` : "Заказчик не указан"}
                                {lot.channel ? ` · ${lot.channel}` : ""}
                              </p>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-sm text-white">{rubles(lot.price)}</p>
                              <p className={`mt-1 text-xs ${lot.won ? "text-white" : "text-white/35"}`}>{lot.won ? "Победа" : "Без победы"}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-white/45">Названия лотов в извещениях не найдены.</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/35">Что поставляет</p>
                    <div className="mt-4 space-y-4">
                      {details.products.length > 0 ? details.products.map((product) => (
                        <div key={`${product.okpd2}-${product.name}`} className="border-t border-white/10 pt-4">
                          <p className="text-sm leading-6 text-white">{product.name}</p>
                          {product.okpd2 && <p className="mt-1 text-xs text-white/35">ОКПД2 {product.okpd2}</p>}
                        </div>
                      )) : (
                        <p className="text-sm text-white/45">Наименования товаров в ТРУ не найдены.</p>
                      )}
                    </div>
                  </div>
                </div>
              </Section>
            )}

            <Section index={details.lots.length || details.products.length ? "03" : "02"} title="Сведения из реестра" note="ЕГРЮЛ и ЕГРИП, открытый поиск ФНС.">
              <div className="grid gap-x-16 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
                <Info label="Полное наименование" value={accounting?.fullName || registry?.name || "не получено"} />
                <Info label={registry?.kind === "person" ? "Предприниматель" : "Руководитель"} value={registry?.person || "не получено"} />
                <Info label="ОГРН" value={registry?.ogrn || "не получено"} />
                <Info label="Дата регистрации" value={registry?.registered || "не получено"} />
                <Info label="Регион" value={registry?.region || sme?.region || "не указан"} />
                <Info label="ОКПО" value={accounting?.okpo || "не получено"} />
              </div>
              <div className="mt-10 rounded-[10px] border border-dashed border-white/15 px-6 py-5">
                <p className="text-xs text-white/40">Адрес</p>
                <p className="mt-2 text-sm leading-6 text-white/80">
                  {address || "ЕГРЮЛ сейчас не ответил. Обновите страницу чуть позже."}
                </p>
              </div>
            </Section>

            {accounting?.years.length ? (
              <Section index={details.lots.length || details.products.length ? "04" : "03"} title="Открытые источники" note="Бухгалтерская отчётность и реестр малого бизнеса.">
                <FinanceBoard accounting={accounting} sme={sme} inn={supplier.inn} />
              </Section>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

function BoldStats({
  supplier,
  accounting,
  sme,
}: {
  supplier: Supplier;
  accounting: Accounting | null | undefined;
  sme: Sme | null | undefined;
}) {
  const latest = accounting?.years[0];
  const headline = latest?.revenue != null
    ? { value: money(latest.revenue), title: `Выручка за ${latest.year}`, text: "По данным государственной бухгалтерской отчётности." }
    : { value: String(supplier.score), title: "Рейтинг поставщика", text: "Считается по победам в закупках Росэлторг." };
  const mosaic = ["/auth/Rosel-1.png", "/auth/Rosel-3.png", "/auth/Rosel-4.png"];

  return (
    <div className="flex flex-col gap-16 pt-6">
      <div className="flex flex-col items-start justify-between gap-8 border-b border-white/15 pb-8 lg:flex-row lg:items-end">
        <div className="flex flex-col items-baseline gap-5 lg:flex-row lg:gap-8">
          <span className="shrink-0 text-7xl font-medium tracking-[-0.05em] sm:text-8xl lg:text-9xl">{headline.value}</span>
          <div className="max-w-sm">
            <h3 className="text-xl font-medium tracking-[-0.03em]">{headline.title}</h3>
            <p className="mt-2 text-sm leading-5 text-white/45">{headline.text}</p>
          </div>
        </div>
        <div className="grid h-44 w-full shrink-0 grid-cols-3 gap-2 sm:h-52 sm:w-[28rem]">
          {mosaic.map((src) => (
            <img key={src} src={src} alt="" className="h-full w-full rounded-md object-cover" />
          ))}
        </div>
      </div>

      <div className="grid gap-10 sm:grid-cols-2 xl:grid-cols-4">
        <BigStat value={`${supplier.winRate}%`} label="Доля побед" />
        <BigStat value={String(supplier.lots)} label={plural(supplier.lots, "лот", "лота", "лотов")} />
        <BigStat value={String(supplier.customers)} label={plural(supplier.customers, "заказчик", "заказчика", "заказчиков")} />
        <BigStat value={sme?.active ? sme.category : latest ? money(latest.profit) : statusLabel[supplier.status]} label={sme?.active ? "Реестр МСП" : latest ? `Прибыль ${latest.year}` : "Статус"} />
      </div>
    </div>
  );
}

function BigStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="mb-2 text-4xl font-medium tracking-[-0.04em] md:text-5xl">{value}</p>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/40">{label}</p>
    </div>
  );
}

function Section({ index, title, note, children }: { index: string; title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="space-y-8">
      <div className="flex items-end justify-between gap-8 border-b border-white/15 pb-5">
        <h2 className="text-3xl font-medium tracking-[-0.04em]">
          <span className="mr-3 text-sm text-white/35">{index}</span>
          {title}
        </h2>
        <p className="hidden max-w-xs text-right text-xs leading-4 text-white/35 sm:block">{note}</p>
      </div>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-2 text-sm leading-6 text-white/85">{value}</p>
    </div>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-white/15 bg-black px-4 py-4">
      <p className="text-[11px] text-white/40">{label}</p>
      <p className="mt-2 text-sm leading-5 text-white">{value}</p>
      {hint && <p className="mt-1 text-[12px] leading-4 text-white/40">{hint}</p>}
    </div>
  );
}

function WinRing({ wins, lots, rate }: { wins: number; lots: number; rate: number }) {
  const radius = 58;
  const length = 2 * Math.PI * radius;
  const share = lots > 0 ? Math.max(0, Math.min(1, wins / lots)) : 0;

  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-white/15 bg-black px-5 py-6">
      <svg viewBox="0 0 160 160" className="size-52" aria-label={`Победы ${rate}%`}>
        <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${length * share} ${length}`}
          transform="rotate(-90 80 80)"
        />
        <text x="80" y="76" textAnchor="middle" fill="white" fontSize="28" fontWeight="500">{rate}%</text>
        <text x="80" y="96" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11">побед</text>
      </svg>
      <p className="mt-2 text-center text-[12px] text-white/40">{wins} из {lots} лотов</p>
    </div>
  );
}

function Bars({ rows }: { rows: Array<{ label: string; value: number; max: number; hint: string; muted?: boolean }> }) {
  return (
    <div className="flex h-full flex-col justify-center gap-4">
      {rows.map((row) => {
        const width = row.max > 0 ? Math.max(2, Math.round((row.value / row.max) * 100)) : 0;
        return (
          <div key={row.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12px]">
              <span className="text-white/45">{row.label}</span>
              <span className="text-white/70">{row.hint}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full ${row.muted ? "bg-white/35" : "bg-white"}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function changeOf(current: number | null | undefined, previous: number | null | undefined) {
  if (current == null || previous == null || previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function changeLabel(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("ru-RU")}%`;
}

function FinanceBoard({
  accounting,
  sme,
  inn,
}: {
  accounting: Accounting;
  sme: Sme | null | undefined;
  inn: string;
}) {
  const ordered = [...accounting.years].sort((a, b) => a.year - b.year);
  const latest = ordered[ordered.length - 1];
  const previous = ordered[ordered.length - 2];
  const revenueChange = changeOf(latest?.revenue, previous?.revenue);
  const profitChange = changeOf(latest?.profit, previous?.profit);
  const assetsChange = changeOf(latest?.assets, previous?.assets);
  const margin = latest?.revenue ? Math.round(((latest.profit ?? 0) / latest.revenue) * 1000) / 10 : null;
  const kpis = [
    { label: `Выручка ${latest?.year ?? ""}`, value: money(latest?.revenue ?? null), change: changeLabel(revenueChange), up: (revenueChange ?? 0) >= 0 },
    { label: `Прибыль ${latest?.year ?? ""}`, value: money(latest?.profit ?? null), change: changeLabel(profitChange), up: (profitChange ?? 0) >= 0 },
    { label: "Активы", value: money(latest?.assets ?? null), change: changeLabel(assetsChange), up: (assetsChange ?? 0) >= 0 },
    { label: "Рентабельность", value: margin === null ? "—" : `${margin}%`, change: latest?.year ? String(latest.year) : "—", up: (margin ?? 0) >= 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-md border border-white/15 bg-black p-6 sm:p-8 xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">Рост выручки</p>
              <h3 className="mt-2 text-2xl font-medium tracking-[-0.04em]">{money(latest?.revenue ?? null)}</h3>
              <p className="mt-1 text-sm text-white/45">
                {previous ? `${changeLabel(revenueChange)} к ${previous.year} году` : `Отчётность за ${latest?.year}`}
              </p>
            </div>
            <a
              href={`https://bo.nalog.gov.ru/search?query=${inn}`}
              target="_blank"
              rel="noreferrer"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-black transition-colors hover:bg-white/85"
              aria-label="Открыть отчётность на сайте ФНС"
            >
              <ArrowUpRight className="size-4" />
            </a>
          </div>
          <RevenueArea years={ordered} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-1 flex-col justify-between rounded-md bg-white p-6 text-black">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-black/40">Рентабельность</p>
              <h4 className="mt-2 text-xl font-medium tracking-[-0.03em]">Прибыль к выручке</h4>
            </div>
            <div className="mt-8">
              <div className="mb-2 flex items-end justify-between">
                <span className="text-4xl font-medium tracking-[-0.04em]">{margin === null ? "—" : `${margin}%`}</span>
                <span className="mb-1 text-xs text-black/45">{latest?.year}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
                <div className="h-full rounded-full bg-black" style={{ width: `${Math.max(0, Math.min(100, margin ?? 0))}%` }} />
              </div>
            </div>
          </div>
          <div className="rounded-md border border-white/15 bg-black p-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">{accounting.form || "Форма"}</p>
            <h4 className="mt-3 text-lg font-medium tracking-[-0.03em]">{accounting.ownership || "Форма собственности не указана"}</h4>
            <p className="mt-3 text-sm leading-6 text-white/50">
              {sme?.active
                ? <>В реестре МСП как <span className="text-white">{sme.category.toLowerCase()}</span>{sme.activity ? `: ${sme.activity}` : ""}.</>
                : sme
                  ? "Ранее состояла в реестре малого и среднего предпринимательства."
                  : "В реестре малого и среднего предпринимательства не состоит."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-md border border-white/15 bg-black p-5 transition-colors hover:border-white/40">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">{kpi.label}</p>
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <p className="text-2xl font-medium tracking-[-0.04em]">{kpi.value}</p>
              <span className={`rounded px-1.5 py-0.5 text-xs ${kpi.up ? "bg-white text-black" : "bg-white/10 text-white/70"}`}>{kpi.change}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueArea({ years }: { years: Array<FinanceYear & { label?: string }> }) {
  const width = 640;
  const height = 260;
  const pad = { left: 8, right: 8, top: 24, bottom: 32 };
  const values = years.map((year) => year.revenue ?? 0);
  const peak = Math.max(1, ...values.map(Math.abs));
  const floor = Math.min(0, ...values);
  const span = peak - floor || 1;
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const points = years.map((year, index) => {
    const x = pad.left + (years.length === 1 ? innerWidth / 2 : (innerWidth * index) / (years.length - 1));
    const y = pad.top + innerHeight - ((year.revenue ?? 0) - floor) / span * innerHeight;
    return { x, y, year: year.year, label: year.label };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${pad.left},${pad.top + innerHeight} ${line} ${pad.left + innerWidth},${pad.top + innerHeight}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-8 h-64 w-full" role="img" aria-label="Рост выручки по годам">
      <polygon points={area} fill="rgba(255,255,255,0.08)" />
      <polyline points={line} fill="none" stroke="white" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((point) => (
        <g key={point.year}>
          <circle cx={point.x} cy={point.y} r="4" fill="#050505" stroke="white" strokeWidth="2" />
          <text x={point.x} y={height - 8} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="12">{point.label || point.year}</text>
        </g>
      ))}
    </svg>
  );
}

function ProfileFacts({ accounting, sme }: { accounting: Accounting | null | undefined; sme: Sme | null | undefined }) {
  return (
    <div className="flex flex-col gap-3">
      <Fact label="Организационно-правовая форма" value={accounting?.form || "не получено"} />
      <Fact label="Форма собственности" value={accounting?.ownership || "не получено"} />
      <Fact
        label="Реестр МСП"
        value={sme ? (sme.active ? sme.category : "Исключён") : "Не состоит"}
        hint={sme?.included ? `включён ${sme.included}` : undefined}
      />
      <Fact label="Основной ОКВЭД" value={sme?.okved || "не указан"} hint={sme?.activity} />
    </div>
  );
}
