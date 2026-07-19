# Architecture

Загальний контекст: MVP AI-first застосунку для планування задач, хостинг на Vercel, mobile-first PWA, AI-провайдер — Google Gemini Flash (зафіксовано у PRD).

## Framework — Next.js App Router + TypeScript

Нативно підтримується Vercel (zero-config деплой), дозволяє мати UI та backend API-роути в одній кодовій базі — не потрібен окремий бекенд-сервер для MVP. TypeScript додає типобезпеку на стику з Zod-валідацією та Supabase-схемою.

## UI — Tailwind CSS

Швидка розробка mobile-first адаптивної верстки, зручно реалізувати тему, що змінюється залежно від часу доби (ранок/день/вечір/ніч), через utility-класи без окремої дизайн-системи.

## Database — Supabase Postgres

Реляційна база даних добре підходить для моделі задач зі статусами (draft/confirmed/done), пріоритетами й датами. Supabase дає Postgres одразу з вбудованою адмін-панеллю для перегляду й ручного редагування даних, без потреби піднімати окремий бекенд-сервер для MVP.

### Схема таблиць

**`user_settings`**

| Поле | Тип | Опис |
| --- | --- | --- |
| `user_id` | uuid, PK, FK → `auth.users(id)`, immutable | визначається із серверної сесії, не приймається з клієнтського payload |
| `timezone` | text, not null, default `'UTC'` | IANA timezone |

**`brain_dump_entries`**

| Поле | Тип | Опис |
| --- | --- | --- |
| `id` | uuid, PK, default `gen_random_uuid()` |  |
| `user_id` | uuid, not null, FK → `auth.users(id)`, immutable | з сесії, не з payload |
| `raw_text` | text, not null |  |
| `created_at` | timestamptz, not null, default `now()` |  |

`UNIQUE (id, user_id)` — ціль для складеного FK з `tasks`.

**`tasks`**

| Поле | Тип | Обмеження / опис |
| --- | --- | --- |
| `id` | uuid, PK, default `gen_random_uuid()` |  |
| `user_id` | uuid, not null, FK → `auth.users(id)`, immutable | з сесії, не з payload |
| `brain_dump_entry_id` | uuid, not null | складений FK нижче |
| `title` | text, not null |  |
| `description` | text, nullable |  |
| `priority` | enum: `low`/`medium`/`high`, not null |  |
| `priority_is_suggestion` | boolean, not null, default `false` | скидається на `false` при ручному редагуванні (app-рівень) |
| `duration_minutes` | integer, not null | `CHECK (duration_minutes > 0)` |
| `duration_is_suggestion` | boolean, not null, default `false` | скидається на `false` при ручному редагуванні (app-рівень) |
| `scheduled_date` | date, not null | дата завжди присутня (AI завжди проставляє, дефолт — сьогодні) |
| `scheduled_time` | time, nullable | необов'язкове поле; AI повертає `null`, якщо час не випливає з Brain Dump; користувач може додати/змінити/прибрати вручну |
| `status` | enum: `draft`/`confirmed`/`done`, not null, default `draft` |  |
| `sort_order` | integer, not null | `CHECK (sort_order >= 0)` |
| `created_at` | timestamptz, not null, default `now()` |  |
| `updated_at` | timestamptz, not null, default `now()` | оновлюється через trigger |

**Складений FK:** `FOREIGN KEY (brain_dump_entry_id, user_id) REFERENCES brain_dump_entries(id, user_id)` — гарантує на рівні БД, що задача не може посилатись на Brain Dump іншого користувача.

### Constraints та triggers

- `CHECK (duration_minutes > 0)` на `tasks.duration_minutes`
- `CHECK (sort_order >= 0)` на `tasks.sort_order`
- **Immutable `user_id`** (`user_settings`, `brain_dump_entries`, `tasks`): `BEFORE UPDATE` trigger, кидає виняток при `NEW.user_id <> OLD.user_id`
- **`set_updated_at`** (`tasks`): `BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()`, встановлює `NEW.updated_at = now()`
- Правило `*_is_suggestion → false`: реалізується на рівні Route Handler/Server Action — якщо payload оновлення містить `priority` чи `duration_minutes`, відповідний `*_is_suggestion` примусово ставиться в `false` перед записом

### Початковий порядок задач та `sort_order`

Сортування Today's Plan не перераховується при кожному рендері — список завжди відображається за збереженим `sort_order`. Сервер явно обчислює й записує `sort_order` у двох випадках:

1. **Створення задач через Brain Dump** (`create_brain_dump_with_tasks`): для кожного нового дня серед створюваних задач RPC формує початковий порядок — спочатку задачі з `scheduled_time` в хронологічному порядку, потім задачі без часу в порядку їх появи в масиві `tasks` (порядок, що повернув Gemini, орієнтовно відповідає порядку згадування в `raw_text`). `created_at` для визначення порядку не використовується.
2. **Підтвердження задачі** (`confirm`, `confirm-remaining`, `drafts/confirm-all`): щойно задача переходить у `confirmed` і потрапляє у список дня, сервер вставляє її у поточний `sort_order`-порядок цього дня за тим самим правилом (за часом серед timed-задач або в кінець untimed-групи) і переобчислює `sort_order` сусідніх задач дня за потреби.

Після першого відображення користувач може вручну змінити порядок через drag&drop (`PATCH /api/tasks/reorder`) незалежно від наявності часу — це записується як новий `sort_order` і більше не перераховується автоматично при рендері.

### RLS-політики (`tasks`, `brain_dump_entries`, `user_settings`)

- **SELECT:** `USING (user_id = auth.uid())`
- **INSERT:** `WITH CHECK (user_id = auth.uid())`
- **UPDATE:** `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`
- **DELETE:** `USING (user_id = auth.uid())`

Оскільки всі мутації йдуть через SSR server client з користувацькою сесією (не `service_role`), RLS є реальним другим рівнем захисту — навіть якщо серверний код помилково пропустить перевірку, RLS відхилить чужі рядки.

### Конкретні правила доступу до мутацій (`tasks`, `brain_dump_entries`, `user_settings`)

- **SELECT** — дозволено з client SDK (browser) та з сервера; захищено RLS-політикою `user_id = auth.uid()`.
- **INSERT / UPDATE / DELETE** — лише через Server Actions/Route Handlers з SSR server client (user-scoped, не `service_role`); проходять через ті самі RLS-політики.
- `user_id` у жодній із трьох таблиць ніколи не приймається з клієнтського payload — визначається сервером виключно з поточної сесії (`auth.uid()`) перед вставкою чи оновленням.

### Timezone та визначення "сьогодні"

- Клієнт визначає IANA timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) до першого завантаження Today's Plan.
- Значення валідується як коректний IANA identifier.
- **Fallback:** `UTC`.
- Звірка й за потреби оновлення `user_settings.timezone` відбувається на початку кожної автентифікованої сесії.
- Оскільки `scheduled_date`/`scheduled_time` — це "стінний" (wall-clock) час користувача без прив'язки до конкретного UTC-моменту, UTC-конвертація для фільтрації Today's Plan/Calendar більше не потрібна: запит фільтрує напряму за `scheduled_date = :date`.
- `user_settings.timezone` залишається потрібним для визначення, **яка локальна дата є "сьогодні"** для користувача в момент запиту (напр. опівночі після 22:00 локального часу в UTC вже настав наступний день), а також для дефолтної `scheduled_date` у AI-згенерованих задачах (див. AI Integration).

### Undo при видаленні (client-side)

Задача миттєво приховується через optimistic update (TanStack Query), реальний DELETE виконується лише після завершення таймера undo. При натисканні Undo локальний стан відновлюється. Для Delete All використовується один snapshot і один відкладений batch-delete.

## Authentication — Supabase Auth

З коробки підтримує Email+пароль та Google OAuth, а також вбудовану логіку об'єднання акаунтів за email (один email — один акаунт незалежно від методу входу) — саме той сценарій, що прописаний у PRD. Це знижує ризик самописних багів (дублікати акаунтів, конфлікти при вході різними методами) порівняно з ручною реалізацією.

## Data access — Supabase SDK (server та client), Data Access Boundary

Пряма робота через типізований Supabase-клієнт, без окремого ORM-шару (Prisma) — RLS-політики на рівні БД покривають доступ до даних.

**Data Access Boundary (загальне правило):** клієнтський Supabase SDK використовується лише для SELECT-запитів (читання даних через RLS, у парі з TanStack Query для кешування, refetch, mutations та optimistic updates на клієнті). Усі мутації (create/update/delete) виконуються виключно через Server Actions або Route Handlers, з використанням **Supabase SSR server client, ініціалізованого з користувацької сесії (cookies)** — запит виконується від імені конкретного користувача й проходить через RLS-політики, а не обходить їх. `service_role` / secret key **не використовується для користувацьких операцій** у MVP; зарезервований виключно для майбутніх системних/адміністративних задач поза контекстом сесії користувача.

## Server-state management — TanStack Query (лише для інтерактивних клієнтських флоу)

Застосовується вибірково: там, де дані рендеряться одразу на сервері (Server Components), Query не потрібен. Використовується саме для client-side мутацій з оптимістичними апдейтами — чекбокс "виконано", drag&drop реордер, confirm/edit/delete у Review/Drafts, undo при видаленні.

## Validation — Zod

Валідація вхідних даних форм і, що особливо важливо, структурованих відповідей від Gemini — перш ніж AI-згенерована чорнова задача потрапить у UI чи БД, вона проганяється через Zod-схему. Страхує від некоректних чи неповних AI-відповідей.

## AI — Google Gemini API зі structured outputs

Зафіксовано в PRD: безкоштовний тариф без потреби картки та без терміну дії, достатній для обсягу MVP/демо. Виклики відбуваються виключно із серверних Route Handlers Next.js, щоб API-ключ не потрапляв на клієнт. Structured outputs дозволяють Gemini одразу повертати JSON за заданою схемою замість парсингу вільного тексту.

## Deployment — Vercel

Зафіксовано в PRD як вимога — застосунок має легко хоститись на Vercel; природно поєднується з Next.js.

## PWA — installable, без offline-режиму

Застосунок можна встановити на головний екран (manifest + service worker), повноекранний режим підтримується. Offline-режим свідомо виключений з MVP-скоупу — потребував би синхронізації стану та вирішення конфліктів при відновленні мережі, що є окремою нетривіальною задачею.

## API Contract

Конвенція: **Route Handlers** (`app/api/...`). За Data Access Boundary цей контракт покриває лише мутації — читання (Today's Plan, Calendar, Drafts) йде напряму з клієнта через Supabase SDK + RLS, минаючи API.

### Формат відповіді

```
Success: { data: T }
Error:   { error: { code: string, message: string, details?: unknown } }
```

Валідація вхідного payload — Zod-схема на кожному хендлері, перед будь-якою роботою з Supabase.

### HTTP status codes

| Код | Code | Коли |
| --- | --- | --- |
| `200` | — | Успішна мутація без створення ресурсу |
| `201` | — | `POST /api/brain-dump` — створено `brain_dump_entry`  • задачі |
| `400` | `VALIDATION_ERROR` | Zod не пройшов; `details` = flatten з Zod |
| `401` | `UNAUTHORIZED` | Немає сесії |
| `403` | `TASK_READ_ONLY` | Спроба редагувати/видалити `done`-задачу |
| `404` | `NOT_FOUND` | Задача не існує або не належить користувачу |
| `409` | `INVALID_STATUS_TRANSITION` | Недопустимий перехід статусу |
| `409` | `REQUEST_IN_PROGRESS` | Ідентичний idempotency-запит вже обробляється |
| `422` | `AI_COULD_NOT_PARSE_TASKS` | Валідна AI-відповідь, але без жодної задачі |
| `429` | `AI_RATE_LIMITED` | Gemini rate limit |
| `502` | `AI_INVALID_RESPONSE` | Gemini повернув відповідь, що не пройшла Zod-валідацію |
| `502` | `AI_PROVIDER_ERROR` | Gemini повернув помилку виконання |
| `503` | `AI_UNAVAILABLE` | Gemini недоступний (timeout, мережа) |
| `500` | `INTERNAL_ERROR` | — |

### Brain Dump

**`POST /api/brain-dump`**

- Header: `Idempotency-Key` (обов'язковий, UUID, генерується клієнтом на початок Brain Dump-сесії)
- Body: `{ raw_text: string }`

Логіка:

1. Атомарний **INSERT** у `idempotency_keys` `(user_id, key, endpoint, status='processing')` — `PRIMARY KEY (user_id, key, endpoint)` гарантує, що лише один запит "виграє" вставку.
    - Успішний INSERT → продовжити виконання.
    - Конфлікт (запис вже існує):
        - `status = 'completed'` → повернути збережену `response_body`/`response_status`, Gemini повторно не викликати.
        - `status = 'processing'` → `409 REQUEST_IN_PROGRESS`.
        - `status = 'failed'` → атомарний `UPDATE ... WHERE status='failed'` для переходу в `processing`, продовжити виконання.
2. Виклик Gemini з контекстом уже підтверджених задач дня → structured output → Zod-валідація (див. AI Integration).
    - Помилка/timeout/невалідна структура Gemini → `UPDATE idempotency_keys SET status='failed'` (не `completed`) → відповідна помилка (`422`/`429`/`502`/`503`). Тимчасові помилки ніколи не кешуються як успіх.
3. Виклик RPC **`create_brain_dump_with_tasks(raw_text, tasks, idempotency_key, endpoint)`** — в одній транзакції: створює `brain_dump_entries`, створює всі `tasks` (`status=draft`), і переводить відповідний запис `idempotency_keys` у `completed` зі збереженням response body. Це закриває вікно між створенням задач і завершенням idempotency-запису — після commit не може залишитись ключ у `processing`.
4. Відповідь: `201 { data: { brainDumpEntry, tasks[], warnings: [...] } }`

### Tasks — редагування

**`PATCH /api/tasks/:id`** — `{ title?, description?, priority?, duration_minutes? }`, скидає відповідний `*_is_suggestion` на `false`, `403 TASK_READ_ONLY` якщо `done`.

**`PATCH /api/tasks/:id/schedule`** — `{ scheduled_date: string, scheduled_time?: string | null }`, окремо від інших полів; дозволяє встановити, змінити або прибрати (`null`) час; після зміни переобчислює `sort_order` за початковим правилом, якщо задача переходить на інший день; `403 TASK_READ_ONLY` якщо `done`.

### Tasks — статуси

| Метод + шлях | Перехід |
| --- | --- |
| `POST /api/tasks/:id/confirm` | `draft → confirmed` |
| `POST /api/tasks/:id/complete` | `confirmed → done` |
| `POST /api/tasks/:id/reopen` | `done → confirmed` |

`409 INVALID_STATUS_TRANSITION`, якщо поточний статус не відповідає очікуваному.

**`DELETE /api/tasks/:id`** — реальний DELETE після завершення undo-таймера; `403 TASK_READ_ONLY` якщо `done`.

### Reorder

**`PATCH /api/tasks/reorder`**

- Body: `{ target_date: string, items: [{ id: string, sort_order: number }] }`
- RPC **`reorder_tasks(items, target_date)`** (без `user_id`), атомарно:
    - перевіряє, що всі передані задачі належать поточному користувачу (`auth.uid()`), мають `status = 'confirmed'` та `scheduled_date = target_date` (незалежно від наявності `scheduled_time`);
    - перевіряє унікальність `sort_order` у межах переданого набору;
    - виконує batch-update однією транзакцією (`UPDATE ... FROM unnest(...)`).
- Оскільки `scheduled_date` — простий `date` без прив'язки до UTC, Route Handler передає `target_date` напряму без timezone-обчислень.

### Масові дії

**`POST /api/brain-dump/:id/confirm-remaining`** — без body; підтверджує всі задачі з `brain_dump_entry_id = :id` та `status = 'draft'` на момент запиту.

**`POST /api/tasks/drafts/confirm-all`** — `{ taskIds: string[] }` (snapshot клієнта); підтверджує ті `id` зі списку, що досі `status = 'draft'`; решта → `skipped`. Відповідь: `{ data: { confirmed: string[], skipped: string[] } }`.

**`POST /api/tasks/drafts/delete-all`** — `{ taskIds: string[] }` (snapshot клієнта); видаляє лише ті `id`, що все ще мають `status = 'draft'`; `confirmed` і `done` — завжди в `skipped`, незалежно від причини. Відповідь: `{ data: { deleted: string[], skipped: string[] } }`.

### RPC — безпека виконання

**`create_brain_dump_with_tasks(raw_text text, tasks jsonb, idempotency_key text, endpoint text)`** та **`reorder_tasks(items jsonb, target_date date)`**:

- Без параметра `user_id` — отримують користувача самостійно через `auth.uid()` всередині тіла.
- **`SECURITY INVOKER`** (не `DEFINER`) — виконуються з правами й RLS-контекстом викликача.
- Права виконання встановлюються явно трьома кроками для кожної з двох RPC (самого `GRANT authenticated` недостатньо, бо функції можуть мати стандартний дозвіл виконання для `PUBLIC`):
    1. `REVOKE EXECUTE ... FROM PUBLIC`
    2. `REVOKE EXECUTE ... FROM anon`
    3. `GRANT EXECUTE ... TO authenticated`

### Таблиця `idempotency_keys`

| Поле | Тип | Опис |
| --- | --- | --- |
| `user_id` | uuid, PK (складений) |  |
| `key` | text, PK (складений) | клієнтський UUID |
| `endpoint` | text, PK (складений) | напр. `POST /api/brain-dump` |
| `status` | enum: `processing`/`completed`/`failed` |  |
| `response_status` | integer, nullable |  |
| `response_body` | jsonb, nullable |  |
| `created_at` | timestamptz, default `now()` |  |

**RLS:** `USING (user_id = auth.uid())` для SELECT/INSERT/UPDATE (ті ж операції, що й для інших таблиць).

**Очищення:** записи зі `status IN ('completed', 'failed')` видаляються через 24 години після `created_at` — періодична задача (Supabase pg_cron або еквівалентний scheduled job), щоб таблиця не росла безмежно.

## Project Structure

Next.js App Router з feature-based організацією: спільна UI-логіка, hooks та Supabase-запити кожного домену живуть у своєму `features/`-модулі, `lib/` залишається лише для справді спільних речей (Supabase clients, AI client, API response-формат, timezone-утиліта).

```
ai-task-planner/
├── proxy.ts                        # корінь проєкту, на одному рівні з app/ — оновлення сесії на кожен запит
│
├── app/
│   ├── manifest.ts                 # PWA manifest
│   ├── layout.tsx                  # root layout, theme provider, TanStack Query provider
│   ├── globals.css
│   │
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   │
│   ├── (app)/                      # захищені сторінки, спільний layout з навігацією/FAB
│   │   ├── layout.tsx
│   │   ├── today/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── drafts/page.tsx
│   │   └── brain-dump/page.tsx
│   │
│   └── api/
│       ├── brain-dump/
│       │   ├── route.ts
│       │   └── [id]/confirm-remaining/route.ts
│       └── tasks/
│           ├── [id]/route.ts
│           ├── [id]/schedule/route.ts
│           ├── [id]/confirm/route.ts
│           ├── [id]/complete/route.ts
│           ├── [id]/reopen/route.ts
│           ├── reorder/route.ts
│           └── drafts/
│               ├── confirm-all/route.ts
│               └── delete-all/route.ts
│
├── features/
│   ├── tasks/
│   │   ├── components/             # TaskCard, TaskDetailModal, TaskList
│   │   ├── hooks/                  # useTasks, useConfirmTask, useReorder... (TanStack Query)
│   │   ├── api/
│   │   │   ├── queries.ts          # читання (SELECT через client SDK)
│   │   │   └── mutations.ts        # confirm/complete/reopen/delete/reorder — виклики Route Handlers
│   │   ├── schema.ts               # Zod-схеми для tasks
│   │   └── types.ts
│   ├── brain-dump/
│   │   ├── components/             # BrainDumpInput, ReviewCardList
│   │   ├── hooks/
│   │   ├── api/
│   │   │   └── mutations.ts        # POST /api/brain-dump, confirm-remaining
│   │   ├── schema.ts               # Zod-схеми для raw_text, structured output Gemini
│   │   └── types.ts
│   ├── calendar/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api/
│   │       └── queries.ts          # читання задач за day bounds
│   └── auth/
│       ├── components/             # LoginForm, SignupForm, GoogleButton
│       ├── hooks/
│       ├── api/
│       │   └── mutations.ts        # login/signup/oauth
│       └── schema.ts               # Zod-схеми форм входу/реєстрації
│
├── components/
│   ├── ui/                         # generic building blocks (Button, Badge, Modal)
│   ├── theme/                      # time-of-day theme wrapper
│   └── providers/
│       └── query-provider.tsx      # TanStack Query client provider
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── update-session.ts       # helper, викликається з кореневого proxy.ts
│   │   └── database.types.ts       # generated Supabase types
│   ├── ai/
│   │   ├── gemini.ts               # клієнт Gemini, structured output config
│   │   └── prompts.ts
│   ├── api/
│   │   └── response.ts             # helpers для { data }/{ error } формату, error codes
│   └── timezone.ts                 # day bounds, IANA-валідація
│
├── supabase/
│   └── migrations/                 # SQL: таблиці, constraints, triggers, RLS, RPC
│
├── public/
│   └── icons/
│
└── (конфіг-файли: next.config, tailwind.config, tsconfig, .env.example)
```

**Ключові рішення:**

- **`proxy.ts` в корені проєкту** — за офіційною вимогою Next.js 16 (на одному рівні з `app/`, або всередині `src/`, якщо використовується).
- **`(auth)` і `(app)` — route groups**, розділяють захищений і незахищений layout без впливу на URL.
- **`api/` дзеркалить API Contract 1:1** — кожен ендпоінт має пряме відображення в файловій структурі.
- **Feature-based `features/`** — `tasks`, `brain-dump`, `calendar`, `auth`; кожен модуль містить власні components/hooks/api/schema — компоненти ніколи не будують Supabase-запити напряму, лише через hooks.
- **`api/queries.ts` та `api/mutations.ts`** у кожному feature-модулі замість загальної `queries/` — розділення читання/мутацій; для `auth` — `mutations.ts` (login/signup/oauth — це дії, не читання), назва консистентна з іншими модулями.
- **Feature-specific Zod-схеми** живуть у `schema.ts` всередині відповідного модуля, не в спільному `lib/`.
- **`components/providers/query-provider.tsx`** — app-wide provider, окремо від generic UI та теми.
- **`lib/`** залишається лише для справді спільних речей: Supabase clients, AI client, API response-формат, timezone-утиліта.
- **`supabase/migrations/`** — весь DB-схема з розділу Database (SQL, не Prisma-based) як version-controlled джерело правди.

## AI Integration

### Structured Output Schema (Gemini → Zod)

```tsx
const aiTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  priority: z.enum(['low', 'medium', 'high']).nullable(),
  duration_minutes: z.number().int().positive().nullable(),
  scheduled_date: z.iso.date(),              // завжди присутнє, AI підставляє "сьогодні" за замовчуванням
  scheduled_time: z.iso.time().nullable(),   // null, якщо час не випливає з тексту
});

const aiResponseSchema = z.object({
  tasks: z.array(aiTaskSchema),              // порядок = порядок згадування в raw_text; може бути порожнім
  no_tasks_reason: z.string().nullable(),    // пояснення, якщо tasks порожній; null інакше
});
```

**Сувора валідація всієї відповіді (без часткового фільтрування):** для MVP не вибувається фільтрація окремих невалідних задач із валідного масиву — вся відповідь валідується як одна цілісність через `aiResponseSchema.parse()`:

- Невалідна структура **АБО** хоча б одна задача в `tasks` не пройшла `aiTaskSchema` → **`502 AI_INVALID_RESPONSE`**.
- Валідна структура, `tasks` порожній (з `no_tasks_reason`) → **`422 AI_COULD_NOT_PARSE_TASKS`**.
- Валідна структура, `tasks.length > 0`, усі задачі валідні → продовжити до пост-обробки.

**Пост-обробка дефолтів (Route Handler, перед викликом RPC), для кожної задачі:**

```
priority_is_suggestion = (aiTask.priority === null)
priority = aiTask.priority ?? 'medium'

duration_is_suggestion = (aiTask.duration_minutes === null)
duration_minutes = aiTask.duration_minutes ?? 30
```

### Роль контексту існуючих задач

Список уже підтверджених задач користувача передається в prompt **виключно як контекст для орієнтації** (щоб AI бачив зайняті слоти й не пропонував очевидний дублікат). **AI не відповідає за перевірку конфліктів часу, дублікатів чи будь-яких інших бізнес-правил** — це повністю відповідальність бекенду (перевірки після отримання structured output, описані нижче). Це знижує залежність коректності системи від якості LLM-виводу.

### System Prompt — версіонування

`lib/ai/prompts.ts` експортує іменовану константу **`systemPromptV1`** (не безіменний рядок). **Архітектурне правило:**

- `systemPromptV1` **не редагується після релізу**, навіть якщо зміна здається незначною.
- **Будь-яка зміна тексту промпту** — навіть чисто стилістичне формулювання, яке нібито не впливає на контракт відповіді — створює нову версію (`systemPromptV2` і далі). Немає винятків для дрібних правок.

Це дає можливість відкотитись до попередньої версії у разі погіршення якості AI-виводу та, пост-MVP, A/B-тестувати версії.

### Output Contract

Explicit-вимоги в `systemPromptV1`, окремим блоком:

- Відповідь — **лише JSON**, без жодного іншого тексту.
- **Без markdown-форматування** (без обгортки потрійними бек-тиками з міткою json).
- **Без пояснень, коментарів чи преамбули** до або після JSON.
- **Без додаткових полів**, яких немає в schema.
- Відповідь **повністю відповідає** `aiResponseSchema` (Gemini `responseSchema` config це технічно забезпечує, explicit-інструкція в промпті — додатковий захист на випадок відхилень моделі).

### JSON Schema для Gemini `responseSchema`

Zod-схема є джерелом runtime-валідації (завжди). **Конкретний спосіб генерації JSON Schema для Gemini не зафіксований як `zod-to-json-schema` безумовно** — це або сумісний конвертер, або вручну описана JSON Schema, задана окремо від Zod. У будь-якому випадку **обов'язкова вимога:** тест, який підтверджує, що nullable-поля, `date` та `time`-формати коректно підтримуються обраною моделлю та SDK, перед тим як конвертер вводиться в production.

### Виклик Gemini (`lib/ai/gemini.ts`)

- SDK `@google/genai`, `responseSchema` — за правилом вище.
- **Timeout:** 20с.
- **Retry:** 1 автоматичний, лише на мережеву/timeout помилку, у межах одного виконання Route Handler.

### Мапінг помилок

| Ситуація | HTTP | Code |
| --- | --- | --- |
| Gemini 429 | 429 | `AI_RATE_LIMITED` |
| Невалідна структура або хоча б одна невалідна задача в `tasks` | 502 | `AI_INVALID_RESPONSE` |
| Валідна структура, `tasks` порожній | 422 | `AI_COULD_NOT_PARSE_TASKS` |
| Помилка виконання Gemini | 502 | `AI_PROVIDER_ERROR` |
| Timeout/мережа після retry | 503 | `AI_UNAVAILABLE` |

Усі випадки → `idempotency_keys.status = 'failed'` (не `completed`), `brain_dump_entry` і задачі не створюються, RPC не викликається. Це дозволяє контрольований retry за тим самим `Idempotency-Key`.

### Пост-обробка на бекенді (після успішної валідації, `tasks.length > 0`)

1. Застосування дефолтів і `*_is_suggestion`-логіки (див. вище) для кожної задачі.
2. Виклик **`create_brain_dump_with_tasks`** RPC — транзакційно створює `brain_dump_entries` + `tasks` (`status=draft`) із сервером обчисленим `sort_order` (timed хронологічно → untimed у порядку масиву відповіді), переводить `idempotency_keys` у `completed`.
3. **Обчислення попереджень** (Route Handler, після RPC):
    - Перевантаження дня: сума `duration_minutes` (підтверджені + нові draft) по кожній унікальній `scheduled_date` > 480 хв.
    - Конфлікт часу: лише між парами задач, де обидві мають `scheduled_time`.
4. Відповідь `201`: `{ data: { brainDumpEntry, tasks[], warnings: [...] } }`.

## Authentication

### Email confirmation — налаштування Supabase Auth

- **Confirm email: увімкнено** в Supabase Auth settings (вимикаємо "auto-confirm").
- При такому налаштуванні `supabase.auth.signUp()` створює запис користувача, але **сесія не повертається** (`session: null`), доки email не підтверджено — вбудована поведінка Supabase, не потребує кастомної логіки для блокування "напівавторизованого" стану.
- Google OAuth і email-підтвердження використовують один і той самий **PKCE-callback** механізм Supabase (`exchangeCodeForSession`) — тому обидва сценарії обробляє один спільний Route Handler (див. нижче).
- І для `signUp()`, і для `resend()` **явно передається `emailRedirectTo: \`${origin}/auth/callback`**, щоб маршрут підтвердження не залежав від Site URL / Redirect URLs конфігурації в Supabase Dashboard.

### Важливий нюанс Data Access Boundary
Auth-операції (`signUp`, `signInWithPassword`, `signInWithOAuth`, `resend`) — це виклики **Supabase Auth API**, а не запити до Postgres-таблиць через PostgREST. RLS до них не застосовується, тому вони **не підпадають під загальне правило "мутації лише через SSR server client"** з розділу Data Access Boundary. `features/auth/api/mutations.ts` викликає ці методи напряму через **browser Supabase client** (`@supabase/ssr`'s `createBrowserClient`), який сам коректно виставляє session-cookies, читані далі сервером (`proxy.ts`, Route Handlers). Це єдиний свідомий виняток із Data Access Boundary, і причина в ньому явно задокументована.

### Флоу реєстрації (email + пароль)
1. `signup/page.tsx` → `signUp({ email, password, options: { emailRedirectTo } })` через browser client.
2. Відповідь без сесії (очікувано) → редирект на **`check-email/page.tsx`** ("Перевірте пошту"), з email користувача в query/state для показу й для повторного надсилання.
3. На `check-email` — кнопка "Надіслати ще раз" → `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } })`. Проста throttle-логіка на клієнті (напр. disabled 30с після натискання) — Supabase також має власний server-side rate limit на цей виклик.
4. Користувач переходить за посиланням з листа → потрапляє на **`app/auth/callback/route.ts`**.
5. Callback: `exchangeCodeForSession(code)` через SSR server client → встановлює сесію в cookies → редирект на `/` (маршрут-розв'язник, див. нижче).

### Флоу входу (email + пароль)
- `login/page.tsx` → `signInWithPassword({ email, password })` через browser client.
- Якщо email не підтверджено — Supabase поверне помилку `Email not confirmed`; UI показує повідомлення з посиланням "Надіслати лист ще раз" (той самий `resend`).
- Успіх → сесія в cookies → редирект на `/`.

### Флоу Google OAuth
- Кнопка "Увійти через Google" → `signInWithOAuth({ provider: 'google', options: { redirectTo: \`${origin}/auth/callback` } })`.
- Той самий` app/auth/callback/route.ts `обробляє повернення, обмінює` code `на сесію.
- **Об'єднання акаунтів:** якщо існує користувач з тим самим **підтвердженим** email, Supabase Auth автоматично лінкує Google-ідентичність до наявного акаунта (не створює дублікат) — вбудована поведінка, додаткового коду не потребує. Якщо існуючий email-акаунт ще не підтверджений, лінкування не відбудеться з міркувань безпеки (запобігання pre-account takeover) — прийнятний edge case для MVP.

###` app/auth/callback/route.ts `— обробка успіху та помилок
Route Handler обробляє три випадки:
1. **Немає` code `у query params** (напр. користувач відкрив callback-URL напряму) → редирект на` /login?error=missing_code`.
2. **`exchangeCodeForSession(code) `повернув помилку** (протухлий/вже використаний код, мережева помилка) → редирект на` /login?error=auth_callback_failed`.
3. **Успіх** → сесія встановлена в cookies → редирект на` /`.`

login/page.tsx `читає query-параметр` error `і показує відповідне повідомлення користувачу (нейтральне формулювання для обох кодів помилки — не розкриває деталей причини з міркувань безпеки).

### Маршрут-розв'язник після входу (PRD 3.1)
- Callback і успішний логін завжди редиректять на **`app/(app)/page.tsx`** (файлово в route group` (app)`, але сам шлях у URL —` /`).
- Server Component: виконує` SELECT id FROM tasks WHERE user_id = auth.uid() LIMIT 1 `через SSR server client (не` COUNT(*) `— для перевірки існування достатньо одного рядка, дешевше для БД), і одразу викликає` redirect('/brain-dump') `(якщо результат порожній) або` redirect('/today') `(якщо задача знайдена) — на сервері, без проміжного клієнтського рендеру чи миготіння.
- Це не auth-прапорець, а перевірка стану даних щоразу при заході на` / `— узгоджується з раніше прийнятим рішенням.

### Захист маршрутів (`proxy.ts `+` lib/supabase/update-session.ts`)`
proxy.ts `оперує реальними pathname (route groups` (app)`/`(auth) `— файлова конвенція Next.js, не існують в URL і не беруть участі в цій логіці):
-` proxy.ts `викликає` update-session.ts`, який через SSR-сумісний Supabase client оновлює/перевіряє сесію (`getUser()`) на кожен запит, що підпадає під` matcher`.
- Захищені шляхи: `/`, `/today`, `/calendar`, `/drafts`, `/brain-dump` — якщо користувач не автентифікований, редирект на `/login`.
- Auth-шляхи: `/login`, `/signup`, `/check-email` — якщо користувач вже автентифікований, редирект на `/`.
- Завжди доступний без сесії: `/auth/callback` — це і є точка отримання сесії, тому виключений з обох списків вище і з загального `matcher`-захисту.

### `user_settings` — автостворення (безпечна реалізація)
Postgres trigger `AFTER INSERT ON auth.users`**, `FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, timezone)
  VALUES (NEW.id, 'UTC')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
```

- **`SECURITY DEFINER`** — виправданий виняток із загального правила `SECURITY INVOKER` для RPC (розділ API Contract): тригер спрацьовує в системному контексті `auth.users`-інсерту, до появи користувацької сесії, тому не може покладатись на `auth.uid()`.
- **`SET search_path = ''`** — обов'язковий захист від search_path-injection для будь-якої `SECURITY DEFINER` функції; через це всі назви об'єктів усередині повністю кваліфіковані (`public.user_settings`, не просто `user_settings`).
- **`ON CONFLICT (user_id) DO NOTHING`** — ідемпotentність на випадок повторного спрацювання чи ручного втручання; гарантує, що рядок налаштувань існує рівно один раз незалежно від auth-провайдера, яким завершилась реєстрація.

### Оновлення Project Structure (нові файли)

```
app/
├── auth/
│   └── callback/route.ts       # спільний PKCE-callback: email confirm + Google OAuth, з обробкою помилок
├── (auth)/
│   ├── login/page.tsx           # читає ?error= для повідомлень
│   ├── signup/page.tsx
│   └── check-email/page.tsx     # новий екран "Перевірте пошту" + resend
└── (app)/
    ├── page.tsx                  # маршрут-розв'язник: /today чи /brain-dump за наявністю задач
    ├── layout.tsx
    ├── today/page.tsx
    ├── calendar/page.tsx
    ├── drafts/page.tsx
    └── brain-dump/page.tsx
```

`features/auth/api/mutations.ts` — `signUp`, `signInWithPassword`, `signInWithGoogle`, `resendConfirmation` (усі через browser client, як зазначено вище).