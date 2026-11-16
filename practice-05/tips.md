# ПР5 — основные моменты (шпаргалка к защите)

**Тема:** Promise, `async`/`await`, `fetch`, классификация ошибок. Вариант 4: `{ priority: "medium" }` → id `[1, 10, 19, 28]`, `meta.total = 4`.

## Запуск

```bash
cd practice-05
npm.cmd test                     # 18 + 26 + 13 + 8 (мои) проверок; сервер поднимать не нужно
npm.cmd start                    # терминал 1: API на http://127.0.0.1:5505/api
npm.cmd run client               # терминал 2: сценарий варианта 4
npm.cmd run example:order        # порядок A–G
npm.cmd run example:experiments  # все виды ошибок + замер Promise.all
```

## Цикл событий (example:order)

Порядок: **A B C D E G F**.

1. Синхронный код: A, B (тело async-функции до первого `await` выполняется сразу), C.
2. Микрозадачи по порядку постановки: D (`then`), E (продолжение после `await`), G (мой `then`).
3. Задача таймера: F. `setTimeout(..., 0)` — это «не раньше следующей задачи», а не «сейчас».

## Promise и async/await

- Состояния: `pending` → `fulfilled` или `rejected`.
- `async`-функция **всегда** возвращает Promise. Без `await` в переменной лежит Promise, а не данные.
- Ошибка внутри `await` попадает в `try/catch` вызывающего кода. Пустой `catch` не использую.
- Независимые запросы: сначала **создать** оба Promise, потом `await Promise.all([...])`. Замер: два `await` подряд ≈ 405 мс, `Promise.all` ≈ 205 мс (две задержки по 200 мс).
- `Promise.all` при первой ошибке отклоняется, **остальные запросы не отменяет**.

## fetch — главное

- `fetch` **не** отклоняется на 404/500: ответ пришёл. Проверка вручную: `response.ok` (200–299).
- `fetch` отклоняется только когда ответа нет: сеть, неверный URL, отмена.
- `response.json()` тоже возвращает Promise и может бросить `SyntaxError`. Тело читается один раз.
- `204 No Content` → возвращаю `null`, `json()` не вызываю.

## Порядок в `requestJson` (api-client.js)

```text
buildUrl → AbortSignal.timeout (+ AbortSignal.any с внешним сигналом)
→ try { response = await fetchFn(...) } catch → network | timeout | aborted
→ это Response?             нет → invalid-response
→ !response.ok              → http (status, code, details из payload.error)
→ 204                       → null
→ Content-Type не JSON      → invalid-response
→ await response.json()     ошибка → invalid-response (cause: SyntaxError)
```

**Почему `try` только вокруг `fetchFn`:** иначе `ApiError` вида `http`, брошенный ниже, попал бы в тот же `catch` и превратился бы в `network`.

## Пять видов ApiError

| `kind` | Когда | Пример из моего прогона |
|---|---|---|
| `http` | статус не 2xx | `/tasks/999` → 404 `TASK_NOT_FOUND` |
| `network` | ответа нет | API остановлен → «Сервер недоступен» |
| `invalid-response` | не JSON / битый JSON / не та схема | `/debug/text`, `/debug/invalid-json` |
| `timeout` | истёк `AbortSignal.timeout` | 150 мс задержки при лимите 20 мс |
| `aborted` | вызывающий код сделал `controller.abort()` | |

Различаю timeout и aborted так: в `catch` сначала `signal?.aborted` (внешний), потом `timeoutSignal.aborted`.

## buildUrl

- Только `new URL` + `url.searchParams.set` — кодирует пробел, `&`, кириллицу. Склейка строк запрещена.
- Пропускаю только `undefined`, `null`, `""`. **`false` и `0` сохраняю** — `if (value)` их бы выкинул.
- `baseUrl`: абсолютный `http/https`, без `?query` и `#hash`; лишние `/` на стыке убираю.

## task-api.js

- Фильтры проверяются **до** запроса (`TypeError`): только `completed` (boolean), `priority`, `categoryId` (целое > 0), `q` (строка ≤ 100 после `trim`). Неизвестный ключ — ошибка.
- Ответ проверяется **после**: `data` — массив, каждый элемент `isTask`/`isCategory`, id уникальны (`Set`), `meta.total === data.length`. Нарушение → `invalid-response`.
- `fetchFn` передаётся в `createApiClient` → в модульных тестах подставляется фейковый `fetch`, сеть не нужна.

## Частые вопросы

- *Чем HTTP-ошибка отличается от сетевой?* HTTP — сервер ответил с ошибкой (есть статус). Сетевая — ответа нет вовсе.
- *Зачем проверять `Content-Type`?* `200` может прийти с HTML прокси или текстом — `json()` упадёт или вернёт мусор.
- *Почему тайм-аут через `AbortSignal`, а не `Promise.race`?* `race` перестаёт ждать, но запрос продолжает идти; сигнал реально прерывает `fetch`.
- *CORS?* Проверяется браузером между разными origin; запросы из Node.js его не проверяют. `no-cors` проблему не решает.
