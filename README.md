# Todo Studio (Local-First)

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

## Integraciones

### Google Calendar (OAuth + API)

Configura en `.env`:

```env
APP_BASE_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:3000/api/integrations/google/callback"
INTEGRATION_ENCRYPTION_KEY=""
```

Pasos:

1. En Google Cloud, crea OAuth Client (Web).
2. Añade redirect URI: `http://localhost:3000/api/integrations/google/callback`
3. En la app abre `/integrations` y pulsa **Conectar Google**.
4. Pulsa **Sync manual** para empujar tareas con fecha a Google Calendar.

### Apple Calendar vía feed ICS privado

1. Abre `/integrations`.
2. Copia `URL del feed ICS`.
3. En Apple Calendar: `File -> New Calendar Subscription...` y pega la URL.
4. Si necesitas invalidar la URL, pulsa **Rotar token ICS**.

Endpoint ICS:

- `GET /api/feeds/ics/:token`

### Alternativas para Apple Notes / Recordatorios

#### Exportaciones directas

- JSON: `GET /api/export/tasks.json`
- CSV: `GET /api/export/tasks.csv`

Uso práctico:

- Importar CSV en herramientas de notas.
- Consumir JSON desde Shortcuts para transformar y guardar en Notes.

#### Webhook para Shortcuts (ingesta de tareas)

Desde `/integrations` copia `Endpoint de ingesta`.

Endpoint:

- `POST /api/integrations/webhook/:token/tasks`

Payload ejemplo:

```json
{
  "title": "Comprar pan",
  "dueDate": "2026-03-01T18:00:00.000Z",
  "priority": "MEDIUM",
  "listName": "Inbox"
}
```

Flujo recomendado con Apple Shortcuts:

1. Acción `Get Contents of URL` (método `POST`).
2. URL: endpoint webhook con token.
3. Body JSON como el ejemplo.
4. Ejecuta desde Siri, pantalla compartida o widget.

## Seguridad local

- Sesiones en cookie HTTP-only.
- Feed ICS y webhook protegidos por token rotatorio.
- Si defines `INTEGRATION_ENCRYPTION_KEY`, tokens OAuth se guardan cifrados en DB.

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
git commit -m "feat: initial local-first todo studio app"
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
