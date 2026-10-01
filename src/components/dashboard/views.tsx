"use client";

import { useState, type ElementType, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Blocks,
  Building2,
  Calendar,
  Check,
  Copy,
  CreditCard,
  FileText,
  FolderKanban,
  Globe,
  Hash,
  Inbox,
  KeyRound,
  MapPin,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Terminal,
  Users,
} from "lucide-react";
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
  codes: string[];
  snippet: string;
};

const notifications = [
  { title: "Новый поставщик прошёл проверку", body: "Северсталь-метиз добавлен в реестр проверенных контрагентов.", time: "12 мин", unread: true },
  { title: "Истекает срок договора", body: "Договор с «Балтика Пак» заканчивается 18 октября.", time: "1 ч", unread: true },
  { title: "Russel AI нашёл 4 совпадения", body: "По запросу «кабель силовой 4×95» есть релевантные производители.", time: "3 ч", unread: true },
  { title: "Обновлён реестр АИС ГЗ", body: "Синхронизация завершена, расхождений не найдено.", time: "вчера", unread: false },
];

const projects = [
  { name: "Закупка кабеля для школ", owner: "Отдел снабжения", updated: "сегодня", state: "В работе" },
  { name: "Спецодежда, зима 2026", owner: "Хозяйственный отдел", updated: "вчера", state: "Согласование" },
  { name: "Металлопрокат, лот 14", owner: "Отдел закупок", updated: "2 дня назад", state: "В работе" },
  { name: "Упаковка для склада №3", owner: "Логистика", updated: "5 дней назад", state: "Завершён" },
];

const archived = [
  { name: "Канцтовары, I квартал", owner: "АХО", updated: "март 2026", state: "Архив" },
  { name: "Офисная мебель", owner: "АХО", updated: "январь 2026", state: "Архив" },
];

const team = {
  "t-design": [
    { name: "Мария Соколова", role: "Дизайнер интерфейсов" },
    { name: "Илья Петров", role: "Бренд" },
  ],
  "t-eng": [
    { name: "Андрей Волков", role: "Фронтенд" },
    { name: "Елена Крылова", role: "Бэкенд" },
    { name: "Павел Новиков", role: "Данные" },
  ],
  "t-product": [
    { name: "Ольга Белова", role: "Продакт" },
    { name: "Кирилл Сафин", role: "Аналитик" },
  ],
};

const customers = {
  "c-enterprise": [
    { name: "Комитет по госзаказу СПб", segment: "Госзаказ", contracts: 18 },
    { name: "Электронная торговая площадка", segment: "Площадка", contracts: 11 },
  ],
  "c-smb": [
    { name: "ООО «Северная логистика»", segment: "Логистика", contracts: 4 },
    { name: "АО «Городские сети»", segment: "ЖКХ", contracts: 6 },
    { name: "ИП Морозова", segment: "Торговля", contracts: 2 },
  ],
};

const events = [
  { day: "02", month: "окт", title: "Приём заявок, лот 14", place: "АИС ГЗ" },
  { day: "07", month: "окт", title: "Встреча с «Невский кабель»", place: "офис" },
  { day: "18", month: "окт", title: "Окончание договора «Балтика Пак»", place: "реестр" },
  { day: "24", month: "окт", title: "Синхронизация электронного магазина", place: "СПб" },
];

const invoices = [
  { id: "РТ-1042", client: "Комитет по госзаказу", amount: "1 240 000 ₽", state: "Оплачен" },
  { id: "РТ-1048", client: "АО «Городские сети»", amount: "386 500 ₽", state: "Ожидает" },
  { id: "РТ-1051", client: "ООО «Северная логистика»", amount: "92 000 ₽", state: "Просрочен" },
];

const keys = [
  { name: "Продакшен", value: "rt_live_••••7f3a", created: "12 сен 2026" },
  { name: "Песочница", value: "rt_test_••••91c0", created: "2 окт 2026" },
];

const webhooks = [
  { url: "https://ais.example.ru/hooks/suppliers", event: "supplier.verified", state: "Активен" },
  { url: "https://shop.example.ru/hooks/catalog", event: "catalog.updated", state: "Пауза" },
];

const statusTone: Record<string, string> = {
  Проверен: "bg-emerald-400/10 text-emerald-300",
  "На проверке": "bg-amber-400/10 text-amber-300",
  Риск: "bg-rose-400/10 text-rose-300",
  "В работе": "bg-sky-400/10 text-sky-300",
  Согласование: "bg-amber-400/10 text-amber-300",
  Завершён: "bg-white/10 text-white/70",
  Архив: "bg-white/10 text-white/55",
  Оплачен: "bg-emerald-400/10 text-emerald-300",
  Ожидает: "bg-amber-400/10 text-amber-300",
  Просрочен: "bg-rose-400/10 text-rose-300",
  Активен: "bg-emerald-400/10 text-emerald-300",
  Пауза: "bg-white/10 text-white/55",
};

function Status({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${statusTone[value] ?? "bg-white/10 text-white/70"}`}>
      {value}
    </span>
  );
}

function Page({
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  icon: ElementType;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Icon className="size-5 text-white/80" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-white">{title}</h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-white/50">{description}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.02] ${className}`}>{children}</div>;
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="p-5">
      <p className="text-[13px] text-white/45">{label}</p>
      <p className="mt-3 text-3xl font-medium tracking-tight text-white">{value}</p>
      <p className="mt-2 text-[13px] text-white/40">{hint}</p>
    </Card>
  );
}

function GhostButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white px-3.5 text-sm font-medium text-black transition-colors hover:bg-white/85"
    >
      {children}
    </button>
  );
}

const resultStatus = {
  proven: { label: "Проверен", tone: "bg-emerald-400/10 text-emerald-300" },
  review: { label: "На проверке", tone: "bg-amber-400/10 text-amber-300" },
  risk: { label: "Мало данных", tone: "bg-white/10 text-white/55" },
} as const;

function plural(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function HomeView() {
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
    <div className={`mx-auto flex w-full max-w-5xl flex-col items-center ${results ? "pt-4" : "min-h-[calc(100vh-9rem)] justify-center"}`}>
      <div className="w-full">
        <PromptInput placeholder="Название закупки, например: оказание услуг по организации горячего питания" onSubmit={search} />
      </div>

      {results && (
        <div className="mt-8 w-full max-w-3xl self-start">
          <p className="mb-5 text-sm text-white/40">
            {pending
              ? "Ищем по реестру…"
              : results.length > 0
                ? `${results.length} ${plural(results.length, "поставщик", "поставщика", "поставщиков")} по запросу «${query}»`
                : `По запросу «${query}» ничего не найдено`}
          </p>
          <div className="flex flex-col gap-7">
            {results.map((supplier) => {
              const status = resultStatus[supplier.status];
              return (
                <article key={supplier.inn}>
                  <p className="text-[13px] text-white/40">ИНН {supplier.inn}{supplier.kpp ? ` · КПП ${supplier.kpp}` : ""}</p>
                  <h2 className="mt-1 text-xl font-medium text-sky-300">
                    {supplier.name || `Поставщик ИНН ${supplier.inn}`}
                  </h2>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-white/65">
                    Исполнял закупку «{supplier.snippet}». {supplier.wins}{" "}
                    {plural(supplier.wins, "победа", "победы", "побед")} из {supplier.lots}{" "}
                    {plural(supplier.lots, "лота", "лотов", "лотов")}
                    {supplier.customers > 0 ? `, ${supplier.customers} ${plural(supplier.customers, "заказчик", "заказчика", "заказчиков")}` : ""}.
                    {supplier.channels.length ? ` Каналы: ${supplier.channels.join(", ")}.` : ""}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[13px] text-white/40">
                    <span>рейтинг {supplier.score}</span>
                    <span>победы {supplier.winRate}%</span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${status.tone}`}>
                      {status.label}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchView() {
  return (
    <Page
      icon={Search}
      title="Поиск"
      description="Найдите производителя, дистрибьютора или контрагента по категории, ИНН или региону."
    >
      <Card className="flex items-center gap-3 px-4">
        <Search className="size-4 shrink-0 text-white/40" strokeWidth={1.5} />
        <input
          className="h-12 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          placeholder="Например, кабель силовой или ИНН"
        />
      </Card>
      <div className="flex flex-wrap gap-2">
        {["Металлопрокат", "Санкт-Петербург", "Проверенные", "Спецодежда"].map((tag) => (
          <button
            key={tag}
            type="button"
            className="rounded-full border border-white/10 px-3 py-1.5 text-[13px] text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            {tag}
          </button>
        ))}
      </div>
      <Card className="p-5 text-sm text-white/50">
        Поиск по реестру открывается на вкладке «Главная».
      </Card>
    </Page>
  );
}

function InboxView() {
  return (
    <Page icon={Inbox} title="Уведомления" description="Проверки, сроки договоров и результаты поиска Russel AI.">
      <div className="flex flex-col gap-3">
        {notifications.map((item) => (
          <Card key={item.title} className="flex items-start gap-4 p-5">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.04]">
              <Bell className="size-4 text-white/60" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-white">{item.title}</p>
                {item.unread && <span className="size-1.5 shrink-0 rounded-full bg-sky-400" />}
              </div>
              <p className="mt-1 text-sm leading-6 text-white/50">{item.body}</p>
            </div>
            <span className="shrink-0 text-[12px] text-white/35">{item.time}</span>
          </Card>
        ))}
      </div>
    </Page>
  );
}

function AnalyticsView() {
  const bars = [42, 58, 51, 73, 66, 88, 79];
  return (
    <Page icon={Activity} title="Аналитика" description="Как меняется качество подбора поставщиков за последние недели.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Запросов" value="346" hint="за 30 дней" />
        <Stat label="Доля проверенных" value="71%" hint="+4 п.п. к прошлому месяцу" />
        <Stat label="Средний срок проверки" value="2.4 дн" hint="было 3.1" />
      </div>
      <Card className="p-6">
        <p className="text-sm text-white/50">Релевантные совпадения по дням</p>
        <div className="mt-6 flex h-40 items-end gap-3">
          {bars.map((value, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-md bg-white/70" style={{ height: `${value}%` }} />
              <span className="text-[11px] text-white/35">{index + 1}</span>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  );
}

function ProjectsView({ archivedOnly = false }: { archivedOnly?: boolean }) {
  const rows = archivedOnly ? archived : projects;
  return (
    <Page
      icon={archivedOnly ? Hash : FolderKanban}
      title={archivedOnly ? "Архив" : "Активные закупки"}
      description={archivedOnly ? "Завершённые и закрытые подборы." : "Подборы поставщиков, которые сейчас в работе."}
      action={archivedOnly ? undefined : <GhostButton><Plus className="size-4" />Новая закупка</GhostButton>}
    >
      <div className="grid gap-3">
        {rows.map((row) => (
          <Card key={row.name} className="flex items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{row.name}</p>
              <p className="mt-1 text-[13px] text-white/40">{row.owner} · обновлено {row.updated}</p>
            </div>
            <Status value={row.state} />
          </Card>
        ))}
      </div>
    </Page>
  );
}

function CalendarView() {
  return (
    <Page icon={Calendar} title="Календарь" description="Сроки приёма заявок, встречи и синхронизации.">
      <div className="grid gap-3">
        {events.map((event) => (
          <Card key={event.title} className="flex items-center gap-5 p-5">
            <div className="w-12 shrink-0 text-center">
              <p className="text-xl font-medium leading-none text-white">{event.day}</p>
              <p className="mt-1 text-[12px] uppercase text-white/40">{event.month}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{event.title}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-white/40">
                <MapPin className="size-3.5" strokeWidth={1.5} />
                {event.place}
              </p>
            </div>
            <ArrowUpRight className="size-4 text-white/30" />
          </Card>
        ))}
      </div>
    </Page>
  );
}

function TeamView({ group }: { group: keyof typeof team }) {
  const titles = { "t-design": "Дизайн", "t-eng": "Разработка", "t-product": "Продукт" };
  return (
    <Page icon={Users} title={titles[group]} description="Люди, которые ведут подбор и проверку контрагентов.">
      <div className="grid gap-3 sm:grid-cols-2">
        {team[group].map((person) => (
          <Card key={person.name} className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-medium text-white/80">
              {person.name.split(" ").map((part) => part[0]).join("")}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{person.name}</p>
              <p className="mt-0.5 text-[13px] text-white/45">{person.role}</p>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}

function CustomersView({ segment }: { segment: keyof typeof customers }) {
  return (
    <Page
      icon={Globe}
      title={segment === "c-enterprise" ? "Крупные заказчики" : "Малый и средний бизнес"}
      description="Организации, для которых ведётся подбор поставщиков."
    >
      <div className="grid gap-3">
        {customers[segment].map((customer) => (
          <Card key={customer.name} className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-4">
              <div className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04]">
                <Building2 className="size-4 text-white/60" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{customer.name}</p>
                <p className="mt-0.5 text-[13px] text-white/45">{customer.segment}</p>
              </div>
            </div>
            <p className="text-sm text-white/55">{customer.contracts} контрактов</p>
          </Card>
        ))}
      </div>
    </Page>
  );
}

function FinanceView() {
  return (
    <Page icon={CreditCard} title="Финансы" description="Счета и статусы оплат по действующим договорам.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="К оплате" value="478 500 ₽" hint="2 счёта" />
        <Stat label="Оплачено в октябре" value="1.24 млн ₽" hint="1 счёт" />
        <Stat label="Просрочено" value="92 000 ₽" hint="1 счёт" />
      </div>
      <Card className="overflow-hidden">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="flex items-center justify-between gap-4 border-b border-white/5 px-5 py-4 last:border-0">
            <div className="flex items-center gap-3">
              <FileText className="size-4 text-white/40" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-white">{invoice.id}</p>
                <p className="mt-0.5 text-[13px] text-white/40">{invoice.client}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/70">{invoice.amount}</span>
              <Status value={invoice.state} />
            </div>
          </div>
        ))}
      </Card>
    </Page>
  );
}

function ApiView() {
  return (
    <Page
      icon={Terminal}
      title="Ключи API"
      description="Доступ к реестру поставщиков для АИС ГЗ и электронного магазина."
      action={<GhostButton><Plus className="size-4" />Создать ключ</GhostButton>}
    >
      <div className="grid gap-3">
        {keys.map((key) => (
          <Card key={key.name} className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-4">
              <KeyRound className="size-4 text-white/50" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-white">{key.name}</p>
                <p className="mt-0.5 font-mono text-[13px] text-white/45">{key.value}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-[12px] text-white/35 sm:inline">{key.created}</span>
              <button type="button" className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white" aria-label="Скопировать ключ">
                <Copy className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}

function WebhooksView() {
  return (
    <Page icon={Blocks} title="Вебхуки" description="Куда отправлять события о проверках и обновлении каталога." action={<GhostButton><Plus className="size-4" />Добавить</GhostButton>}>
      <div className="grid gap-3">
        {webhooks.map((hook) => (
          <Card key={hook.url} className="flex items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="truncate font-mono text-[13px] text-white">{hook.url}</p>
              <p className="mt-1 text-[13px] text-white/40">{hook.event}</p>
            </div>
            <Status value={hook.state} />
          </Card>
        ))}
      </div>
    </Page>
  );
}

function SettingsView() {
  const options = ["Уведомления о проверках", "Письма о новых совпадениях", "Синхронизация с АИС ГЗ"];
  return (
    <Page icon={Settings} title="Настройки" description="Профиль организации и то, какие события приходят на почту.">
      <Card className="divide-y divide-white/10">
        {options.map((option, index) => (
          <label key={option} className="flex items-center justify-between gap-4 px-5 py-4">
            <span className="text-sm text-white/80">{option}</span>
            <span className="relative grid size-5 place-items-center">
              <input
                type="checkbox"
                defaultChecked={index !== 1}
                className="peer size-full appearance-none rounded-[5px] border border-white/25 bg-white/5 checked:border-white checked:bg-white"
              />
              <Check className="pointer-events-none absolute size-3.5 text-black opacity-0 peer-checked:opacity-100" strokeWidth={2.5} />
            </span>
          </label>
        ))}
      </Card>
    </Page>
  );
}

function LogoutView() {
  return (
    <Page icon={ShieldCheck} title="Выход" description="Сессия демо-аккаунта Росэлторг. Выход вернёт на страницу входа.">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="text-sm text-white/60">Вы вошли как demo@roseltorg.ru</p>
        <a
          href="/auth"
          className="inline-flex h-10 items-center rounded-lg border border-white/15 px-4 text-sm text-white transition-colors hover:bg-white/5"
        >
          Выйти
        </a>
      </Card>
    </Page>
  );
}

const views: Record<string, () => ReactNode> = {
  home: HomeView,
  search: SearchView,
  inbox: InboxView,
  analytics: AnalyticsView,
  projects: () => <ProjectsView />,
  "p-active": () => <ProjectsView />,
  "p-archived": () => <ProjectsView archivedOnly />,
  calendar: CalendarView,
  team: () => <TeamView group="t-eng" />,
  "t-design": () => <TeamView group="t-design" />,
  "t-eng": () => <TeamView group="t-eng" />,
  "t-product": () => <TeamView group="t-product" />,
  customers: () => <CustomersView segment="c-enterprise" />,
  "c-enterprise": () => <CustomersView segment="c-enterprise" />,
  "c-smb": () => <CustomersView segment="c-smb" />,
  finance: FinanceView,
  api: ApiView,
  webhooks: WebhooksView,
  settings: SettingsView,
  logout: LogoutView,
};

export function DashboardView({ activeId }: { activeId: string }) {
  const View = views[activeId] ?? HomeView;
  return <View />;
}
