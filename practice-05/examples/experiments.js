// Эксперименты для отчёта: классификация ошибок и сравнение
// последовательного ожидания с Promise.all. Требует запущенного API (npm start).
import { ApiError, createApiClient } from "../src/api-client.js";
import { createTaskApi } from "../src/task-api.js";

const baseUrl = process.env.API_URL ?? "http://127.0.0.1:5505/api";
const client = createApiClient({ baseUrl, timeoutMs: 2000 });
const api = createTaskApi(client);

function short(error) {
  if (!(error instanceof ApiError)) return `не ApiError: ${error.message}`;
  return JSON.stringify({
    kind: error.kind,
    status: error.status,
    code: error.code,
    details: error.details,
    message: error.message,
    cause: error.cause?.name ?? null,
  });
}

async function attempt(label, action) {
  try {
    await action();
    console.log(`${label}: успех`);
  } catch (error) {
    console.log(`${label}: ${short(error)}`);
  }
}

console.log("--- Классификация ошибок ---");
await attempt("Задача 999", () => api.getTaskById(999));
await attempt("completed=yes", () => client.requestJson("/tasks", { query: { completed: "yes" } }));
await attempt("/debug/error", () => client.requestJson("/debug/error"));
await attempt("/debug/invalid-json", () => client.requestJson("/debug/invalid-json"));
await attempt("/debug/text", () => client.requestJson("/debug/text"));
await attempt("Тайм-аут 20 мс на задержке 150 мс", () => client.requestJson("/debug/delay", {
  query: { ms: 150 },
  timeoutMs: 20,
}));
await attempt("Явный abort()", async () => {
  const controller = new AbortController();
  const pending = client.requestJson("/debug/delay", {
    query: { ms: 150 },
    signal: controller.signal,
    timeoutMs: 1000,
  });
  controller.abort();
  await pending;
});
const offline = createApiClient({ baseUrl: "http://127.0.0.1:5599/api", timeoutMs: 1000 });
await attempt("Порт без сервера (5599)", () => offline.requestJson("/health"));

console.log("\n--- Доменный модуль ---");
const all = await api.getTasks();
console.log("getTasks():", all.meta.total, all.tasks.map((task) => task.id));
const hot = await api.getTasks({ completed: false, priority: "high" });
console.log("getTasks({completed:false, priority:'high'}):", hot.meta.total, hot.tasks.map((task) => task.id));
console.log("getTaskById(25):", JSON.stringify(await api.getTaskById(25)));
console.log("getCategories():", JSON.stringify(await api.getCategories()));

console.log("\n--- Последовательно vs Promise.all (2 × /debug/delay?ms=200) ---");
const delay = () => client.requestJson("/debug/delay", { query: { ms: 200 } });
for (let run = 1; run <= 3; run += 1) {
  let start = performance.now();
  await delay();
  await delay();
  const sequential = performance.now() - start;

  start = performance.now();
  await Promise.all([delay(), delay()]);
  const parallel = performance.now() - start;

  console.log(`Запуск ${run}: последовательно ${sequential.toFixed(1)} мс, Promise.all ${parallel.toFixed(1)} мс`);
}
