/*"use client";

import * as React from "react";
import { PromptInput } from "@/components/dashboard/Input";

export default function Demo() {
  const handleSendMessage = (
    message: string,
    meta: { model: string; effort: string; attachments: File[] }
  ) => {
    console.log("Message Submitted:", message);
    console.log("Submission Meta:", meta);
  };

  return (
    <div 
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden"
      style={{
        backgroundColor: "black"
      }}
    >
      <div className="p-4 w-full max-w-lg flex justify-center z-10">
        <PromptInput
          onSubmit={handleSendMessage}
          placeholder="Что ищем?"
        />
      </div>
    </div>
  );
}

*/

"use client";

import React, { useEffect, useState } from 'react';
import { DashboardView } from '@/components/dashboard/views';
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  LogOut,
  Hash,
  ChevronDown,
  ChevronRight,
  Inbox,
  Calendar,
  Activity,
  CreditCard,
  Globe,
  Terminal,
  Blocks,
  PanelLeftClose,
  PanelLeftOpen,
  Command,
  X,
} from 'lucide-react';

export type NavItemData = {
  id: string;
  title: string;
  icon: React.ElementType;
  badge?: number | string;
  shortcut?: string;
  children?: NavItemData[];
};

export type NavGroupData = {
  heading?: string;
  items: NavItemData[];
};

const mockNavGroups: NavGroupData[] = [
  {
    items: [
      { id: 'search', title: 'Поиск', icon: Search, shortcut: '⌘K' },
      { id: 'home', title: 'Главная', icon: LayoutDashboard },
      { id: 'inbox', title: 'Уведомления', icon: Inbox, badge: 12 },
      { id: 'analytics', title: 'Аналитика', icon: Activity },
    ],
  },
  {
    heading: 'Workspace',
    items: [
      {
        id: 'projects',
        title: 'Projects',
        icon: FolderKanban,
        children: [
          { id: 'p-active', title: 'Active', icon: Hash },
          { id: 'p-archived', title: 'Archived', icon: Hash },
        ],
      },
      { id: 'calendar', title: 'Calendar', icon: Calendar },
      {
        id: 'team',
        title: 'Team',
        icon: Users,
        children: [
          { id: 't-design', title: 'Designers', icon: Hash },
          { id: 't-eng', title: 'Engineering', icon: Hash },
          { id: 't-product', title: 'Product', icon: Hash },
        ],
      },
      {
        id: 'customers',
        title: 'Customers',
        icon: Globe,
        children: [
          { id: 'c-enterprise', title: 'Enterprise', icon: Hash },
          { id: 'c-smb', title: 'SMB', icon: Hash },
        ],
      },
      { id: 'finance', title: 'Finance', icon: CreditCard },
    ],
  },
  {
    heading: 'Developers',
    items: [
      { id: 'api', title: 'API Keys', icon: Terminal },
      { id: 'webhooks', title: 'Webhooks', icon: Blocks },
    ],
  },
];

const mockBottomItems: NavItemData[] = [
  { id: 'settings', title: 'Настройки', icon: Settings, shortcut: '⌘,' },
  { id: 'logout', title: 'Выход', icon: LogOut },
];

/* ---------------- Workspace Switcher ---------------- */

function WorkspaceSwitcher({
  selected,
  onSelect,
}: {
  selected?: string;
  onSelect?: (ws: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSelected, setInternalSelected] = useState('Росэлторг');
  const current = selected || internalSelected;
  const handleSelect = onSelect || setInternalSelected;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-3 text-left transition-colors hover:bg-white/[0.06]"
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl text-[13px] font-semibold text-black">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.41 17.5901H0C0.0979373 18.6349 0.302331 19.6669 0.61 20.6701H9.15L3.59 26.2301C4.23986 27.0297 4.97039 27.7603 5.77 28.4101L11.33 22.8501V31.3901C12.3332 31.6978 13.3652 31.9022 14.41 32.0001V17.5901ZM31.91 17.5901H17.5V32.0001C18.5448 31.9022 19.5768 31.6978 20.58 31.3901V20.6701H28C27.3941 22.2353 26.4908 23.6684 25.34 24.8901V29.0001C28.1654 26.9442 30.2437 24.0233 31.26 20.6801V20.6201C31.32 20.4301 31.37 20.2301 31.42 20.0301C31.4234 19.9768 31.4234 19.9234 31.42 19.8701C31.48 19.6501 31.52 19.4401 31.57 19.2301V19.0501C31.57 18.8701 31.64 18.6901 31.67 18.5001C31.6657 18.4469 31.6657 18.3934 31.67 18.3401C31.67 18.1701 31.72 18.0001 31.74 17.8301C31.7894 17.7452 31.8463 17.6649 31.91 17.5901ZM16 0.000121188C11.9899 -0.0154779 8.12014 1.47533 5.15699 4.17736C2.19384 6.87938 0.353363 10.5956 0 14.5901H10.9L12.62 11.5201H3.83C4.09826 10.7814 4.43296 10.0684 4.83 9.39012H13.83L15.55 6.31012H7.41C9.7691 4.22706 12.8079 3.07747 15.955 3.07747C19.1021 3.07747 22.1409 4.22706 24.5 6.31012H16.38L18.1 9.39012H27.1C27.4967 10.0686 27.8314 10.7815 28.1 11.5201H19.3L21 14.5901H31.9C31.5481 10.6128 29.7219 6.91074 26.7799 4.21115C23.8379 1.51156 19.9929 0.00954304 16 0.000121188Z" fill="white"/>
            </svg>
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[14px] font-semibold leading-none text-white">
              {current}
            </span>
            <span className="mt-1.5 text-[12px] leading-none text-white/45">
              Pro Plan
            </span>
          </div>
        </div>
        <ChevronDown
          className={`size-4 shrink-0 text-white/40 transition-colors ${
            isOpen ? 'text-white/70' : ''
          }`}
          strokeWidth={1.5}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-[64px] z-50 w-full rounded-xl border border-white/10 bg-[#0d0d0d] p-2 shadow-2xl shadow-black/50">
            {['Росэлторг', 'Личное', 'Client Sandbox'].map((ws) => {
              const active = current === ws;
              return (
                <button
                  key={ws}
                  type="button"
                  onClick={() => {
                    handleSelect(ws);
                    setIsOpen(false);
                  }}
                  className={`block w-full rounded-lg px-3.5 py-2.5 text-left text-[14px] transition-colors ${
                    active
                      ? 'bg-white/10 font-medium text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {ws}
                </button>
              );
            })}
            <div className="mx-2 my-2 h-px bg-white/10" />
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-[14px] text-white/45 transition-colors hover:bg-white/5 hover:text-white/70"
            >
              <span className="text-base leading-none">+</span>
              Создать пространство
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- NavItem ---------------- */

function NavItem({
  item,
  activeId,
  onSelect,
  level = 0,
}: {
  item: NavItemData;
  activeId: string;
  onSelect: (id: string) => void;
  level?: number;
}) {
  const isActive = activeId === item.id;
  const hasChildren = !!item.children;
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    if (hasChildren) setIsOpen((v) => !v);
    else onSelect(item.id);
  };

  return (
    <div className="flex w-full flex-col">
      <button
        type="button"
        onClick={handleClick}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        className={`group flex items-center justify-between rounded-lg py-3 pr-3 text-left transition-colors ${
          isActive
            ? 'bg-white/10 font-medium text-white'
            : 'text-white/55 hover:bg-white/5 hover:text-white/90'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <item.icon
            className={`size-5 shrink-0 transition-colors ${
              isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'
            }`}
            strokeWidth={1.5}
          />
          <span className="truncate text-[14px] tracking-wide">{item.title}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {item.shortcut && (
            <kbd className="hidden h-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] px-2 font-mono text-[11px] font-medium text-white/45 group-hover:inline-flex">
              {item.shortcut}
            </kbd>
          )}
          {item.badge && (
            <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-white/10 px-2 text-[11px] font-semibold text-white/90">
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <ChevronRight
              className={`size-4 text-white/40 transition-transform duration-200 ${
                isOpen ? 'rotate-90' : ''
              }`}
              strokeWidth={2}
            />
          )}
        </div>
      </button>

      {hasChildren && (
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="relative mt-1 flex min-h-0 flex-col gap-1 overflow-hidden">
            <div
              className="absolute bottom-1 top-1 border-l border-white/10"
              style={{ left: `${level * 16 + 22}px` }}
            />
            {item.children!.map((child) => (
              <NavItem
                key={child.id}
                item={child}
                activeId={activeId}
                onSelect={onSelect}
                level={level + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- SidebarNav ---------------- */

export function SidebarNav({
  className = '',
  activeId,
  onSelect,
  activeWorkspace,
  onWorkspaceSelect,
}: {
  className?: string;
  activeId?: string;
  onSelect?: (id: string) => void;
  activeWorkspace?: string;
  onWorkspaceSelect?: (ws: string) => void;
}) {
  const [internalId, setInternalId] = useState('home');
  const currentId = activeId !== undefined ? activeId : internalId;
  const handleSelect = onSelect || setInternalId;

  return (
    <div
      className={`flex h-full w-[300px] flex-col bg-[#0a0a0a] p-4 antialiased [font-synthesis:none] ${className}`}
    >
      <WorkspaceSwitcher selected={activeWorkspace} onSelect={onWorkspaceSelect} />

      <div className="mt-6 flex flex-1 flex-col gap-7 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {mockNavGroups.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            {group.heading && (
              <span className="mb-2 px-3 text-[12px] font-semibold uppercase tracking-wider text-white/35">
                {group.heading}
              </span>
            )}
            {group.items.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                activeId={currentId}
                onSelect={handleSelect}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-6">
        {mockBottomItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            activeId={currentId}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Preview ---------------- */

const allItems = [...mockNavGroups.flatMap((g) => g.items), ...mockBottomItems];
const flattenItems = (items: NavItemData[]): NavItemData[] =>
  items.reduce((acc, item) => {
    acc.push(item);
    if (item.children) acc.push(...flattenItems(item.children));
    return acc;
  }, [] as NavItemData[]);

const flatMockData = flattenItems(allItems);

export default function SidebarNavPreview() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeId, setActiveId] = useState('home');
  const [activeWorkspace, setActiveWorkspace] = useState('Росэлторг');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const activeItem = flatMockData.find((i) => i.id === activeId);
  const activeTitle = activeItem ? activeItem.title : 'Dashboard';

  const handleSelect = (id: string) => {
    setActiveId(id);
    if (id === 'search') setIsSearchOpen(true);
  };

  useEffect(() => {
    if (!isSearchOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSearchOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isSearchOpen]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#050505] text-white antialiased [font-synthesis:none]">
      {/* Sidebar */}
      <div
        className={`h-full shrink-0 overflow-hidden border-r border-white/10 bg-[#0a0a0a] transition-all duration-300 ease-in-out ${
          isOpen ? 'w-[300px] opacity-100' : 'w-0 border-none opacity-0'
        }`}
      >
        <SidebarNav
          className="w-[300px] border-none bg-transparent"
          activeId={activeId}
          onSelect={handleSelect}
          activeWorkspace={activeWorkspace}
          onWorkspaceSelect={setActiveWorkspace}
        />
      </div>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col transition-all duration-300">
        {/* Topbar */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0a0a0a] px-6">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => setIsOpen((v) => !v)}
              className="rounded-lg p-2 text-white/45 transition-colors hover:bg-white/5 hover:text-white"
            >
              {isOpen ? (
                <PanelLeftClose className="size-5" strokeWidth={1.5} />
              ) : (
                <PanelLeftOpen className="size-5" strokeWidth={1.5} />
              )}
            </button>
            <div className="flex min-w-0 items-center gap-2.5 text-[14px] text-white/45">
              <span className="truncate">{activeWorkspace}</span>
              <span className="text-white/25">/</span>
              <span className="truncate font-medium text-white">{activeTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden h-10 w-72 rounded-lg border border-white/10 bg-white/[0.03] md:block" />
            <div className="size-10 rounded-full border border-white/15 bg-white/5" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:p-10">
          <DashboardView key={activeId} activeId={activeId} />
        </div>
      </div>

      {/* Search overlay */}
      {isSearchOpen && (
        <div className="absolute inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[15vh] backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsSearchOpen(false)} />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-black/50">
            <div className="flex items-center border-b border-white/10 px-5">
              <Search
                className="mr-3.5 size-5 shrink-0 text-white/40"
                strokeWidth={1.5}
              />
              <input
                autoFocus
                className="flex-1 bg-transparent py-5 text-[15px] text-white outline-none placeholder:text-white/35"
                placeholder="Search projects, docs, or actions..."
              />
              <kbd
                onClick={() => setIsSearchOpen(false)}
                className="ml-3 hidden h-6 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.04] px-2 font-mono text-[11px] font-medium text-white/45 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                ESC
              </kbd>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="ml-3 rounded-lg p-1.5 text-white/45 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex flex-col items-center justify-center px-2 py-12">
              <Command className="mb-3 size-7 text-white/25" strokeWidth={1.5} />
              <p className="text-[14px] font-medium text-white/45">
                Type a command or search...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}