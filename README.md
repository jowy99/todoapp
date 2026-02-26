# PlannR

Aplicación web de productividad **local-first** para gestión de tareas, listas y calendario, con colaboración básica, modo PWA y soporte i18n.

## Qué es PlannR

PlannR está pensada como una app tipo “workspace” para uso diario:

- Gestión de tareas por estado, prioridad, lista y etiquetas.
- Vistas de calendario: día, semana, mes y año.
- Espacios compartidos para colaboración por listas.
- Perfil, ajustes de idioma/tema y preferencias de UI.
- Experiencia instalable como PWA.

## Stack técnico

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Estilos/UI:** Tailwind CSS 4 + design tokens propios
- **Datos:** Prisma ORM + PostgreSQL
- **Auth:** sesión por cookie HTTP-only
- **Calidad:** ESLint, Prettier, Vitest

## Estructura del proyecto

```txt
src/
  app/
    (protected)/      # rutas autenticadas: tasks, calendar, lists, profile, settings...
    auth/             # login/registro
    legal/            # centro legal y documentos
    api/              # endpoints internos
  components/         # layout, ui, páginas y módulos
  lib/                # auth, i18n, preferencias, utilidades
prisma/
  schema.prisma
  seed.ts
public/
  manifest.webmanifest
  sw.js
  icons/
```

## Requisitos

- Node.js `24.14.0`
- pnpm `10.x`
- PostgreSQL local (DBngin u otro servicio compatible)

## Puesta en marcha rápida

1. Instalar dependencias:

```bash
pnpm install
```

2. Crear `.env` a partir del ejemplo:

```bash
cp .env.example .env
```

3. Validar conexión y crear base de datos si no existe:

```bash
pnpm db:check
pnpm db:create
```

4. Aplicar migraciones y generar cliente Prisma:

```bash
pnpm prisma migrate deploy
pnpm prisma:generate
```

5. (Opcional) Cargar datos de demo:

```bash
pnpm db:seed
```

6. Arrancar en desarrollo:

```bash
pnpm dev
```

Abrir `http://localhost:3000`.

## Variables de entorno

Variables mínimas (`.env.example`):

| Variable              | Descripción                                      |
| --------------------- | ------------------------------------------------ |
| `DATABASE_ADMIN_URL`  | conexión a DB admin para crear la base de la app |
| `DATABASE_URL`        | conexión principal de aplicación (Prisma + Next) |
| `SESSION_COOKIE_NAME` | nombre de cookie de sesión                       |
| `SESSION_TTL_DAYS`    | duración de sesión en días                       |

Variable opcional:

| Variable                    | Descripción                                                 |
| --------------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_ENABLE_SW_DEV` | si es `true`, registra service worker también en `pnpm dev` |

## Scripts principales

| Script                              | Uso                                       |
| ----------------------------------- | ----------------------------------------- |
| `pnpm dev`                          | ejecutar entorno local                    |
| `pnpm build`                        | build de producción                       |
| `pnpm start`                        | servir build compilado                    |
| `pnpm lint`                         | análisis estático con ESLint              |
| `pnpm format` / `pnpm format:check` | formateo y verificación con Prettier      |
| `pnpm test` / `pnpm test:watch`     | tests con Vitest                          |
| `pnpm db:check`                     | verificar conectividad a PostgreSQL       |
| `pnpm db:create`                    | crear base de datos local                 |
| `pnpm prisma:migrate`               | flujo de migraciones en desarrollo        |
| `pnpm prisma:status`                | estado de migraciones                     |
| `pnpm prisma:studio`                | UI de Prisma Studio                       |
| `pnpm db:seed`                      | poblar datos demo                         |
| `pnpm i18n:check`                   | detección best-effort de textos hardcoded |

## PWA

PlannR incluye configuración base de PWA:

- Manifest: `public/manifest.webmanifest`
- Service worker: `public/sw.js`
- Registro automático en cliente: `src/components/pwa/pwa-register.tsx`
- Iconos: `public/icons/*`

Notas:

- En producción, el service worker se registra automáticamente.
- En desarrollo, solo se registra si `NEXT_PUBLIC_ENABLE_SW_DEV=true`.

## i18n, tema y diseño

- Idiomas activos: **es** y **en**
- Diccionario central: `src/lib/i18n/messages.ts`
- Preferencias de usuario (tema/idioma/UI): providers en `src/components/settings/*`
- Guía de tokens y sistema visual: [`docs/ui.md`](docs/ui.md)

## Datos de demo y carga realista

Para generar datos de stress (tareas/listas/etiquetas/calendario), revisa:

- [`docs/seed-data.md`](docs/seed-data.md)

## Endpoints útiles

- Export JSON: `GET /api/export/tasks.json`
- Export CSV: `GET /api/export/tasks.csv`
- Auth: `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`

## Centro legal (plantillas)

Rutas disponibles:

- `/legal/privacy`
- `/legal/cookies`
- `/legal/terms`
- `/legal/legal-notice`

Importante: son **plantillas** adaptadas a España (Islas Baleares, 26 de febrero de 2026) y requieren revisión legal humana antes de producción.

Checklist pendiente obligatorio:

- Razón social / titular (`[COMPANY_NAME]`)
- NIF/CIF (`[TAX_ID]`)
- Dirección completa (`[FULL_ADDRESS]`)
- Email legal (`[LEGAL_EMAIL]`)
- DPO (si aplica) (`[DPO_CONTACT]`)
- Proveedores y países (`[PROVIDERS_LIST]`)
- Inventario real de cookies (`[COOKIE_TABLE]`)
- Validación final legal (`[LEGAL_REVIEW_LOG]`)

## Troubleshooting rápido

1. Error de conexión a DB
   - Verifica PostgreSQL activo en `localhost:5432`.
   - Ejecuta `pnpm db:check`.

2. Cambios no reflejados por caché PWA
   - DevTools > Application > Service Workers > Unregister.
   - Limpia almacenamiento y recarga.

3. Problemas de migraciones
   - Revisa `pnpm prisma:status`.
   - En entornos de desarrollo, aplica `pnpm prisma:migrate`.

## Estado del repositorio

- Proyecto en evolución activa.
- No hay licencia declarada en este repositorio por ahora.
