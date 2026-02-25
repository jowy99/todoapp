import { CSSProperties, ReactNode } from "react";

type AppShellProps = {
  sidebar: ReactNode;
  main: ReactNode;
  detail: ReactNode;
  sidebarWidth?: string;
  showDetail?: boolean;
};

export function AppShell({
  sidebar,
  main,
  detail,
  sidebarWidth = "280px",
  showDetail = false,
}: AppShellProps) {
  return (
    <section
      aria-label="App shell"
      className={`todo-shell w-full max-w-none min-w-0 ${showDetail ? "todo-shell--detail" : ""}`}
      style={{ "--todo-sidebar-width": sidebarWidth } as CSSProperties}
    >
      <aside className="todo-shell-col todo-shell-sidebar">{sidebar}</aside>
      <main className="todo-shell-col todo-shell-main">{main}</main>
      <aside className="todo-shell-col todo-shell-detail">{detail}</aside>
    </section>
  );
}
