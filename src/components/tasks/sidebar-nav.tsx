"use client";

import { ReactNode } from "react";

type SidebarNavProps = {
  collapsed: boolean;
  totalCount: number;
  todayCount: number;
  activeView?: TaskView;
  viewCounts?: Record<TaskView, number>;
  activeListId?: string | null;
  activeTagId?: string | null;
  hasListFilter?: boolean;
  hasTagFilter?: boolean;
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
  onSelectView?: (view: TaskView) => void;
  onSelectList?: (listId: string | null) => void;
  onSelectTag?: (tagId: string | null) => void;
  onClearListFilter?: () => void;
  onClearTagFilter?: () => void;
  mobile?: boolean;
};

type TaskView = "all" | "pending" | "completed" | "today" | "upcoming";

type SidebarNavItemProps = {
  label: string;
  icon: ReactNode;
  count?: number;
  active?: boolean;
  collapsed: boolean;
  onClick?: () => void;
};

type IconProps = {
  className?: string;
};

function MenuIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M5 7h14M5 12h14M5 17h14"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TasksIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M8 6h11M8 12h11M8 18h11"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="4.5" cy="6" r="1.2" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1.2" fill="currentColor" />
    </svg>
  );
}

function PendingIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M12 8v4l2.8 2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CompletedIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="m8.7 12 2.1 2.1 4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="4" y="6" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M8 4v4M16 4v4M4 10h16"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UpcomingIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="4" y="6" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M8 4v4M16 4v4M4 10h16M9 15h6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FolderIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M3 8.5A2.5 2.5 0 0 1 5.5 6H10l2 2h6.5A2.5 2.5 0 0 1 21 10.5v7A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TagIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M12.2 4H6.5A2.5 2.5 0 0 0 4 6.5v5.7a2.5 2.5 0 0 0 .73 1.77l5.3 5.3a2.5 2.5 0 0 0 3.54 0l5.7-5.7a2.5 2.5 0 0 0 0-3.54l-5.3-5.3A2.5 2.5 0 0 0 12.2 4Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <circle cx="8.2" cy="8.2" r="1.35" fill="currentColor" />
    </svg>
  );
}

function SettingsIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M12 3v2.2M12 18.8V21M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M3 12h2.2M18.8 12H21M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function PlusIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="m8 8 8 8M16 8l-8 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function SidebarNavItem({
  label,
  icon,
  count,
  active = false,
  collapsed,
  onClick,
}: SidebarNavItemProps) {
  const counterText = count !== undefined && count > 99 ? "99+" : count;

  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`group relative flex min-h-11 w-full items-center rounded-2xl border px-3 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 active:scale-[0.99] active:translate-y-0 ${
        active
          ? "border-slate-200 bg-slate-100 text-slate-900 shadow-[0_8px_18px_-16px_rgb(15_23_42/0.75)]"
          : "border-transparent text-slate-600 hover:-translate-y-[1px] hover:border-slate-200/90 hover:bg-slate-50 hover:text-slate-900 hover:shadow-[0_8px_16px_-14px_rgb(15_23_42/0.7)]"
      } ${collapsed ? "justify-center px-0" : "gap-3 py-2.5"}`}
    >
      <span
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ease-out ${
          active
            ? "bg-white text-slate-900 shadow-[0_8px_16px_-12px_rgb(15_23_42/0.9)]"
            : "text-slate-500 group-hover:scale-105 group-hover:text-slate-700"
        }`}
      >
        {icon}
        {collapsed && counterText !== undefined ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold leading-none text-white">
            {counterText}
          </span>
        ) : null}
      </span>

      {collapsed ? null : <span className="min-w-0 truncate">{label}</span>}

      {collapsed || counterText === undefined ? null : (
        <span className="ml-auto inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-[11px] font-semibold text-slate-500">
          {counterText}
        </span>
      )}

      {collapsed ? <span className="ui-rail-tooltip">{label}</span> : null}
    </button>
  );
}

function sectionLabel(label: string) {
  return (
    <p className="px-2 text-[12px] font-semibold tracking-[0.12em] text-slate-400" aria-hidden>
      {label}
    </p>
  );
}

export function SidebarNav({
  collapsed,
  totalCount,
  todayCount,
  activeView = "all",
  viewCounts,
  activeListId = null,
  activeTagId = null,
  hasListFilter = false,
  hasTagFilter = false,
  lists,
  tags,
  onToggle,
  onSelectView,
  onSelectList,
  onSelectTag,
  onClearListFilter,
  onClearTagFilter,
  mobile = false,
}: SidebarNavProps) {
  const resolvedCounts: Record<TaskView, number> = {
    all: viewCounts?.all ?? totalCount,
    pending: viewCounts?.pending ?? todayCount,
    completed: viewCounts?.completed ?? 0,
    today: viewCounts?.today ?? 0,
    upcoming: viewCounts?.upcoming ?? 0,
  };

  return (
    <div className={`flex h-full flex-col ${collapsed ? "px-2.5 py-4" : "px-4 py-4 sm:px-5 sm:py-5"}`}>
      <div className={`mb-4 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
        {collapsed ? null : (
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-[40px]">Menu</h2>
        )}
        <button
          type="button"
          aria-label={mobile ? "Cerrar menu" : collapsed ? "Expandir menu" : "Colapsar menu"}
          onClick={onToggle}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-[0_12px_20px_-16px_rgb(15_23_42/0.9)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-slate-50 hover:text-slate-900 hover:shadow-[0_14px_22px_-16px_rgb(15_23_42/0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 active:translate-y-0 active:scale-[0.99]"
        >
          {mobile ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      <div
        className={`scrollbar-thin flex-1 overflow-y-auto ${collapsed ? "space-y-4" : "space-y-6"} ${mobile ? "pt-2" : ""}`}
      >
        <section className="space-y-1">
          {collapsed ? null : sectionLabel("TASKS")}
          <SidebarNavItem
            label="All Tasks"
            icon={<TasksIcon />}
            count={resolvedCounts.all}
            collapsed={collapsed}
            active={activeView === "all"}
            onClick={() => onSelectView?.("all")}
          />
          <SidebarNavItem
            label="Pending"
            icon={<PendingIcon />}
            count={resolvedCounts.pending}
            collapsed={collapsed}
            active={activeView === "pending"}
            onClick={() => onSelectView?.("pending")}
          />
          <SidebarNavItem
            label="Completed"
            icon={<CompletedIcon />}
            count={resolvedCounts.completed}
            collapsed={collapsed}
            active={activeView === "completed"}
            onClick={() => onSelectView?.("completed")}
          />
          <SidebarNavItem
            label="Today"
            icon={<CalendarIcon />}
            count={resolvedCounts.today}
            collapsed={collapsed}
            active={activeView === "today"}
            onClick={() => onSelectView?.("today")}
          />
          <SidebarNavItem
            label="Upcoming"
            icon={<UpcomingIcon />}
            count={resolvedCounts.upcoming}
            collapsed={collapsed}
            active={activeView === "upcoming"}
            onClick={() => onSelectView?.("upcoming")}
          />
        </section>

        <section className="space-y-1.5">
          {collapsed ? null : (
            <div className="flex items-center justify-between px-2">
              <p
                className="text-[12px] font-semibold tracking-[0.12em] text-slate-400"
                aria-hidden
              >
                LISTS
              </p>
              {hasListFilter ? (
                <button
                  type="button"
                  onClick={onClearListFilter}
                  aria-label="Quitar filtro de listas"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 active:translate-y-0 active:scale-[0.99]"
                >
                  <ClearIcon />
                </button>
              ) : null}
            </div>
          )}
          {lists.length === 0 && !collapsed ? (
            <p className="px-2 text-xs text-slate-400">Sin listas</p>
          ) : (
            lists.slice(0, 5).map((list) => {
              const isActive = activeListId === list.id;
              return (
                <button
                  key={list.id}
                  type="button"
                  title={collapsed ? list.name : undefined}
                  aria-label={list.name}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onSelectList?.(isActive ? null : list.id)}
                  className={`group flex min-h-11 w-full items-center rounded-2xl border text-sm transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 active:translate-y-0 active:scale-[0.99] ${
                    isActive
                      ? "border-slate-200 bg-slate-100 text-slate-900 shadow-[0_8px_16px_-14px_rgb(15_23_42/0.7)]"
                      : "border-transparent text-slate-700 hover:-translate-y-[1px] hover:border-slate-200/90 hover:bg-slate-50 hover:shadow-[0_8px_16px_-14px_rgb(15_23_42/0.7)]"
                  } ${collapsed ? "justify-center px-0" : "gap-2.5 px-3 py-2.5"}`}
                >
                  <span
                    className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ease-out ${
                      isActive
                        ? "bg-white text-slate-900 shadow-[0_8px_16px_-12px_rgb(15_23_42/0.9)]"
                        : "text-slate-500 group-hover:scale-105 group-hover:text-slate-700"
                    }`}
                  >
                    <FolderIcon className="h-[19px] w-[19px]" />
                    <span
                      className="absolute right-[7px] top-[8px] h-2.5 w-2.5 rounded-full ring-2 ring-white"
                      style={{ backgroundColor: list.color ?? "#f87171" }}
                      aria-hidden
                    />
                    {collapsed ? (
                      <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold leading-none text-white">
                        {list.count > 99 ? "99+" : list.count}
                      </span>
                    ) : null}
                  </span>
                  {collapsed ? null : (
                    <>
                      <span className="min-w-0 truncate">{list.name}</span>
                      <span className="ml-auto inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-[11px] font-semibold text-slate-500">
                        {list.count}
                      </span>
                    </>
                  )}
                  {collapsed ? <span className="ui-rail-tooltip">{list.name}</span> : null}
                </button>
              );
            })
          )}

          <button
            type="button"
            aria-label="Add New List"
            title={collapsed ? "Add New List" : undefined}
            className={`group flex min-h-11 w-full items-center rounded-2xl border border-dashed border-slate-200 text-sm font-medium text-slate-600 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-slate-50 hover:text-slate-900 hover:shadow-[0_8px_16px_-14px_rgb(15_23_42/0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 active:translate-y-0 active:scale-[0.99] ${
              collapsed ? "justify-center px-0" : "gap-2.5 px-3 py-2.5"
            }`}
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-all duration-200 ease-out group-hover:scale-105 group-hover:text-slate-700">
              <PlusIcon className="h-[19px] w-[19px]" />
            </span>
            {collapsed ? null : <span>Add New List</span>}
            {collapsed ? <span className="ui-rail-tooltip">Add New List</span> : null}
          </button>
        </section>

        <section className="space-y-2">
          {collapsed ? null : (
            <div className="flex items-center justify-between px-2">
              <p
                className="text-[12px] font-semibold tracking-[0.12em] text-slate-400"
                aria-hidden
              >
                TAGS
              </p>
              {hasTagFilter ? (
                <button
                  type="button"
                  onClick={onClearTagFilter}
                  aria-label="Quitar filtro de etiquetas"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 active:translate-y-0 active:scale-[0.99]"
                >
                  <ClearIcon />
                </button>
              ) : null}
            </div>
          )}
          <div className={`flex flex-wrap gap-2 ${collapsed ? "justify-center" : ""}`}>
            {tags.slice(0, 4).map((tag, index) => (
              (() => {
                const isActive = activeTagId === tag.id;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-label={tag.name}
                    title={collapsed ? tag.name : undefined}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => onSelectTag?.(isActive ? null : tag.id)}
                    className={`group inline-flex items-center gap-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 ease-out hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 active:translate-y-0 active:scale-[0.99] ${
                      isActive
                        ? "border-slate-300 bg-slate-100 text-slate-900 shadow-[0_8px_14px_-12px_rgb(15_23_42/0.65)]"
                        : "border-transparent bg-slate-100/80 text-slate-700 hover:border-slate-200 hover:bg-slate-100 hover:shadow-[0_8px_14px_-12px_rgb(15_23_42/0.65)]"
                    } ${collapsed ? "h-10 w-10 justify-center px-0" : "h-9 px-2.5"}`}
                    style={{
                      backgroundColor:
                        tag.color ??
                        (index % 3 === 0 ? "#d1fae5" : index % 3 === 1 ? "#fee2e2" : "#dbeafe"),
                    }}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-1 ring-slate-300/50"
                      style={{
                        backgroundColor:
                          tag.color ??
                          (index % 3 === 0 ? "#10b981" : index % 3 === 1 ? "#fb7185" : "#60a5fa"),
                      }}
                      aria-hidden
                    />
                    {collapsed ? (
                      <TagIcon className="h-3.5 w-3.5 text-slate-700" />
                    ) : (
                      <span>{tag.name}</span>
                    )}
                    {collapsed ? <span className="ui-rail-tooltip">{tag.name}</span> : null}
                  </button>
                );
              })()
            ))}
            {collapsed ? null : (
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-slate-50 hover:shadow-[0_8px_14px_-12px_rgb(15_23_42/0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 active:translate-y-0 active:scale-[0.99]"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                <TagIcon className="h-3.5 w-3.5" />
                Add Tag
              </button>
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 space-y-1">
        <SidebarNavItem label="Settings" icon={<SettingsIcon />} collapsed={collapsed} />
      </div>
    </div>
  );
}
