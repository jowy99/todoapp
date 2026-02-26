# PlannR (Local-First)

Aplicación To-Do full-stack con Next.js (App Router), TypeScript, Prisma y PostgreSQL local (DBngin).

## Requisitos

- Node `24.14.0`
- pnpm `10.x`
- PostgreSQL local (DBngin) en `localhost:5432`

## Setup local

1. Instala dependencias:

```bash
pnpm install
```

2. Copia y ajusta variables:

```bash
cp .env.example .env
```

3. Crea DB (si no existe), genera cliente y aplica migraciones:

```bash
pnpm db:create
pnpm prisma:generate
pnpm prisma migrate deploy
```

4. Ejecuta la app:

```bash
pnpm dev
```

Abre `http://localhost:3000`.

## Scripts útiles

- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm format`
- `pnpm format:check`
- `pnpm test`
- `pnpm test:watch`
- `pnpm db:create`
- `pnpm db:check`
- `pnpm prisma:generate`
- `pnpm prisma:migrate`
- `pnpm prisma:status`
- `pnpm prisma:studio`
- `pnpm prisma:seed`

## Guía UI/UX

- Tokens, motion y reglas responsive: `docs/ui.md`

## Exportaciones

- JSON: `GET /api/export/tasks.json`
- CSV: `GET /api/export/tasks.csv`

## Seguridad local

- Sesiones en cookie HTTP-only.

## Legal (HUMANO: completar antes de producción)

Las rutas `/legal/*` están preparadas como plantilla legal para España (Islas Baleares, 26 de febrero de 2026), pero requieren revisión jurídica.

Checklist obligatorio:

- Razón social / titular del tratamiento (`[COMPANY_NAME]`)
- NIF/CIF (`[TAX_ID]`)
- Dirección completa en Islas Baleares (`[FULL_ADDRESS]`)
- Email de contacto legal (`[LEGAL_EMAIL]`)
- Datos de DPO (si aplica) (`[DPO_CONTACT]`)
- Proveedores externos y países (`[PROVIDERS_LIST]`)
- Inventario real de cookies (nombre/proveedor/duración/finalidad) (`[COOKIE_TABLE]`)
- Validación final por asesoría jurídica (`[LEGAL_REVIEW_LOG]`)

## Publicar en GitHub

1. Asegúrate de usar Node correcto:

```bash
nvm use 24.14.0
```

2. Verifica estado y calidad:

```bash
pnpm format:check
pnpm lint
pnpm test
pnpm build
```

3. Comprueba que no subes secretos:

```bash
git status --short
```

- `.env` debe quedar ignorado.
- `.env.example` sí debe subirse.

4. Crea commit inicial:

```bash
git add .
git commit -m "feat: initial local-first plannr app"
```

5. Crea un repo vacío en GitHub y enlaza remoto:

```bash
git remote add origin git@github.com:TU_USUARIO/TU_REPO.git
```

Si ya existe remoto:

```bash
git remote set-url origin git@github.com:TU_USUARIO/TU_REPO.git
```

6. Sube rama principal:

```bash
git push -u origin main
```
