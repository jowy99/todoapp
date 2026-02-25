"use client";

import { FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

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
  onRequestCreateList?: () => void;
  onRequestCreateTag?: () => void;
  isListCreatorOpen?: boolean;
  isTagCreatorOpen?: boolean;
  listDraftName?: string;
  listDraftColor?: string;
  tagDraftName?: string;
  tagDraftColor?: string;
  isCreatingDisabled?: boolean;
  onListDraftNameChange?: (value: string) => void;
  onListDraftColorChange?: (value: string) => void;
  onTagDraftNameChange?: (value: string) => void;
  onTagDraftColorChange?: (value: string) => void;
  onCreateListSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onCreateTagSubmit?: (event: FormEvent<HTMLFormElement>) => void;
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
        d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="7.5" r="1.35" fill="currentColor" />
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
      className={`group relative flex min-h-10 w-full items-center rounded-2xl border text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 active:scale-[0.99] active:translate-y-0 ${
        active
          ? "border-slate-200 bg-slate-100 text-slate-900 shadow-[0_8px_18px_-16px_rgb(15_23_42/0.75)]"
          : "border-transparent text-slate-600 hover:-translate-y-[1px] hover:border-slate-200/90 hover:bg-slate-50 hover:text-slate-900 hover:shadow-[0_8px_16px_-14px_rgb(15_23_42/0.7)]"
      } ${collapsed ? "mx-auto h-12 w-12 justify-center px-0" : "gap-3 px-3 py-2"}`}
    >
      <span className="relative">
        <NavIcon icon={icon} active={active} />
        {collapsed && counterText !== undefined ? <NavBadge value={counterText} /> : null}
      </span>

      {collapsed ? null : <span className="min-w-0 truncate">{label}</span>}

      {collapsed || counterText === undefined ? null : (
        <span className="ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-2 text-[11px] font-semibold text-slate-500">
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

type NavIconProps = {
  icon: ReactNode;
  active?: boolean;
  className?: string;
};

function NavIcon({ icon, active = false, className = "" }: NavIconProps) {
  return (
    <span
      className={`relative grid h-10 w-10 place-items-center rounded-xl transition-all duration-200 ease-out ${
        active
          ? "bg-white text-slate-900 shadow-[0_8px_16px_-12px_rgb(15_23_42/0.9)]"
          : "text-slate-500 group-hover:text-slate-700"
      } ${className}`}
    >
      <span className="pointer-events-none h-5 w-5 shrink-0 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0">
        {icon}
      </span>
    </span>
  );
}

type NavBadgeProps = {
  value: string | number;
  className?: string;
};

function NavBadge({ value, className = "" }: NavBadgeProps) {
  return (
    <span
      className={`absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-slate-900 px-1 text-[11px] font-semibold leading-none text-white ${className}`}
    >
      {value}
    </span>
  );
}

function SidebarSectionDivider({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      aria-hidden
      className={collapsed ? "my-3 mx-auto h-px w-10 bg-black/10" : "my-5 h-px w-full bg-black/10"}
    />
  );
}

const tagFallbackPalette = ["#10b981", "#ef4444", "#3b82f6"] as const;

function getTagChipColor(color: string | null, index: number) {
  return color ?? tagFallbackPalette[index % tagFallbackPalette.length];
}

function isLightTagColor(color: string) {
  const normalized = color.replace("#", "");
  const hex = normalized.length === 3 ? normalized.split("").map((value) => `${value}${value}`).join("") : normalized;
  if (!/^[\da-fA-F]{6}$/.test(hex)) {
    return false;
  }

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.62;
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

function trapFocusWithin(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") {
    return;
  }

  const focusableElements = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter((element) => !element.hasAttribute("aria-hidden"));

  if (focusableElements.length === 0) {
    event.preventDefault();
    return;
  }

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement as HTMLElement | null;

  if (event.shiftKey && (activeElement === firstFocusable || !event.currentTarget.contains(activeElement))) {
    event.preventDefault();
    lastFocusable.focus();
    return;
  }

  if (!event.shiftKey && activeElement === lastFocusable) {
    event.preventDefault();
    firstFocusable.focus();
  }
}

function handleCreatorKeyDown(event: ReactKeyboardEvent<HTMLElement>, onClose: () => void) {
  if (event.key === "Escape") {
    event.preventDefault();
    onClose();
    return;
  }

  trapFocusWithin(event);
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
  onRequestCreateList,
  onRequestCreateTag,
  isListCreatorOpen = false,
  isTagCreatorOpen = false,
  listDraftName = "",
  listDraftColor = "#0ea5e9",
  tagDraftName = "",
  tagDraftColor = "#ec4899",
  isCreatingDisabled = false,
  onListDraftNameChange,
  onListDraftColorChange,
  onTagDraftNameChange,
  onTagDraftColorChange,
  onCreateListSubmit,
  onCreateTagSubmit,
  mobile = false,
}: SidebarNavProps) {
  const listCreateButtonRef = useRef<HTMLButtonElement | null>(null);
  const tagCreateButtonRef = useRef<HTMLButtonElement | null>(null);
  const listInputRef = useRef<HTMLInputElement | null>(null);
  const tagInputRef = useRef<HTMLInputElement | null>(null);
  const [isDesktopDialogViewport, setIsDesktopDialogViewport] = useState(false);
  const [isLandscapeViewport, setIsLandscapeViewport] = useState(false);

  useEffect(() => {
    const desktopDialogQuery = window.matchMedia("(min-width: 1024px)");
    const landscapeQuery = window.matchMedia("(orientation: landscape)");
    const syncViewportFlags = () => {
      setIsDesktopDialogViewport(desktopDialogQuery.matches);
      setIsLandscapeViewport(landscapeQuery.matches);
    };
    syncViewportFlags();
    desktopDialogQuery.addEventListener("change", syncViewportFlags);
    landscapeQuery.addEventListener("change", syncViewportFlags);
    return () => {
      desktopDialogQuery.removeEventListener("change", syncViewportFlags);
      landscapeQuery.removeEventListener("change", syncViewportFlags);
    };
  }, []);

  useEffect(() => {
    if (!isListCreatorOpen) {
      return;
    }
    requestAnimationFrame(() => listInputRef.current?.focus());
  }, [isDesktopDialogViewport, isListCreatorOpen, mobile]);

  useEffect(() => {
    if (!isTagCreatorOpen) {
      return;
    }
    requestAnimationFrame(() => tagInputRef.current?.focus());
  }, [isDesktopDialogViewport, isTagCreatorOpen, mobile]);

  function closeListCreatorAndFocusButton() {
    onRequestCreateList?.();
    requestAnimationFrame(() => listCreateButtonRef.current?.focus());
  }

  function closeTagCreatorAndFocusButton() {
    onRequestCreateTag?.();
    requestAnimationFrame(() => tagCreateButtonRef.current?.focus());
  }

  const resolvedCounts: Record<TaskView, number> = {
    all: viewCounts?.all ?? totalCount,
    pending: viewCounts?.pending ?? todayCount,
    completed: viewCounts?.completed ?? 0,
    today: viewCounts?.today ?? 0,
    upcoming: viewCounts?.upcoming ?? 0,
  };
  const shouldUseSheetCreator = mobile || !isDesktopDialogViewport;
  const shouldUseSideSheet = !mobile || isLandscapeViewport;

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
      {collapsed ? <SidebarSectionDivider collapsed /> : null}

      <div className={`todo-sidebar-scroll flex-1 overflow-y-auto overscroll-contain ${mobile ? "pt-2" : ""}`}>
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
        <SidebarSectionDivider collapsed={collapsed} />

        <section className="space-y-1.5">
          {!collapsed ? (
            <div className="flex items-center justify-between px-2">
              <p className="text-xs font-semibold tracking-[0.1em] text-slate-500" aria-hidden>
                LISTS
              </p>
              <div className="flex items-center gap-1">
                {hasListFilter ? (
                  <button
                    type="button"
                    onClick={onClearListFilter}
                    aria-label="Quitar filtro de listas"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white/70 text-slate-500 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-black/20 hover:bg-white hover:text-slate-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 active:translate-y-0 active:scale-[0.98]"
                  >
                    <ClearIcon />
                  </button>
                ) : null}
                <button
                  ref={listCreateButtonRef}
                  type="button"
                  onClick={onRequestCreateList}
                  aria-label="Nueva lista"
                  aria-pressed={isListCreatorOpen}
                  className={`group relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white/70 text-slate-600 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-black/20 hover:bg-white hover:text-slate-900 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 active:translate-y-0 active:scale-[0.98] ${
                    isListCreatorOpen ? "border-black/20 bg-white text-slate-900 shadow-sm" : ""
                  }`}
                >
                  <span className="pointer-events-none h-5 w-5 shrink-0">
                    <PlusIcon />
                  </span>
                </button>
              </div>
            </div>
          ) : null}
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
                  } ${collapsed ? "mx-auto h-12 w-12 justify-center px-0" : "gap-3 px-3 py-2.5"}`}
                >
                  <span className="relative">
                    <NavIcon icon={<FolderIcon />} active={isActive} />
                    <span
                      className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-white"
                      style={{ backgroundColor: list.color ?? "#f87171" }}
                      aria-hidden
                    />
                    {collapsed ? (
                      <NavBadge value={list.count > 99 ? "99+" : list.count} />
                    ) : null}
                  </span>
                  {collapsed ? null : (
                    <>
                      <span className="min-w-0 truncate">{list.name}</span>
                      <span className="ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-2 text-[11px] font-semibold text-slate-500">
                        {list.count}
                      </span>
                    </>
                  )}
                  {collapsed ? <span className="ui-rail-tooltip">{list.name}</span> : null}
                </button>
              );
            })
          )}
          {collapsed ? (
            <div className="flex justify-center pt-1">
              <button
                ref={listCreateButtonRef}
                type="button"
                onClick={onRequestCreateList}
                aria-label="Nueva lista"
                aria-pressed={isListCreatorOpen}
                title="New list"
                className={`group relative inline-flex items-center justify-center rounded-xl border border-black/10 bg-white/70 text-slate-600 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-black/20 hover:bg-white hover:text-slate-900 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 active:translate-y-0 active:scale-[0.98] ${
                  isListCreatorOpen ? "border-black/20 bg-white text-slate-900 shadow-sm" : ""
                } h-12 w-12`}
              >
                <span className="pointer-events-none h-5 w-5 shrink-0">
                  <PlusIcon />
                </span>
                <span className="ui-rail-tooltip">New list</span>
              </button>
            </div>
          ) : null}
        </section>
        <SidebarSectionDivider collapsed={collapsed} />

        <section className="space-y-2">
          {!collapsed ? (
            <div className="flex items-center justify-between px-2">
              <p className="text-xs font-semibold tracking-[0.1em] text-slate-500" aria-hidden>
                TAGS
              </p>
              <div className="flex items-center gap-1">
                {hasTagFilter ? (
                  <button
                    type="button"
                    onClick={onClearTagFilter}
                    aria-label="Quitar filtro de etiquetas"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white/70 text-slate-500 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-black/20 hover:bg-white hover:text-slate-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 active:translate-y-0 active:scale-[0.98]"
                  >
                    <ClearIcon />
                  </button>
                ) : null}
                <button
                  ref={tagCreateButtonRef}
                  type="button"
                  onClick={onRequestCreateTag}
                  aria-label="Nueva etiqueta"
                  aria-pressed={isTagCreatorOpen}
                  className={`group relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white/70 text-slate-600 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-black/20 hover:bg-white hover:text-slate-900 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 active:translate-y-0 active:scale-[0.98] ${
                    isTagCreatorOpen ? "border-black/20 bg-white text-slate-900 shadow-sm" : ""
                  }`}
                >
                  <span className="pointer-events-none h-5 w-5 shrink-0">
                    <PlusIcon />
                  </span>
                </button>
              </div>
            </div>
          ) : null}
          <div className={`flex flex-wrap gap-2 ${collapsed ? "justify-center" : ""}`}>
            {tags.slice(0, 4).map((tag, index) => (
              (() => {
                const isActive = activeTagId === tag.id;
                const chipColor = getTagChipColor(tag.color, index);
                const isLightChip = isLightTagColor(chipColor);
                const chipTextClass = isLightChip ? "text-slate-900" : "text-white";
                const chipBorderClass = isLightChip ? "border-black/10" : "border-white/30";
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-label={tag.name}
                    title={collapsed ? tag.name : undefined}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => onSelectTag?.(isActive ? null : tag.id)}
                    className={`group inline-flex items-center rounded-full border text-sm font-medium transition-all duration-200 ease-out hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 active:translate-y-0 active:scale-[0.99] ${
                      isActive
                        ? `${chipBorderClass} shadow-sm`
                        : `${chipBorderClass} shadow-sm hover:brightness-[0.98]`
                    } ${collapsed ? "h-12 w-12 justify-center px-0" : "gap-2 px-3 py-1.5"}`}
                    style={{
                      backgroundColor: chipColor,
                      color: isLightChip ? "#0f172a" : "#ffffff",
                    }}
                  >
                    {collapsed ? (
                      <NavIcon
                        icon={<TagIcon />}
                        active={isActive}
                        className={
                          isActive
                            ? `h-10 w-10 shadow-none ${isLightChip ? "bg-black/5 text-slate-900" : "bg-white/20 text-white"}`
                            : `h-10 w-10 shadow-none ${
                                isLightChip
                                  ? "bg-transparent text-slate-900 group-hover:bg-black/5 group-hover:text-slate-900"
                                  : "bg-white/10 text-white group-hover:bg-white/15 group-hover:text-white"
                              }`
                        }
                      />
                    ) : (
                      <>
                        <TagIcon className={`h-4 w-4 shrink-0 opacity-90 ${chipTextClass}`} />
                        <span className={`leading-none ${chipTextClass}`}>{tag.name}</span>
                      </>
                    )}
                    {collapsed ? <span className="ui-rail-tooltip">{tag.name}</span> : null}
                  </button>
                );
              })()
            ))}
          </div>
          {collapsed ? (
            <div className="flex justify-center pt-1">
              <button
                ref={tagCreateButtonRef}
                type="button"
                onClick={onRequestCreateTag}
                aria-label="Nueva etiqueta"
                aria-pressed={isTagCreatorOpen}
                title="New tag"
                className={`group relative inline-flex h-12 w-12 items-center justify-center rounded-xl border border-black/10 bg-white/70 text-slate-600 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-black/20 hover:bg-white hover:text-slate-900 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 active:translate-y-0 active:scale-[0.98] ${
                  isTagCreatorOpen ? "border-black/20 bg-white text-slate-900 shadow-sm" : ""
                }`}
              >
                <span className="pointer-events-none h-5 w-5 shrink-0">
                  <PlusIcon />
                </span>
                <span className="ui-rail-tooltip">New tag</span>
              </button>
            </div>
          ) : null}
        </section>
      </div>

      {!mobile && isDesktopDialogViewport && isListCreatorOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6" role="presentation">
          <button
            type="button"
            aria-label="Cerrar creación de lista"
            className="ui-overlay-fade-in absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={closeListCreatorAndFocusButton}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-list-title"
            aria-describedby="create-list-description"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => handleCreatorKeyDown(event, closeListCreatorAndFocusButton)}
            className="ui-dialog-scale-in relative z-[1] w-full max-w-lg rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-[0_34px_80px_-38px_rgb(15_23_42/0.72)] backdrop-blur-sm transition-all duration-200 ease-out md:p-7"
          >
            <button
              type="button"
              onClick={closeListCreatorAndFocusButton}
              aria-label="Cancelar nueva lista"
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white/80 text-slate-600 transition-all duration-200 ease-out hover:border-black/20 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 active:scale-[0.98] md:right-5 md:top-5"
            >
              <ClearIcon className="h-4 w-4" />
            </button>
            <div className="pr-11">
              <h3 id="create-list-title" className="text-2xl font-semibold tracking-tight text-slate-900">
                Create new list
              </h3>
              <p id="create-list-description" className="mt-1.5 text-sm text-slate-500">
                Give your list a clear name and choose a color to recognize it quickly.
              </p>
            </div>
            <form onSubmit={onCreateListSubmit} aria-busy={isCreatingDisabled} className="mt-6 space-y-5">
              <Input
                ref={listInputRef}
                value={listDraftName}
                onChange={(event) => onListDraftNameChange?.(event.target.value)}
                placeholder="List name"
                className="h-11 min-h-11 rounded-xl border border-black/10 bg-white/70 px-3.5 text-base"
              />
              <div className="flex flex-wrap items-end justify-between gap-3">
                <label className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-700">
                  <span>Color</span>
                  <input
                    type="color"
                    value={listDraftColor}
                    onChange={(event) => onListDraftColorChange?.(event.target.value)}
                    className="h-11 w-14 cursor-pointer rounded-xl border border-black/10 bg-white p-1"
                    aria-label="Color de lista"
                  />
                </label>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeListCreatorAndFocusButton}
                    className="ui-btn ui-btn--secondary h-11 min-h-11 rounded-xl px-4 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingDisabled || !listDraftName.trim()}
                    className="ui-btn ui-btn--primary h-11 min-h-11 rounded-xl px-5 text-sm"
                  >
                    Create
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {!mobile && isDesktopDialogViewport && isTagCreatorOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6" role="presentation">
          <button
            type="button"
            aria-label="Cerrar creación de etiqueta"
            className="ui-overlay-fade-in absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={closeTagCreatorAndFocusButton}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-tag-title"
            aria-describedby="create-tag-description"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => handleCreatorKeyDown(event, closeTagCreatorAndFocusButton)}
            className="ui-dialog-scale-in relative z-[1] w-full max-w-lg rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-[0_34px_80px_-38px_rgb(15_23_42/0.72)] backdrop-blur-sm transition-all duration-200 ease-out md:p-7"
          >
            <button
              type="button"
              onClick={closeTagCreatorAndFocusButton}
              aria-label="Cancelar nueva etiqueta"
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white/80 text-slate-600 transition-all duration-200 ease-out hover:border-black/20 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 active:scale-[0.98] md:right-5 md:top-5"
            >
              <ClearIcon className="h-4 w-4" />
            </button>
            <div className="pr-11">
              <h3 id="create-tag-title" className="text-2xl font-semibold tracking-tight text-slate-900">
                Create new tag
              </h3>
              <p id="create-tag-description" className="mt-1.5 text-sm text-slate-500">
                Add a short label and color so you can categorize tasks faster.
              </p>
            </div>
            <form onSubmit={onCreateTagSubmit} aria-busy={isCreatingDisabled} className="mt-6 space-y-5">
              <Input
                ref={tagInputRef}
                value={tagDraftName}
                onChange={(event) => onTagDraftNameChange?.(event.target.value)}
                placeholder="Tag name"
                className="h-11 min-h-11 rounded-xl border border-black/10 bg-white/70 px-3.5 text-base"
              />
              <div className="flex flex-wrap items-end justify-between gap-3">
                <label className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-700">
                  <span>Color</span>
                  <input
                    type="color"
                    value={tagDraftColor}
                    onChange={(event) => onTagDraftColorChange?.(event.target.value)}
                    className="h-11 w-14 cursor-pointer rounded-xl border border-black/10 bg-white p-1"
                    aria-label="Color de etiqueta"
                  />
                </label>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeTagCreatorAndFocusButton}
                    className="ui-btn ui-btn--secondary h-11 min-h-11 rounded-xl px-4 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingDisabled || !tagDraftName.trim()}
                    className="ui-btn ui-btn--accent h-11 min-h-11 rounded-xl px-5 text-sm"
                  >
                    Create
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {shouldUseSheetCreator && isListCreatorOpen ? (
        <div className="fixed inset-0 z-[130]" role="presentation">
          <button
            type="button"
            aria-label="Cerrar creación de lista"
            className="ui-overlay-fade-in absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={closeListCreatorAndFocusButton}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-list-sheet-title"
            aria-describedby="create-list-sheet-description"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => handleCreatorKeyDown(event, closeListCreatorAndFocusButton)}
            className={`absolute z-[1] border-slate-200/80 bg-white/95 shadow-[0_22px_56px_-36px_rgb(15_23_42/0.72)] backdrop-blur-sm transition-all duration-200 ease-out ${
              shouldUseSideSheet
                ? "ui-sheet-in-right inset-y-0 right-0 h-full w-full max-w-md border-l"
                : "ui-sheet-in-up inset-0 h-full w-full border-t"
            }`}
          >
            <div className="flex h-full flex-col overflow-y-auto px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3
                    id="create-list-sheet-title"
                    className="text-2xl font-semibold tracking-tight text-slate-900"
                  >
                    Create new list
                  </h3>
                  <p id="create-list-sheet-description" className="mt-1.5 text-sm text-slate-500">
                    Add a list name and color to keep your tasks organized.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeListCreatorAndFocusButton}
                  aria-label="Cancelar nueva lista"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white/80 text-slate-600 transition-all duration-200 ease-out hover:border-black/20 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 active:scale-[0.98]"
                >
                  <ClearIcon className="h-4 w-4" />
                </button>
              </div>
              <form
                onSubmit={onCreateListSubmit}
                aria-busy={isCreatingDisabled}
                className="mt-6 flex h-full flex-col gap-5"
              >
                <Input
                  ref={listInputRef}
                  value={listDraftName}
                  onChange={(event) => onListDraftNameChange?.(event.target.value)}
                  placeholder="List name"
                  className="h-11 min-h-11 rounded-xl border border-black/10 bg-white/70 px-3.5 text-base"
                />
                <label className="inline-flex w-fit items-center gap-2.5 text-sm font-medium text-slate-700">
                  <span>Color</span>
                  <input
                    type="color"
                    value={listDraftColor}
                    onChange={(event) => onListDraftColorChange?.(event.target.value)}
                    className="h-11 w-14 cursor-pointer rounded-xl border border-black/10 bg-white p-1"
                    aria-label="Color de lista"
                  />
                </label>
                <div className={`mt-auto grid grid-cols-1 gap-2 ${shouldUseSideSheet ? "sm:grid-cols-2" : ""}`}>
                  <button
                    type="button"
                    onClick={closeListCreatorAndFocusButton}
                    className="ui-btn ui-btn--secondary h-11 min-h-11 w-full rounded-xl px-4 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingDisabled || !listDraftName.trim()}
                    className="ui-btn ui-btn--primary h-11 min-h-11 w-full rounded-xl px-5 text-sm"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {shouldUseSheetCreator && isTagCreatorOpen ? (
        <div className="fixed inset-0 z-[130]" role="presentation">
          <button
            type="button"
            aria-label="Cerrar creación de etiqueta"
            className="ui-overlay-fade-in absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={closeTagCreatorAndFocusButton}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-tag-sheet-title"
            aria-describedby="create-tag-sheet-description"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => handleCreatorKeyDown(event, closeTagCreatorAndFocusButton)}
            className={`absolute z-[1] border-slate-200/80 bg-white/95 shadow-[0_22px_56px_-36px_rgb(15_23_42/0.72)] backdrop-blur-sm transition-all duration-200 ease-out ${
              shouldUseSideSheet
                ? "ui-sheet-in-right inset-y-0 right-0 h-full w-full max-w-md border-l"
                : "ui-sheet-in-up inset-0 h-full w-full border-t"
            }`}
          >
            <div className="flex h-full flex-col overflow-y-auto px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 id="create-tag-sheet-title" className="text-2xl font-semibold tracking-tight text-slate-900">
                    Create new tag
                  </h3>
                  <p id="create-tag-sheet-description" className="mt-1.5 text-sm text-slate-500">
                    Add a short tag and color so it is easy to spot in your task list.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeTagCreatorAndFocusButton}
                  aria-label="Cancelar nueva etiqueta"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white/80 text-slate-600 transition-all duration-200 ease-out hover:border-black/20 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 active:scale-[0.98]"
                >
                  <ClearIcon className="h-4 w-4" />
                </button>
              </div>
              <form
                onSubmit={onCreateTagSubmit}
                aria-busy={isCreatingDisabled}
                className="mt-6 flex h-full flex-col gap-5"
              >
                <Input
                  ref={tagInputRef}
                  value={tagDraftName}
                  onChange={(event) => onTagDraftNameChange?.(event.target.value)}
                  placeholder="Tag name"
                  className="h-11 min-h-11 rounded-xl border border-black/10 bg-white/70 px-3.5 text-base"
                />
                <label className="inline-flex w-fit items-center gap-2.5 text-sm font-medium text-slate-700">
                  <span>Color</span>
                  <input
                    type="color"
                    value={tagDraftColor}
                    onChange={(event) => onTagDraftColorChange?.(event.target.value)}
                    className="h-11 w-14 cursor-pointer rounded-xl border border-black/10 bg-white p-1"
                    aria-label="Color de etiqueta"
                  />
                </label>
                <div className={`mt-auto grid grid-cols-1 gap-2 ${shouldUseSideSheet ? "sm:grid-cols-2" : ""}`}>
                  <button
                    type="button"
                    onClick={closeTagCreatorAndFocusButton}
                    className="ui-btn ui-btn--secondary h-11 min-h-11 w-full rounded-xl px-4 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingDisabled || !tagDraftName.trim()}
                    className="ui-btn ui-btn--accent h-11 min-h-11 w-full rounded-xl px-5 text-sm"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
