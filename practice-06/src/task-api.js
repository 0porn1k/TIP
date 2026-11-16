import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function isTask(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.title === "string"
    && value.title.trim().length >= 1
    && value.title.trim().length <= 100
    && typeof value.completed === "boolean"
    && ALLOWED_PRIORITIES.has(value.priority)
    && isPositiveSafeInteger(value.categoryId),
  );
}

export function isCategory(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.name === "string"
    && value.name.trim().length >= 1
    && value.name.trim().length <= 100,
  );
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function checkId(id) {
  if (!isPositiveSafeInteger(id)) {
    throw new TypeError("id задачи должен быть положительным безопасным целым числом.");
  }
}

// Из { signal } берём только signal: общий клиент не должен получить лишнего.
function signalOnly(options = {}) {
  return options.signal === undefined ? {} : { signal: options.signal };
}

// Проверка фильтров до запроса (перенесено из ПР5).
function normalizeFilters(filters) {
  if (!isPlainObject(filters)) {
    throw new TypeError("Фильтры должны быть обычным объектом.");
  }
  for (const name of Object.keys(filters)) {
    if (!ALLOWED_FILTERS.has(name)) throw new TypeError(`Неизвестный фильтр: ${name}`);
  }

  const query = {};
  const { completed, priority, categoryId, q } = filters;

  if (completed !== undefined) {
    if (typeof completed !== "boolean") throw new TypeError("completed должен быть true или false.");
    query.completed = completed;
  }
  if (priority !== undefined) {
    if (!ALLOWED_PRIORITIES.has(priority)) throw new TypeError("priority должен быть low, medium или high.");
    query.priority = priority;
  }
  if (categoryId !== undefined) {
    if (!isPositiveSafeInteger(categoryId)) throw new TypeError("categoryId должен быть положительным целым.");
    query.categoryId = categoryId;
  }
  if (q !== undefined) {
    if (typeof q !== "string") throw new TypeError("q должен быть строкой.");
    const text = q.trim();
    if (text.length > 100) throw new TypeError("q не длиннее 100 символов.");
    if (text !== "") query.q = text;
  }
  return query;
}

function validateCollection(payload, isItem, label) {
  if (!isPlainObject(payload) || !Array.isArray(payload.data)) {
    throw invalidResponse(`Ответ ${label}: поле data должно быть массивом.`);
  }
  const ids = new Set();
  for (const item of payload.data) {
    if (!isItem(item)) throw invalidResponse(`Ответ ${label}: элемент не соответствует схеме.`);
    if (ids.has(item.id)) throw invalidResponse(`Ответ ${label}: повторяется id ${item.id}.`);
    ids.add(item.id);
  }
  if (!isPlainObject(payload.meta) || payload.meta.total !== payload.data.length) {
    throw invalidResponse(`Ответ ${label}: meta.total не совпадает с длиной data.`);
  }
  return payload.data;
}

function validateSingleTask(payload, label) {
  if (!isPlainObject(payload) || !isTask(payload.data)) {
    throw invalidResponse(`Ответ ${label}: задача не соответствует схеме.`);
  }
  return payload.data;
}

// Методы результата:
// getTasks, getTaskById, getCategories, loadInitialData, createTask, updateTask,
// setTaskCompleted, deleteTask и resetDemoData.
// Последний аргумент каждого метода данных — { signal }.
export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("Нужен клиент с методом requestJson.");
  }

  async function getTasks(filters = {}, options = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", { query, ...signalOnly(options) });
    const tasks = validateCollection(payload, isTask, "/tasks");
    return { tasks, meta: payload.meta };
  }

  async function getTaskById(id, options = {}) {
    checkId(id);
    const payload = await client.requestJson(`/tasks/${id}`, signalOnly(options));
    return validateSingleTask(payload, `/tasks/${id}`);
  }

  async function getCategories(options = {}) {
    const payload = await client.requestJson("/categories", signalOnly(options));
    return validateCollection(payload, isCategory, "/categories");
  }

  async function loadInitialData(filters = {}, options = {}) {
    const [{ tasks, meta }, categories] = await Promise.all([
      getTasks(filters, options),
      getCategories(options),
    ]);
    return { tasks, categories, meta };
  }

  // id и completed назначает сервер — в тело создания они не попадают.
  async function createTask(draft, options = {}) {
    if (!isPlainObject(draft)) throw new TypeError("draft должен быть объектом.");
    const { title, priority, categoryId } = draft;
    const payload = await client.requestJson("/tasks", {
      method: "POST",
      body: { title, priority, categoryId },
      ...signalOnly(options),
    });
    return validateSingleTask(payload, "POST /tasks");
  }

  async function updateTask(id, changes, options = {}) {
    checkId(id);
    if (!isPlainObject(changes) || Object.keys(changes).length === 0) {
      throw new TypeError("changes должен быть непустым объектом.");
    }
    const payload = await client.requestJson(`/tasks/${id}`, {
      method: "PATCH",
      body: { ...changes },
      ...signalOnly(options),
    });
    return validateSingleTask(payload, `PATCH /tasks/${id}`);
  }

  async function setTaskCompleted(id, completed, options = {}) {
    if (typeof completed !== "boolean") throw new TypeError("completed должен быть boolean.");
    return updateTask(id, { completed }, options);
  }

  async function deleteTask(id, options = {}) {
    checkId(id);
    const payload = await client.requestJson(`/tasks/${id}`, {
      method: "DELETE",
      ...signalOnly(options),
    });
    if (payload !== null) {
      throw invalidResponse(`DELETE /tasks/${id}: ожидался ответ 204 без тела.`);
    }
    return null;
  }

  async function resetDemoData(options = {}) {
    const payload = await client.requestJson("/debug/reset", {
      method: "POST",
      ...signalOnly(options),
    });
    const data = payload?.data;
    if (!isPlainObject(data) || data.reset !== true || !Number.isSafeInteger(data.total)) {
      throw invalidResponse("POST /debug/reset: неожиданный ответ.");
    }
    return data;
  }

  return {
    getTasks,
    getTaskById,
    getCategories,
    loadInitialData,
    createTask,
    updateTask,
    setTaskCompleted,
    deleteTask,
    resetDemoData,
  };
}
