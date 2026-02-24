type IcsTask = {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  isCompleted: boolean;
  updatedAt: Date;
};

function formatDateUtc(value: Date) {
  const year = value.getUTCFullYear();
  const month = `${value.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${value.getUTCDate()}`.padStart(2, "0");
  const hour = `${value.getUTCHours()}`.padStart(2, "0");
  const minute = `${value.getUTCMinutes()}`.padStart(2, "0");
  const second = `${value.getUTCSeconds()}`.padStart(2, "0");

  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

function escapeIcsText(input: string) {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function buildIcsCalendar(tasks: IcsTask[]) {
  const nowStamp = formatDateUtc(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Todo Studio//Local//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Todo Studio Tasks",
  ];

  for (const task of tasks) {
    const start = task.dueDate;
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const summary = escapeIcsText(task.title);
    const description = escapeIcsText(
      `${task.description || "Sin descripción"}\nPrioridad: ${task.priority}\nEstado: ${task.status}`,
    );

    lines.push(
      "BEGIN:VEVENT",
      `UID:task-${task.id}@todo-studio.local`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${formatDateUtc(start)}`,
      `DTEND:${formatDateUtc(end)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LAST-MODIFIED:${formatDateUtc(task.updatedAt)}`,
      `STATUS:${task.isCompleted ? "COMPLETED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  return `${lines.join("\r\n")}\r\n`;
}
