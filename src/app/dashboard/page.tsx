"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { PromptInput } from "@/components/dashboard/Input";

type SearchResult = {
  inn: string;
  kpp: string;
  name: string;
  lots: number;
  wins: number;
  winRate: number;
  score: number;
  status: "proven" | "review" | "risk";
  customers: number;
  channels: string[];
  matched: number;
  coverage: number;
};

const resultStatus = {
  proven: "Проверен",
  review: "На проверке",
  risk: "Мало данных",
} as const;

function plural(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export default function DashboardPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [pending, setPending] = useState(false);

  const search = async (message: string) => {
    const nextQuery = message.trim();
    if (!nextQuery) return;
    setQuery(nextQuery);
    setPending(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(nextQuery)}`);
      const payload = (await response.json()) as { results: SearchResult[] };
      setResults(payload.results);
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-10 text-white antialiased [font-synthesis:none] sm:px-8">
      <div className={`mx-auto flex w-full max-w-[760px] flex-col ${results ? "" : "min-h-[calc(100vh-5rem)] justify-center"}`}>
        <PromptInput
          placeholder="Название закупки, например: оказание услуг по организации горячего питания"
          onSubmit={search}
        />

        {results && (
          <section className="mt-8">
            <div className="flex items-end justify-between gap-4 border-b border-white/15 pb-4">
              <p className="text-sm text-white/45">
                {pending
                  ? "Ищем по реестру…"
                  : results.length > 0
                    ? `${results.length} ${plural(results.length, "поставщик", "поставщика", "поставщиков")}`
                    : "Ничего не найдено"}
              </p>
              {!pending && query && (
                <p className="truncate text-sm text-white/35">«{query}»</p>
              )}
            </div>

            {results.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {results.map((supplier, index) => (
                  <ResultCard key={supplier.inn} supplier={supplier} index={index} />
                ))}
              </div>
            ) : (
              !pending && (
                <div className="mt-4 rounded-md border border-dashed border-white/15 px-5 py-8 text-center">
                  <p className="text-xl tracking-[-0.04em]">В реестре нет такого совпадения</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-white/45">
                    Попробуйте другое название закупки или ИНН поставщика.
                  </p>
                </div>
              )
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function ResultCard({ supplier, index }: { supplier: SearchResult; index: number }) {
  const name = supplier.name || `Поставщик ИНН ${supplier.inn}`;

  return (
    <a
      href={`/supplier/${supplier.inn}`}
      className="group relative block rounded-md border border-white/15 bg-black px-5 py-4 transition-colors hover:border-white/40"
    >
      <FocusCorners />
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-xs text-white/45">
            <span className="text-white">{String(index + 1).padStart(2, "0")}</span>
            <span className="mx-2 text-white/20">/</span>
            ИНН {supplier.inn}
            {supplier.kpp ? ` · КПП ${supplier.kpp}` : ""}
          </p>
          <h2 className="mt-2 truncate text-xl font-medium tracking-[-0.04em] text-white">{name}</h2>
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-black transition-colors group-hover:bg-white/85">
          <ArrowRight className="size-4" />
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[8px] border border-white/10 bg-white/10">
        <Stat label="Рейтинг" value={String(supplier.score)} />
        <Stat label="Победы" value={`${supplier.winRate}%`} hint={`${supplier.wins} из ${supplier.lots}`} />
        <Stat label="Заказчики" value={String(supplier.customers)} hint={supplier.channels.join(" · ")} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-white/20 px-2.5 py-1 text-[12px] text-white/70">
          {resultStatus[supplier.status]}
        </span>
        {supplier.coverage < 1 && (
          <span className="rounded-full border border-dashed border-white/20 px-2.5 py-1 text-[12px] text-white/45">
            совпало {supplier.matched} {plural(supplier.matched, "слово", "слова", "слов")}
          </span>
        )}
        <span className="ml-auto text-[13px] text-white/35 transition-colors group-hover:text-white">
          Открыть карточку
        </span>
      </div>
    </a>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-black px-3 py-2.5">
      <p className="text-[11px] text-white/40">{label}</p>
      <p className="mt-1 text-lg font-medium tracking-[-0.04em]">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-white/35">{hint}</p>}
    </div>
  );
}

function FocusCorners() {
  const corner = "pointer-events-none absolute h-3 w-3 border-white/0 transition-all duration-300 group-hover:border-white/70";
  return (
    <>
      <span className={`${corner} -left-px -top-px border-l border-t group-hover:-translate-x-1 group-hover:-translate-y-1`} />
      <span className={`${corner} -right-px -top-px border-r border-t group-hover:translate-x-1 group-hover:-translate-y-1`} />
      <span className={`${corner} -bottom-px -left-px border-b border-l group-hover:-translate-x-1 group-hover:translate-y-1`} />
      <span className={`${corner} -bottom-px -right-px border-b border-r group-hover:translate-x-1 group-hover:translate-y-1`} />
    </>
  );
}
