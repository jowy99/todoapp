"use client";

import { ReactNode } from "react";

type SidebarNavProps = {
  collapsed: boolean;
  totalCount: number;
  todayCount: number;
  lists: Array<{
    id: string;
    name: string;
    color: string | null;
    count: number;
  }>;
  tags: Array<{
    id: string;
    name: string;
    color: string | null;
  }>;
  onToggle: () => void;
  mobile?: boolean;
};

type RowItemProps = {
  label: string;
  icon: ReactNode;
  count?: number;
  active?: boolean;
  collapsed: boolean;
};

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 3.5 3.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function TasksIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="m7.5 7 2 2 3.5-3.5M7.5 12 9.5 14l3.5-3.5M6 18h12"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function TodayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M7 6h10M7 11h10M7 16h6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="5" cy="6" r="1" fill="currentColor" />
      <circle cx="5" cy="11" r="1" fill="currentColor" />
      <circle cx="5" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 4v4M16 4v4M4 10h16" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function StickyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M6 5h12v14l-4-4H6V5Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="7" r="1.6" fill="currentColor" />
      <circle cx="15" cy="12" r="1.6" fill="currentColor" />
      <circle cx="11" cy="17" r="1.6" fill="currentColor" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M14 7h6v10h-6M10 12h10M10 12l3-3M10 12l3 3M4 5h7v14H4V5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function RowItem({ label, icon, count, active = false, collapsed }: RowItemProps) {
  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center rounded-xl border px-3 py-2.5 text-sm transition ${
        active
          ? "border-transparent bg-slate-100 text-slate-900"
          : "border-transparent text-slate-700 hover:bg-slate-100/70"
      } ${collapsed ? "justify-center px-0" : "gap-3"}`}
    >
      <span className="text-slate-500">{icon}</span>
      {collapsed ? null : <span className="truncate">{label}</span>}
      {collapsed || count === undefined ? null : (
        <span className="ml-auto text-xs font-medium text-slate-500">{count}</span>
      )}
    </button>
  );
}

export function SidebarNav({
  collapsed,
  totalCount,
  todayCount,
  lists,
  tags,
  onToggle,
  mobile = false,
}: SidebarNavProps) {
  return (
    <div className={`flex h-full flex-col ${collapsed ? "px-2.5 py-4" : "px-5 py-5"}`}>
      <div className={`mb-4 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
        {collapsed ? null : (
          <h2 className="text-[40px] font-bold tracking-tight text-slate-900">Menu</h2>
        )}
        <button
          type="button"
          aria-label={mobile ? "Cerrar menu" : collapsed ? "Expandir menu" : "Colapsar menu"}
          onClick={onToggle}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
        >
          <MenuIcon />
        </button>
      </div>

      <button
        type="button"
        aria-label="Buscar"
        title={collapsed ? "Search" : undefined}
        className={`mb-5 flex items-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500 ${collapsed ? "h-10 w-10 justify-center self-center px-0" : "gap-2 px-3 py-2.5"}`}
      >
        <SearchIcon />
        {collapsed ? null : <span>Search</span>}
      </button>

      <div
        className={`scrollbar-thin flex-1 overflow-y-auto ${collapsed ? "space-y-4" : "space-y-6"}`}
      >
        <section className="space-y-1">
          {collapsed ? null : (
            <p className="px-2 text-[11px] font-semibold tracking-[0.14em] text-slate-400">TASKS</p>
          )}
          <RowItem label="Upcoming" icon={<TasksIcon />} count={totalCount} collapsed={collapsed} />
          <RowItem
            label="Today"
            icon={<TodayIcon />}
            count={todayCount}
            collapsed={collapsed}
            active
          />
          <RowItem label="Calendar" icon={<CalendarIcon />} collapsed={collapsed} />
          <RowItem label="Sticky Wall" icon={<StickyIcon />} collapsed={collapsed} />
        </section>

        <section className="space-y-1.5">
          {collapsed ? null : (
            <p className="px-2 text-[11px] font-semibold tracking-[0.14em] text-slate-400">LISTS</p>
          )}
          {lists.length === 0 && !collapsed ? (
            <p className="px-2 text-xs text-slate-400">Sin listas</p>
          ) : (
            lists.slice(0, 5).map((list) => (
              <button
                key={list.id}
                type="button"
                title={collapsed ? list.name : undefined}
                aria-label={list.name}
                className={`flex w-full items-center rounded-xl border border-transparent py-2 text-sm text-slate-700 transition hover:bg-slate-100/70 ${
                  collapsed ? "justify-center px-0" : "gap-3 px-3"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: list.color ?? "#f87171" }}
                  aria-hidden
                />
                {collapsed ? null : (
                  <>
                    <span className="truncate">{list.name}</span>
                    <span className="ml-auto text-xs text-slate-500">{list.count}</span>
                  </>
                )}
              </button>
            ))
          )}

          <button
            type="button"
            aria-label="Add New List"
            title={collapsed ? "Add New List" : undefined}
            className={`flex w-full items-center rounded-xl border border-transparent py-2 text-sm text-slate-700 transition hover:bg-slate-100/70 ${
              collapsed ? "justify-center px-0" : "gap-3 px-3"
            }`}
          >
            <span className="text-slate-500">
              <PlusIcon />
            </span>
            {collapsed ? null : <span>Add New List</span>}
          </button>
        </section>

        <section className="space-y-2">
          {collapsed ? null : (
            <p className="px-2 text-[11px] font-semibold tracking-[0.14em] text-slate-400">TAGS</p>
          )}
          <div className={`flex flex-wrap gap-2 ${collapsed ? "justify-center" : ""}`}>
            {tags.slice(0, 4).map((tag, index) => (
              <button
                key={tag.id}
                type="button"
                aria-label={tag.name}
                title={collapsed ? tag.name : undefined}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 ${
                  collapsed ? "h-8 w-8 px-0 py-0" : ""
                }`}
                style={{
                  backgroundColor:
                    tag.color ??
                    (index % 3 === 0 ? "#d1fae5" : index % 3 === 1 ? "#fee2e2" : "#dbeafe"),
                }}
              >
                {collapsed ? (
                  <span className="mx-auto block h-2 w-2 rounded-full bg-slate-600" />
                ) : (
                  tag.name
                )}
              </button>
            ))}
            {collapsed ? null : (
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
              >
                + Add Tag
              </button>
            )}
          </div>
        </section>
      </div>

      <div className={`mt-6 space-y-1 ${collapsed ? "" : ""}`}>
        <RowItem label="Settings" icon={<SettingsIcon />} collapsed={collapsed} />
        <RowItem label="Sign out" icon={<SignOutIcon />} collapsed={collapsed} />
      </div>
    </div>
  );
}
