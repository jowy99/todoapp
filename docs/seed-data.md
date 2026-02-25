# Seed Data (Realistic 1-Year Usage)

This project uses Prisma (`prisma/seed.ts`) and can generate realistic demo data for calendar/list/tag UI stress tests.

## Commands

- Default seed:

```bash
pnpm seed
```

- Equivalent:

```bash
pnpm db:seed
# or
pnpm prisma:seed
```

- With custom options:

```bash
pnpm seed -- --tasks=3500 --lists=20 --tags=55 --months=12 --future=45 --seed=my-seed-2026 --password=MyDemoPass123
```

## Configurable Options

You can pass values via CLI flags or environment variables:

- `--seed` / `SEED_VALUE`: deterministic seed text
- `--mode` / `SEED_MODE`: `replace` (default) or `append`
- `--password` / `SEED_DEFAULT_PASSWORD`: password assigned to all demo users
- `--users` / `SEED_USER_EMAILS`: comma-separated emails
- `--tasks` / `SEED_TASK_COUNT`: total tasks (recommended 1500-5000)
- `--lists` / `SEED_LIST_COUNT`: lists per user (12-25)
- `--tags` / `SEED_TAG_COUNT`: tags per user (30-60)
- `--months` / `SEED_MONTHS_BACK`: months back from today (default 12)
- `--future` / `SEED_FUTURE_DAYS`: days in future for upcoming tasks
- `--recurringRatio` / `SEED_RECURRING_RATIO`: recurring task ratio
- `--commentRatio` / `SEED_COMMENT_RATIO`: comments ratio
- `--collaborationRatio` / `SEED_COLLABORATION_RATIO`: shared-list ratio

## Reset / Clean Start

If you want a full DB reset before seeding:

```bash
pnpm prisma migrate reset --force
pnpm seed
```

## Output Validation

At the end, the seed prints:

- counts for users/lists/tags/tasks/task-tags/comments/activities/collaborators
- calendar density metrics (`dueThisMonth`, `dueNext30Days`, `maxTasksPerDay`, etc.)
- demo credentials (`email / password`)

This is intended to guarantee visible density in day/week/month/year calendar views.
