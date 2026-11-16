import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isTask(value) {
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

function isCategory(value) {
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

// Проверяет фильтры ДО запроса и возвращает новый объект без лишнего.
// false остаётся логическим значением: в строку его превратит URLSearchParams.
function normalizeFilters(filters) {
  if (!isPlainObject(filters)) {
    throw new TypeError("Фильтры должны быть обычным объектом.");
  }

  for (const name of Object.keys(filters)) {
    if (!ALLOWED_FILTERS.has(name)) {
      throw new TypeError(`Неизвестный фильтр: ${name}`);
    }
  }

  const query = {};
  const { completed, priority, categoryId, q } = filters;

  if (completed !== undefined) {
    if (typeof completed !== "boolean") {
      throw new TypeError("completed должен быть true или false.");
    }
    query.completed = completed;
  }

  if (priority !== undefined) {
    if (!ALLOWED_PRIORITIES.has(priority)) {
      throw new TypeError("priority должен быть low, medium или high.");
    }
    query.priority = priority;
  }

  if (categoryId !== undefined) {
    if (!isPositiveSafeInteger(categoryId)) {
      throw new TypeError("categoryId должен быть положительным целым числом.");
    }
    query.categoryId = categoryId;
  }

  if (q !== undefined) {
    if (typeof q !== "string") {
      throw new TypeError("q должен быть строкой.");
    }
    const text = q.trim();
    if (text.length > 100) {
      throw new TypeError("q не длиннее 100 символов.");
    }
    if (text !== "") query.q = text;
  }

  return query;
}

// Общая проверка коллекции: массив, схема элементов, уникальные id, meta.total.
function validateCollection(payload, isItem, label) {
  if (!isPlainObject(payload) || !Array.isArray(payload.data)) {
    throw invalidResponse(`Ответ ${label}: поле data должно быть массивом.`);
  }

  const ids = new Set();
  for (const item of payload.data) {
    if (!isItem(item)) {
      throw invalidResponse(`Ответ ${label}: элемент не соответствует схеме.`);
    }
    if (ids.has(item.id)) {
      throw invalidResponse(`Ответ ${label}: повторяется id ${item.id}.`);
    }
    ids.add(item.id);
  }

  if (!isPlainObject(payload.meta) || payload.meta.total !== payload.data.length) {
    throw invalidResponse(`Ответ ${label}: meta.total не совпадает с длиной data.`);
  }

  return payload.data;
}

// client — объект, созданный createApiClient.
// Контракт результата:
// getTasks(filters) -> Promise<{ tasks, meta }>
// getTaskById(id) -> Promise<task>
// getCategories() -> Promise<category[]>
// loadInitialData(filters) -> Promise<{ tasks, categories, meta }>
export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("Нужен клиент с методом requestJson.");
  }

  async function getTasks(filters = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", { query });
    const tasks = validateCollection(payload, isTask, "/tasks");
    return { tasks, meta: payload.meta };
  }

  async function getTaskById(id) {
    if (!isPositiveSafeInteger(id)) {
      throw new TypeError("id задачи должен быть положительным безопасным целым числом.");
    }
    const payload = await client.requestJson(`/tasks/${id}`);
    if (!isPlainObject(payload) || !isTask(payload.data)) {
      throw invalidResponse(`Ответ /tasks/${id}: задача не соответствует схеме.`);
    }
    return payload.data;
  }

  async function getCategories() {
    const payload = await client.requestJson("/categories");
    return validateCollection(payload, isCategory, "/categories");
  }

  // Оба запроса стартуют сразу, ждём их вместе.
  async function loadInitialData(filters = {}) {
    const tasksPromise = getTasks(filters);
    const categoriesPromise = getCategories();
    const [{ tasks, meta }, categories] = await Promise.all([tasksPromise, categoriesPromise]);
    return { tasks, categories, meta };
  }

  return { getTasks, getTaskById, getCategories, loadInitialData };
}
