// Собственные проверки ПР5 (вариант 4). Сервер поднимается на свободном порту.
import assert from "node:assert/strict";
import { createApiServer } from "../api/server.mjs";
import { ApiError, buildUrl, createApiClient } from "../src/api-client.js";
import { createTaskApi } from "../src/task-api.js";
import { variantFilters } from "../src/variant.js";

let passed = 0;
let failed = 0;

async function check(name, action) {
  try {
    await action();
    passed += 1;
    console.log(`OK: ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL: ${name}`);
    console.error(error.stack ?? error.message);
  }
}

async function expectApiError(action, kind) {
  let caught;
  try {
    await action();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof ApiError, "Ожидался ApiError");
  assert.equal(caught.kind, kind);
  return caught;
}

const server = createApiServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
const client = createApiClient({ baseUrl, timeoutMs: 1000 });
const api = createTaskApi(client);

try {
  await check("С1. вариант 4: priority=medium даёт [1, 10, 19, 28]", async () => {
    const { tasks, meta } = await api.getTasks(variantFilters);
    assert.deepEqual(tasks.map((task) => task.id), [1, 10, 19, 28]);
    assert.equal(meta.total, 4);
    assert.equal(meta.filters.priority, "medium");
  });

  await check("С2. своя комбинация: medium + completed=false даёт [19, 28]", async () => {
    const { tasks, meta } = await api.getTasks({ priority: "medium", completed: false });
    assert.deepEqual(tasks.map((task) => task.id), [19, 28]);
    assert.equal(meta.filters.completed, false);
  });

  await check("С3. q с пробелом, & и кириллицей доходит до сервера без искажений", async () => {
    const url = new URL(buildUrl(baseUrl, "tasks", { q: "API & ошибки", priority: "medium" }));
    assert.equal(url.search, "?q=API+%26+%D0%BE%D1%88%D0%B8%D0%B1%D0%BA%D0%B8&priority=medium");
    const { meta } = await api.getTasks({ q: "  API & ошибки  " });
    assert.equal(meta.filters.q, "API & ошибки");
  });

  await check("С4. HTTP 400 INVALID_QUERY при completed=yes в обход task-api", async () => {
    const error = await expectApiError(
      () => client.requestJson("/tasks", { query: { completed: "yes" } }),
      "http",
    );
    assert.equal(error.status, 400);
    assert.equal(error.code, "INVALID_QUERY");
  });

  await check("С5. HTTP 404 для несуществующей категории", async () => {
    const error = await expectApiError(() => client.requestJson("/categories/999"), "http");
    assert.equal(error.status, 404);
    assert.equal(typeof error.code, "string");
  });

  await check("С6. сигнал, отменённый ещё до вызова, даёт aborted, а не timeout", async () => {
    const controller = new AbortController();
    controller.abort();
    await expectApiError(
      () => client.requestJson("/health", { signal: controller.signal }),
      "aborted",
    );
  });

  await check("С7. граница тайм-аута: задержка 0 мс при лимите 1000 мс проходит", async () => {
    const payload = await client.requestJson("/debug/delay", { query: { ms: 0 } });
    assert.ok(payload !== null && typeof payload === "object");
  });

  await check("С8. одиночная задача без title отклоняется как invalid-response", async () => {
    const fakeApi = createTaskApi({
      async requestJson() {
        return { data: { id: 19, completed: false, priority: "medium", categoryId: 3 } };
      },
    });
    await expectApiError(() => fakeApi.getTaskById(19), "invalid-response");
  });
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log(`\nИтог собственных проверок: успешно ${passed}, ошибок ${failed}.`);
if (failed > 0) process.exitCode = 1;
