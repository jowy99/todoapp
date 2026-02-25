import "dotenv/config";
import bcrypt from "bcryptjs";
import {
  CollaboratorRole,
  Prisma,
  PrismaClient,
  TaskActivityType,
  TaskPriority,
  TaskStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_USER_EMAILS = ["demo@local.dev", "demo.team@local.dev", "demo.ops@local.dev"];

const LIST_CATALOG = [
  "Inbox",
  "Trabajo",
  "Personal",
  "Salud",
  "Finanzas",
  "Casa",
  "Estudios",
  "Viajes",
  "Side Projects",
  "Compras",
  "Familia",
  "Fitness",
  "Admin",
  "Errands",
  "Planificacion",
  "Reuniones",
  "Objetivos",
  "Contenido",
  "Lectura",
  "Mantenimiento",
  "Aprendizaje",
  "Freelance",
  "Ideas",
  "Roadmap",
  "Soporte",
  "Marketing",
  "Clientes",
  "Backlog",
] as const;

const TAG_CATALOG = [
  "Urgente",
  "Email",
  "Llamar",
  "Deep Work",
  "Review",
  "Compra",
  "Errands",
  "Admin",
  "Finanzas",
  "Factura",
  "Impuestos",
  "Salud",
  "Workout",
  "Comida",
  "Familia",
  "Amigos",
  "Viaje",
  "Research",
  "UI",
  "Backend",
  "Bug",
  "Feature",
  "Refactor",
  "Meeting",
  "1:1",
  "Sprint",
  "QA",
  "Documentacion",
  "Pago",
  "Suscripcion",
  "Casa",
  "Limpieza",
  "Medico",
  "Rutina",
  "Lectura",
  "Estudio",
  "Marketing",
  "Contenido",
  "Social",
  "Cliente",
  "Personal",
  "Work",
  "Quick Win",
  "Low Energy",
  "Focus",
  "Weekend",
  "Commuting",
  "Offline",
  "Online",
  "Waiting",
  "Follow-up",
  "Delegar",
  "Idea",
  "Roadmap",
  "Ops",
  "Security",
  "Infra",
  "Legal",
  "Recurring",
  "Calendar",
] as const;

const COLOR_PALETTE = [
  "#4f46e5",
  "#0f766e",
  "#be123c",
  "#d97706",
  "#0891b2",
  "#7c3aed",
  "#2563eb",
  "#ea580c",
  "#4d7c0f",
  "#64748b",
  "#059669",
  "#9333ea",
] as const;

type SeedMode = "replace" | "append";

type SeedConfig = {
  seedText: string;
  mode: SeedMode;
  defaultPassword: string;
  userEmails: string[];
  listCount: number;
  tagCount: number;
  taskCount: number;
  monthsBack: number;
  futureDays: number;
  recurringRatio: number;
  commentRatio: number;
  collaborationRatio: number;
};

type SeedUser = {
  id: string;
  email: string;
  displayName: string;
};

type SeedList = {
  id: string;
  name: string;
  color: string | null;
  ownerId: string;
};

type SeedTag = {
  id: string;
  name: string;
  color: string | null;
  ownerId: string;
};

type UserSeedContext = {
  user: SeedUser;
  lists: SeedList[];
  tags: SeedTag[];
  taskTarget: number;
  collaboratorsByListId: Map<string, string[]>;
};

type GeneratedTask = {
  row: Prisma.TaskCreateManyInput;
  tagIds: string[];
};

type CliArgs = Record<string, string>;

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function parseCliArgs(argv: string[]) {
  const args: CliArgs = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      continue;
    }
    const [rawKey, ...rest] = arg.slice(2).split("=");
    if (!rawKey) {
      continue;
    }
    args[rawKey] = rest.length > 0 ? rest.join("=") : "true";
  }
  return args;
}

function parseCsv(value: string | undefined, fallback: string[]) {
  if (!value) {
    return fallback;
  }
  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

function parseNumber(value: string | undefined, fallback: number, min: number, max: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return clamp(Math.floor(parsed), min, max);
}

function parseFloatNumber(value: string | undefined, fallback: number, min: number, max: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return clamp(parsed, min, max);
}

function parseMode(value: string | undefined): SeedMode {
  return value === "append" ? "append" : "replace";
}

function hashStringToInt(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashStringToSlug(value: string) {
  return hashStringToInt(value).toString(36).slice(0, 8);
}

function mulberry32(seed: number) {
  let current = seed >>> 0;
  return () => {
    current = (current + 0x6d2b79f5) >>> 0;
    let t = Math.imul(current ^ (current >>> 15), 1 | current);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Random {
  private readonly nextFn: () => number;

  constructor(seedText: string) {
    const seed = hashStringToInt(seedText) || 1;
    this.nextFn = mulberry32(seed);
  }

  next() {
    return this.nextFn();
  }

  chance(probability: number) {
    return this.next() < probability;
  }

  int(min: number, max: number) {
    if (max <= min) {
      return min;
    }
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(values: T[]) {
    return values[this.int(0, values.length - 1)];
  }

  shuffle<T>(values: T[]) {
    const copy = [...values];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = this.int(0, index);
      const swapValue = copy[index];
      copy[index] = copy[swapIndex];
      copy[swapIndex] = swapValue;
    }
    return copy;
  }
}

function addDays(date: Date, amount: number) {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + amount);
  return shifted;
}

function addHours(date: Date, amount: number) {
  const shifted = new Date(date);
  shifted.setHours(shifted.getHours() + amount);
  return shifted;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function diffDays(later: Date, earlier: Date) {
  return Math.floor((later.getTime() - earlier.getTime()) / DAY_MS);
}

function toDisplayName(email: string) {
  const localPart = email.split("@")[0] ?? "demo";
  const cleaned = localPart.replace(/[._-]+/g, " ").trim();
  const words = cleaned.split(" ").filter(Boolean);
  const normalized = words.length > 0 ? words : ["demo", "user"];
  return normalized.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function buildSeedConfig() {
  const args = parseCliArgs(process.argv.slice(2));
  const seedText = args.seed ?? process.env.SEED_VALUE ?? "todo-app-yearly-usage";
  const mode = parseMode(args.mode ?? process.env.SEED_MODE);
  const defaultPassword = args.password ?? process.env.SEED_DEFAULT_PASSWORD ?? "Demo12345!";
  const userEmails = parseCsv(args.users ?? process.env.SEED_USER_EMAILS, [...DEFAULT_USER_EMAILS]);
  const listCount = parseNumber(args.lists ?? process.env.SEED_LIST_COUNT, 18, 12, 25);
  const tagCount = parseNumber(args.tags ?? process.env.SEED_TAG_COUNT, 45, 30, 60);
  const taskCount = parseNumber(args.tasks ?? process.env.SEED_TASK_COUNT, 2400, 100, 50000);
  const monthsBack = parseNumber(args.months ?? process.env.SEED_MONTHS_BACK, 12, 3, 24);
  const futureDays = parseNumber(args.future ?? process.env.SEED_FUTURE_DAYS, 45, 0, 120);
  const recurringRatio = parseFloatNumber(
    args.recurringRatio ?? process.env.SEED_RECURRING_RATIO,
    0.22,
    0.1,
    0.45,
  );
  const commentRatio = parseFloatNumber(args.commentRatio ?? process.env.SEED_COMMENT_RATIO, 0.16, 0, 0.5);
  const collaborationRatio = parseFloatNumber(
    args.collaborationRatio ?? process.env.SEED_COLLABORATION_RATIO,
    0.12,
    0,
    0.4,
  );

  return {
    seedText,
    mode,
    defaultPassword,
    userEmails,
    listCount,
    tagCount,
    taskCount,
    monthsBack,
    futureDays,
    recurringRatio,
    commentRatio,
    collaborationRatio,
  } satisfies SeedConfig;
}

function distributeTaskCounts(totalTasks: number, userCount: number) {
  if (userCount <= 1) {
    return [totalTasks];
  }

  const firstUserTasks = Math.max(1, Math.round(totalTasks * 0.7));
  const remaining = Math.max(0, totalTasks - firstUserTasks);
  const counts = [firstUserTasks];
  for (let index = 1; index < userCount; index += 1) {
    const leftUsers = userCount - index;
    const current = leftUsers === 1 ? remaining - counts.slice(1).reduce((sum, value) => sum + value, 0) : Math.floor(remaining / (userCount - 1));
    counts.push(Math.max(1, current));
  }
  const sum = counts.reduce((acc, value) => acc + value, 0);
  if (sum !== totalTasks) {
    counts[counts.length - 1] += totalTasks - sum;
  }
  return counts;
}

function pickListNames(rng: Random, count: number) {
  const nonInbox = LIST_CATALOG.filter((name) => name !== "Inbox");
  const shuffled = rng.shuffle(nonInbox);
  return ["Inbox", ...shuffled].slice(0, count);
}

function pickTagNames(rng: Random, count: number) {
  const required = ["Urgente", "Review", "Admin", "Recurring", "Meeting", "Finanzas", "Deep Work"];
  const remaining = TAG_CATALOG.filter((name) => !required.includes(name));
  const names = [...required, ...rng.shuffle(remaining)];
  const selected = names.slice(0, count);
  if (selected.length >= count) {
    return selected;
  }
  const extra: string[] = [];
  while (selected.length + extra.length < count) {
    extra.push(`Tag ${selected.length + extra.length + 1}`);
  }
  return [...selected, ...extra];
}

function pickTagIdsForTask(
  rng: Random,
  tags: SeedTag[],
  title: string,
  listName: string | null,
  isRecurring: boolean,
) {
  const normalizedTitle = normalize(title);
  const normalizedList = listName ? normalize(listName) : "";
  const selected = new Set<string>();

  if (isRecurring) {
    const recurringTag = tags.find((tag) => normalize(tag.name) === "recurring");
    if (recurringTag) {
      selected.add(recurringTag.id);
    }
  }

  const smartTagMatches = [
    { keyword: "review", tagKeyword: "review" },
    { keyword: "email", tagKeyword: "email" },
    { keyword: "call", tagKeyword: "llamar" },
    { keyword: "factura", tagKeyword: "factura" },
    { keyword: "rent", tagKeyword: "finanzas" },
    { keyword: "gym", tagKeyword: "workout" },
    { keyword: "meeting", tagKeyword: "meeting" },
    { keyword: "sync", tagKeyword: "meeting" },
  ];

  for (const match of smartTagMatches) {
    if (!normalizedTitle.includes(match.keyword) && !normalizedList.includes(match.keyword)) {
      continue;
    }
    const tag = tags.find((entry) => normalize(entry.name).includes(match.tagKeyword));
    if (tag) {
      selected.add(tag.id);
    }
  }

  const distributionRoll = rng.next();
  let targetCount = 0;
  if (distributionRoll < 0.30) {
    targetCount = 0;
  } else if (distributionRoll < 0.58) {
    targetCount = 1;
  } else if (distributionRoll < 0.8) {
    targetCount = 2;
  } else if (distributionRoll < 0.94) {
    targetCount = 3;
  } else {
    targetCount = 4;
  }

  while (selected.size < targetCount) {
    selected.add(rng.pick(tags).id);
  }

  return [...selected];
}

function samplePriority(rng: Random) {
  const roll = rng.next();
  if (roll < 0.06) {
    return TaskPriority.URGENT;
  }
  if (roll < 0.24) {
    return TaskPriority.HIGH;
  }
  if (roll < 0.68) {
    return TaskPriority.MEDIUM;
  }
  return TaskPriority.LOW;
}

function completionProbability(dueDate: Date | null, today: Date, isRecurring: boolean) {
  const recurringBoost = isRecurring ? 0.07 : 0;
  if (!dueDate) {
    return clamp(0.46 + recurringBoost, 0, 0.96);
  }

  const age = diffDays(today, dueDate);
  if (age > 180) {
    return clamp(0.88 + recurringBoost, 0, 0.97);
  }
  if (age > 90) {
    return clamp(0.8 + recurringBoost, 0, 0.96);
  }
  if (age > 30) {
    return clamp(0.72 + recurringBoost, 0, 0.93);
  }
  if (age > 7) {
    return clamp(0.58 + recurringBoost, 0, 0.86);
  }
  if (age > -7) {
    return clamp(0.42 + recurringBoost, 0, 0.8);
  }
  return clamp(0.24 + recurringBoost, 0, 0.7);
}

function sampleStatus(rng: Random, isCompleted: boolean) {
  if (isCompleted) {
    return TaskStatus.DONE;
  }
  return rng.chance(0.28) ? TaskStatus.IN_PROGRESS : TaskStatus.TODO;
}

function sampleDueDate(rng: Random, today: Date, config: SeedConfig) {
  if (rng.chance(0.18)) {
    return null;
  }

  const minOffset = -config.monthsBack * 30;
  const maxOffset = config.futureDays;
  let selectedOffset = rng.int(minOffset, maxOffset);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidateOffset = rng.int(minOffset, maxOffset);
    const candidateDate = addDays(today, candidateOffset);
    const dayOfWeek = candidateDate.getDay();
    const weekdayWeight = dayOfWeek === 0 || dayOfWeek === 6 ? 0.54 : 1;
    const recencyWeight = candidateOffset > -45 ? 1 : candidateOffset > -180 ? 0.84 : 0.7;
    const acceptProbability = Math.min(1, weekdayWeight * recencyWeight);
    if (rng.chance(acceptProbability)) {
      selectedOffset = candidateOffset;
      break;
    }
  }

  const dueDate = addDays(today, selectedOffset);
  if (rng.chance(0.14)) {
    dueDate.setHours(0, 0, 0, 0);
    return dueDate;
  }

  const hours = [8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19];
  const minutes = [0, 0, 15, 30, 30, 45];
  dueDate.setHours(rng.pick(hours), rng.pick(minutes), 0, 0);
  return dueDate;
}

function taskTitleForRandom(rng: Random, listName: string | null) {
  const actions = [
    "Preparar",
    "Revisar",
    "Enviar",
    "Actualizar",
    "Planificar",
    "Organizar",
    "Completar",
    "Investigar",
    "Coordinar",
    "Resolver",
  ];
  const subjects = [
    "informe",
    "propuesta",
    "presupuesto",
    "agenda",
    "seguimiento",
    "presentacion",
    "correo pendiente",
    "checklist de lanzamiento",
    "backlog",
    "nota de reunion",
    "documentacion",
    "plan semanal",
  ];
  const contexts = [
    "del cliente",
    "del sprint",
    "de esta semana",
    "del proyecto principal",
    "para el equipo",
    "de operaciones",
    "de marketing",
    "de la app",
    "de onboarding",
  ];

  const action = rng.pick(actions);
  const subject = rng.pick(subjects);
  const context = rng.pick(contexts);
  const listContext = listName ? ` (${listName})` : "";
  return `${action} ${subject} ${context}${listContext}`;
}

function taskDescriptionForRandom(rng: Random) {
  if (rng.chance(0.43)) {
    return "";
  }

  const snippets = [
    "Bloquear 45-60 min de foco para cerrar este punto sin interrupciones.",
    "Coordinar con el equipo y confirmar dependencias antes de avanzar.",
    "Dejar notas claras para revisar el estado en la weekly.",
    "Priorizar quick wins y mover blockers al final de la tarde.",
    "Alinear alcance con el cliente y validar fecha objetivo.",
    "Agregar evidencia y capturas para no perder contexto.",
  ];

  let description = rng.pick(snippets);
  if (rng.chance(0.24)) {
    const checklist = [
      "Definir siguiente paso",
      "Actualizar estado",
      "Compartir avance",
      "Bloquear tiempo en calendario",
      "Cerrar pendientes menores",
    ];
    description += `\n\nChecklist:\n- ${rng.pick(checklist)}\n- ${rng.pick(checklist)}\n- ${rng.pick(checklist)}`;
  }
  if (rng.chance(0.16)) {
    const links = [
      "https://docs.google.com/document/d/demo-seed-spec",
      "https://linear.app/issue/SEED-123",
      "https://notion.so/seed-data-playbook",
      "https://figma.com/file/demo/calendar-ui",
    ];
    description += `\n\nReferencia: ${rng.pick(links)}`;
  }
  return description;
}

function getListByHint(lists: SeedList[], hints: string[]) {
  for (const hint of hints) {
    const normalizedHint = normalize(hint);
    const match = lists.find((list) => normalize(list.name).includes(normalizedHint));
    if (match) {
      return match;
    }
  }
  return null;
}

type RecurringTemplate = {
  title: string;
  cadence: "weekly" | "monthly";
  weekday?: number;
  dayOfMonth?: number;
  hour: number;
  minute: number;
  priority: TaskPriority;
  listHints: string[];
  tagHints: string[];
};

const RECURRING_TEMPLATES: RecurringTemplate[] = [
  {
    title: "Weekly review",
    cadence: "weekly",
    weekday: 5,
    hour: 16,
    minute: 0,
    priority: TaskPriority.MEDIUM,
    listHints: ["Planificacion", "Trabajo", "Admin"],
    tagHints: ["Review", "Recurring"],
  },
  {
    title: "Project sync",
    cadence: "weekly",
    weekday: 2,
    hour: 10,
    minute: 30,
    priority: TaskPriority.HIGH,
    listHints: ["Reuniones", "Trabajo", "Roadmap"],
    tagHints: ["Meeting", "Recurring"],
  },
  {
    title: "Pay rent",
    cadence: "monthly",
    dayOfMonth: 1,
    hour: 9,
    minute: 0,
    priority: TaskPriority.HIGH,
    listHints: ["Finanzas", "Casa"],
    tagHints: ["Pago", "Finanzas", "Recurring"],
  },
  {
    title: "Gym session",
    cadence: "weekly",
    weekday: 1,
    hour: 19,
    minute: 0,
    priority: TaskPriority.MEDIUM,
    listHints: ["Fitness", "Salud"],
    tagHints: ["Workout", "Recurring"],
  },
  {
    title: "House cleanup",
    cadence: "weekly",
    weekday: 6,
    hour: 11,
    minute: 0,
    priority: TaskPriority.LOW,
    listHints: ["Casa", "Mantenimiento"],
    tagHints: ["Limpieza", "Recurring"],
  },
  {
    title: "Budget check",
    cadence: "monthly",
    dayOfMonth: 15,
    hour: 18,
    minute: 0,
    priority: TaskPriority.MEDIUM,
    listHints: ["Finanzas", "Admin"],
    tagHints: ["Finanzas", "Review", "Recurring"],
  },
  {
    title: "Content planning",
    cadence: "weekly",
    weekday: 3,
    hour: 14,
    minute: 0,
    priority: TaskPriority.MEDIUM,
    listHints: ["Contenido", "Marketing"],
    tagHints: ["Contenido", "Recurring"],
  },
];

function buildRecurringOccurrences(startDate: Date, endDate: Date, rng: Random) {
  const occurrences: Array<{ template: RecurringTemplate; dueDate: Date }> = [];

  for (const template of RECURRING_TEMPLATES) {
    if (template.cadence === "weekly" && typeof template.weekday === "number") {
      let cursor = startOfDay(startDate);
      while (cursor <= endDate) {
        if (cursor.getDay() === template.weekday && rng.chance(0.95)) {
          const dueDate = new Date(cursor);
          dueDate.setHours(template.hour, template.minute, 0, 0);
          occurrences.push({ template, dueDate });
        }
        cursor = addDays(cursor, 1);
      }
      continue;
    }

    if (template.cadence === "monthly" && typeof template.dayOfMonth === "number") {
      let year = startDate.getFullYear();
      let month = startDate.getMonth();
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth();
      while (year < endYear || (year === endYear && month <= endMonth)) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const day = Math.min(template.dayOfMonth, daysInMonth);
        const dueDate = new Date(year, month, day, template.hour, template.minute, 0, 0);
        if (dueDate >= startDate && dueDate <= endDate && rng.chance(0.98)) {
          occurrences.push({ template, dueDate });
        }
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
      }
    }
  }

  return occurrences;
}

function buildTaskSetForUser(
  context: UserSeedContext,
  config: SeedConfig,
  seedSlug: string,
  globalIndexOffset: number,
) {
  const rng = new Random(`${config.seedText}:${context.user.email}:tasks`);
  const today = startOfDay(new Date());
  const rangeStart = addDays(today, -config.monthsBack * 30);
  const rangeEnd = addDays(today, config.futureDays);

  const recurringTarget = Math.round(context.taskTarget * config.recurringRatio);
  const recurringCandidates = buildRecurringOccurrences(rangeStart, rangeEnd, rng);
  const recurringSelected = rng.shuffle(recurringCandidates).slice(0, recurringTarget);

  const generatedTasks: GeneratedTask[] = [];
  const generatedTaskTags: Prisma.TaskTagCreateManyInput[] = [];
  const generatedComments: Prisma.TaskCommentCreateManyInput[] = [];
  const generatedActivities: Prisma.TaskActivityCreateManyInput[] = [];
  let sequence = 0;
  let commentSequence = 0;
  let activitySequence = 0;

  const createTaskId = () => {
    sequence += 1;
    return `seed_${seedSlug}_task_${globalIndexOffset}_${sequence.toString().padStart(6, "0")}`;
  };

  const createCommentId = () => {
    commentSequence += 1;
    return `seed_${seedSlug}_comment_${globalIndexOffset}_${commentSequence.toString().padStart(6, "0")}`;
  };

  const createActivityId = () => {
    activitySequence += 1;
    return `seed_${seedSlug}_activity_${globalIndexOffset}_${activitySequence.toString().padStart(6, "0")}`;
  };

  const createTaskRecord = (params: {
    title: string;
    description: string;
    dueDate: Date | null;
    list: SeedList | null;
    priority: TaskPriority;
    isRecurring: boolean;
  }) => {
    const id = createTaskId();
    const completionChance = completionProbability(params.dueDate, today, params.isRecurring);
    const isCompleted = rng.chance(completionChance);
    const status = sampleStatus(rng, isCompleted);

    let createdAt: Date;
    if (params.dueDate) {
      const leadDays = rng.int(1, 70);
      createdAt = addHours(addDays(params.dueDate, -leadDays), -rng.int(0, 8));
      if (createdAt > today) {
        createdAt = addDays(today, -rng.int(0, 14));
      }
    } else {
      createdAt = addDays(today, -rng.int(0, config.monthsBack * 30));
      createdAt.setHours(rng.int(8, 20), rng.pick([0, 15, 30, 45]), 0, 0);
    }

    let updatedAt = addHours(createdAt, rng.int(2, 180));
    if (params.dueDate && isCompleted) {
      updatedAt = addHours(params.dueDate, rng.int(-6, 36));
    }
    if (updatedAt < createdAt) {
      updatedAt = createdAt;
    }
    if (updatedAt > new Date()) {
      updatedAt = new Date();
    }

    const tags = pickTagIdsForTask(
      rng,
      context.tags,
      params.title,
      params.list?.name ?? null,
      params.isRecurring,
    );

    generatedTasks.push({
      row: {
        id,
        ownerId: context.user.id,
        listId: params.list?.id ?? null,
        title: params.title,
        description: params.description,
        dueDate: params.dueDate,
        priority: params.priority,
        isCompleted,
        status,
        createdAt,
        updatedAt,
      },
      tagIds: tags,
    });

    generatedActivities.push({
      id: createActivityId(),
      taskId: id,
      actorId: context.user.id,
      type: TaskActivityType.TASK_CREATED,
      message: "Task created during demo seed generation.",
      createdAt,
    });

    if (status !== TaskStatus.TODO) {
      generatedActivities.push({
        id: createActivityId(),
        taskId: id,
        actorId: context.user.id,
        type: TaskActivityType.STATUS_CHANGED,
        message: `Status moved to ${status}.`,
        createdAt: updatedAt,
      });
    }

    if (params.description.length > 0 && rng.chance(0.45)) {
      generatedActivities.push({
        id: createActivityId(),
        taskId: id,
        actorId: context.user.id,
        type: TaskActivityType.TASK_UPDATED,
        message: "Task details were updated.",
        createdAt: addHours(createdAt, rng.int(1, 24)),
      });
    }

    if (rng.chance(config.commentRatio)) {
      const collaboratorPool = [context.user.id, ...(context.collaboratorsByListId.get(params.list?.id ?? "") ?? [])];
      const uniqueActors = [...new Set(collaboratorPool)];
      const commentCount = rng.int(1, 3);
      const commentTemplates = [
        "Dejo nota: esto depende de otro bloque y lo reviso al final del dia.",
        "Actualizado con nueva informacion. Falta confirmar con el equipo.",
        "Bloqueado por una dependencia externa, lo retomo manana.",
        "Subi avance parcial y documente siguientes pasos.",
        "Pendiente de aprobacion, pero ya esta listo para QA.",
      ];

      for (let index = 0; index < commentCount; index += 1) {
        const actorId = rng.pick(uniqueActors);
        const createdCommentAt = addHours(createdAt, rng.int(4, 140));
        generatedComments.push({
          id: createCommentId(),
          taskId: id,
          authorId: actorId,
          body: rng.pick(commentTemplates),
          createdAt: createdCommentAt,
          updatedAt: createdCommentAt,
        });
        generatedActivities.push({
          id: createActivityId(),
          taskId: id,
          actorId,
          type: TaskActivityType.COMMENT_ADDED,
          message: "Comment added during collaboration.",
          createdAt: createdCommentAt,
        });
      }
    }
  };

  for (const recurring of recurringSelected) {
    const list = getListByHint(context.lists, recurring.template.listHints) ?? rng.pick(context.lists);
    const tagNames = recurring.template.tagHints;
    const extraDescription = `Recurring: ${tagNames.join(", ")}.`;
    createTaskRecord({
      title: recurring.template.title,
      description: extraDescription,
      dueDate: recurring.dueDate,
      list,
      priority: recurring.template.priority,
      isRecurring: true,
    });
  }

  const remaining = Math.max(0, context.taskTarget - recurringSelected.length);
  for (let index = 0; index < remaining; index += 1) {
    const dueDate = sampleDueDate(rng, today, config);
    const list = rng.chance(0.08) ? null : rng.pick(context.lists);
    createTaskRecord({
      title: taskTitleForRandom(rng, list?.name ?? null),
      description: taskDescriptionForRandom(rng),
      dueDate,
      list,
      priority: samplePriority(rng),
      isRecurring: false,
    });
  }

  for (const task of generatedTasks) {
    for (const tagId of task.tagIds) {
      generatedTaskTags.push({
        taskId: task.row.id as string,
        tagId,
      });
    }
  }

  return {
    tasks: generatedTasks.map((task) => task.row),
    taskTags: generatedTaskTags,
    comments: generatedComments,
    activities: generatedActivities,
  };
}

async function createManyInChunks<T>(
  rows: T[],
  createChunk: (chunk: T[]) => Promise<Prisma.BatchPayload>,
  chunkSize = 500,
) {
  let inserted = 0;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    if (chunk.length === 0) {
      continue;
    }
    const result = await createChunk(chunk);
    inserted += result.count;
  }
  return inserted;
}

async function ensureSeedUsers(config: SeedConfig) {
  const users: SeedUser[] = [];
  const passwordHash = await bcrypt.hash(config.defaultPassword, 12);
  for (const email of config.userEmails) {
    if (config.mode === "replace") {
      try {
        await prisma.user.delete({
          where: { email },
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2025") {
          throw error;
        }
      }
    }

    const displayName = toDisplayName(email);
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        displayName,
        passwordHash,
      },
      create: {
        email,
        passwordHash,
        displayName,
        profile: {
          create: {
            bio: "Cuenta demo para probar volumen realista de tareas.",
            isPublic: false,
          },
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });
    users.push({
      id: user.id,
      email: user.email,
      displayName: user.displayName ?? displayName,
    });
  }
  return users;
}

async function ensureListsForUser(user: SeedUser, config: SeedConfig, rng: Random) {
  const names = pickListNames(rng, config.listCount);
  const lists: SeedList[] = [];
  for (let index = 0; index < names.length; index += 1) {
    const name = names[index];
    const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
    const list = await prisma.list.upsert({
      where: {
        ownerId_name: {
          ownerId: user.id,
          name,
        },
      },
      update: {
        color,
      },
      create: {
        ownerId: user.id,
        name,
        color,
      },
      select: {
        id: true,
        name: true,
        color: true,
        ownerId: true,
      },
    });
    lists.push(list);
  }
  return lists;
}

async function ensureTagsForUser(user: SeedUser, config: SeedConfig, rng: Random) {
  const names = pickTagNames(rng, config.tagCount);
  const tags: SeedTag[] = [];
  for (let index = 0; index < names.length; index += 1) {
    const name = names[index];
    const color = COLOR_PALETTE[(index + 2) % COLOR_PALETTE.length];
    const tag = await prisma.tag.upsert({
      where: {
        ownerId_name: {
          ownerId: user.id,
          name,
        },
      },
      update: {
        color,
      },
      create: {
        ownerId: user.id,
        name,
        color,
      },
      select: {
        id: true,
        name: true,
        color: true,
        ownerId: true,
      },
    });
    tags.push(tag);
  }
  return tags;
}

async function createCollaborations(contexts: UserSeedContext[], config: SeedConfig, seedSlug: string) {
  if (contexts.length <= 1 || config.collaborationRatio <= 0) {
    return 0;
  }

  const rng = new Random(`${seedSlug}:collaboration`);
  const rows: Prisma.ListCollaboratorCreateManyInput[] = [];

  contexts.forEach((ownerContext, ownerIndex) => {
    const candidates = ownerContext.lists.filter((list) => normalize(list.name) !== "inbox");
    const collaboratorUsers = contexts.filter((candidate) => candidate.user.id !== ownerContext.user.id);
    if (candidates.length === 0 || collaboratorUsers.length === 0) {
      return;
    }

    const shareCount = Math.max(1, Math.round(candidates.length * config.collaborationRatio));
    const selectedLists = rng.shuffle(candidates).slice(0, shareCount);
    for (const list of selectedLists) {
      const maxCollaborators = Math.min(3, collaboratorUsers.length);
      const collaboratorCount = rng.int(1, maxCollaborators);
      const selectedCollaborators = rng.shuffle(collaboratorUsers).slice(0, collaboratorCount);
      for (const collaborator of selectedCollaborators) {
        const role = rng.chance(0.35) ? CollaboratorRole.EDITOR : CollaboratorRole.VIEWER;
        rows.push({
          id: `seed_${seedSlug}_collab_${ownerIndex}_${list.id.slice(-6)}_${collaborator.user.id.slice(-6)}`,
          listId: list.id,
          userId: collaborator.user.id,
          role,
          invitedById: ownerContext.user.id,
        });
        const listCollaborators = ownerContext.collaboratorsByListId.get(list.id) ?? [];
        listCollaborators.push(collaborator.user.id);
        ownerContext.collaboratorsByListId.set(list.id, listCollaborators);
      }
    }
  });

  if (rows.length === 0) {
    return 0;
  }

  const inserted = await createManyInChunks(rows, (chunk) =>
    prisma.listCollaborator.createMany({
      data: chunk,
      skipDuplicates: true,
    }),
  );
  return inserted;
}

async function summarizeSeed(userIds: string[]) {
  const [lists, tags, tasks, taskTags, comments, activities, collaborators] = await prisma.$transaction([
    prisma.list.count({ where: { ownerId: { in: userIds } } }),
    prisma.tag.count({ where: { ownerId: { in: userIds } } }),
    prisma.task.count({ where: { ownerId: { in: userIds } } }),
    prisma.taskTag.count({ where: { task: { ownerId: { in: userIds } } } }),
    prisma.taskComment.count({ where: { task: { ownerId: { in: userIds } } } }),
    prisma.taskActivity.count({ where: { task: { ownerId: { in: userIds } } } }),
    prisma.listCollaborator.count({ where: { list: { ownerId: { in: userIds } } } }),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  const next30 = addDays(now, 30);
  const last30 = addDays(now, -30);

  const dueTasks = await prisma.task.findMany({
    where: {
      ownerId: { in: userIds },
      dueDate: { not: null },
    },
    select: {
      dueDate: true,
      isCompleted: true,
    },
  });

  const dueThisMonth = dueTasks.filter(
    (task) => task.dueDate && task.dueDate >= monthStart && task.dueDate < nextMonthStart,
  ).length;
  const upcoming30Days = dueTasks.filter((task) => task.dueDate && task.dueDate >= now && task.dueDate <= next30).length;
  const recent30Days = dueTasks.filter((task) => task.dueDate && task.dueDate >= last30 && task.dueDate <= now).length;
  const overduePending = dueTasks.filter((task) => task.dueDate && task.dueDate < now && !task.isCompleted).length;

  const dailyDensity = new Map<string, number>();
  for (const task of dueTasks) {
    if (!task.dueDate) {
      continue;
    }
    const key = task.dueDate.toISOString().slice(0, 10);
    dailyDensity.set(key, (dailyDensity.get(key) ?? 0) + 1);
  }
  const maxPerDay = [...dailyDensity.values()].reduce((max, value) => Math.max(max, value), 0);
  const averagePerActiveDay =
    dailyDensity.size > 0
      ? Number((([...dailyDensity.values()].reduce((sum, value) => sum + value, 0) / dailyDensity.size)).toFixed(2))
      : 0;

  return {
    lists,
    tags,
    tasks,
    taskTags,
    comments,
    activities,
    collaborators,
    dueThisMonth,
    upcoming30Days,
    recent30Days,
    overduePending,
    maxPerDay,
    averagePerActiveDay,
  };
}

async function main() {
  const config = buildSeedConfig();
  const seedSlug = hashStringToSlug(config.seedText);
  const globalRng = new Random(config.seedText);
  const taskDistribution = distributeTaskCounts(config.taskCount, config.userEmails.length);

  console.log("Seeding realistic demo data with config:");
  console.table({
    seed: config.seedText,
    mode: config.mode,
    defaultPassword: config.defaultPassword,
    users: config.userEmails.join(", "),
    listsPerUser: config.listCount,
    tagsPerUser: config.tagCount,
    totalTasks: config.taskCount,
    monthsBack: config.monthsBack,
    futureDays: config.futureDays,
    recurringRatio: config.recurringRatio,
    commentRatio: config.commentRatio,
    collaborationRatio: config.collaborationRatio,
  });

  const users = await ensureSeedUsers(config);
  const contexts: UserSeedContext[] = [];

  for (let index = 0; index < users.length; index += 1) {
    const user = users[index];
    const userRng = new Random(`${config.seedText}:${user.email}`);
    const lists = await ensureListsForUser(user, config, userRng);
    const tags = await ensureTagsForUser(user, config, userRng);
    contexts.push({
      user,
      lists,
      tags,
      taskTarget: taskDistribution[index] ?? 0,
      collaboratorsByListId: new Map<string, string[]>(),
    });
  }

  const collaboratorsInserted = await createCollaborations(contexts, config, seedSlug);

  let taskRowsInserted = 0;
  let taskTagRowsInserted = 0;
  let commentRowsInserted = 0;
  let activityRowsInserted = 0;
  let contextOffset = globalRng.int(10, 999);

  for (const context of contexts) {
    const generated = buildTaskSetForUser(context, config, seedSlug, contextOffset);
    contextOffset += 1000;

    taskRowsInserted += await createManyInChunks(generated.tasks, (chunk) =>
      prisma.task.createMany({
        data: chunk,
        skipDuplicates: true,
      }),
    );

    taskTagRowsInserted += await createManyInChunks(generated.taskTags, (chunk) =>
      prisma.taskTag.createMany({
        data: chunk,
        skipDuplicates: true,
      }),
    );

    commentRowsInserted += await createManyInChunks(generated.comments, (chunk) =>
      prisma.taskComment.createMany({
        data: chunk,
        skipDuplicates: true,
      }),
    );

    activityRowsInserted += await createManyInChunks(generated.activities, (chunk) =>
      prisma.taskActivity.createMany({
        data: chunk,
        skipDuplicates: true,
      }),
    );
  }

  const summary = await summarizeSeed(users.map((user) => user.id));

  console.log("Seed completed.");
  console.table({
    users: users.length,
    lists: summary.lists,
    tags: summary.tags,
    tasks: summary.tasks,
    taskTags: summary.taskTags,
    comments: summary.comments,
    activities: summary.activities,
    collaborators: summary.collaborators,
  });
  console.table({
    insertedTasks: taskRowsInserted,
    insertedTaskTags: taskTagRowsInserted,
    insertedComments: commentRowsInserted,
    insertedActivities: activityRowsInserted,
    insertedCollaborators: collaboratorsInserted,
  });
  console.table({
    dueThisMonth: summary.dueThisMonth,
    dueNext30Days: summary.upcoming30Days,
    dueLast30Days: summary.recent30Days,
    overduePending: summary.overduePending,
    maxTasksPerDay: summary.maxPerDay,
    avgTasksPerActiveDay: summary.averagePerActiveDay,
  });
  console.log("Demo credentials:");
  for (const email of config.userEmails) {
    console.log(`- ${email} / ${config.defaultPassword}`);
  }
  console.log(
    `Calendar density check: ${summary.dueThisMonth} tasks this month and max ${summary.maxPerDay} tasks on a single day.`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
