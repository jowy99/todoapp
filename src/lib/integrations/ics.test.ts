import { describe, expect, it } from "vitest";
import { buildIcsCalendar } from "./ics";

describe("buildIcsCalendar", () => {
  it("builds a valid VCALENDAR payload with escaped fields", () => {
    const output = buildIcsCalendar([
      {
        id: "task_1",
        title: "Call, Team; Weekly",
        description: "Line 1\nLine 2",
        dueDate: new Date("2026-03-01T10:00:00.000Z"),
        priority: "HIGH",
        status: "IN_PROGRESS",
        isCompleted: false,
        updatedAt: new Date("2026-03-01T09:30:00.000Z"),
      },
    ]);

    expect(output).toContain("BEGIN:VCALENDAR");
    expect(output).toContain("END:VCALENDAR");
    expect(output).toContain("BEGIN:VEVENT");
    expect(output).toContain("UID:task-task_1@todo-studio.local");
    expect(output).toContain("SUMMARY:Call\\, Team\\; Weekly");
    expect(output).toContain("DESCRIPTION:Line 1\\nLine 2\\nPrioridad: HIGH\\nEstado: IN_PROGRESS");
    expect(output).toContain("STATUS:CONFIRMED");
  });

  it("marks completed tasks as completed in ICS status", () => {
    const output = buildIcsCalendar([
      {
        id: "task_2",
        title: "Done task",
        description: "",
        dueDate: new Date("2026-03-01T10:00:00.000Z"),
        priority: "LOW",
        status: "DONE",
        isCompleted: true,
        updatedAt: new Date("2026-03-01T09:30:00.000Z"),
      },
    ]);

    expect(output).toContain("STATUS:COMPLETED");
  });
});
