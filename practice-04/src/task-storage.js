export const STORAGE_VERSION = 1;

const PRIORITIES = ["low", "medium", "high"];

function isValidTask(task) {
  return (
    task !== null &&
    typeof task === "object" &&
    Number.isSafeInteger(task.id) &&
    task.id > 0 &&
    typeof task.title === "string" &&
    task.title === task.title.trim() &&
    task.title.length >= 1 &&
    task.title.length <= 100 &&
    typeof task.completed === "boolean" &&
    PRIORITIES.includes(task.priority)
  );
}

const copyTasks = (tasks) => tasks.map((task) => ({ ...task }));

export function isValidTaskList(value) {
  if (!Array.isArray(value)) {
    return false;
  }
  const ids = new Set();
  for (const task of value) {
    if (!isValidTask(task) || ids.has(task.id)) {
      return false;
    }
    ids.add(task.id);
  }
  return true;
}

export function loadTasks(storage, key, fallbackTasks) {
  const fallback = copyTasks(fallbackTasks);
  const fail = (error) => ({ ok: false, source: "fallback", tasks: fallback, error });

  let raw;
  try {
    raw = storage.getItem(key);
  } catch (error) {
    return fail(`Не удалось прочитать localStorage (${error.message}). Используется исходный набор.`);
  }

  if (raw === null) {
    return { ok: true, source: "initial", tasks: fallback };
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return fail("Сохранённые данные повреждены (некорректный JSON). Используется исходный набор.");
  }

  if (data === null || typeof data !== "object" || data.version !== STORAGE_VERSION) {
    return fail("Сохранённые данные другой версии или формата. Используется исходный набор.");
  }
  if (!isValidTaskList(data.tasks)) {
    return fail("Сохранённые задачи не прошли проверку. Используется исходный набор.");
  }

  return { ok: true, source: "storage", tasks: copyTasks(data.tasks) };
}

export function saveTasks(storage, key, tasks) {
  if (!isValidTaskList(tasks)) {
    return { ok: false, error: "Список задач некорректен и не был сохранён." };
  }
  try {
    storage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, tasks }));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `Не удалось сохранить в localStorage (${error.message}); после перезагрузки изменения пропадут.` };
  }
}

export function removeSavedTasks(storage, key) {
  try {
    storage.removeItem(key);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `Не удалось удалить сохранённые данные (${error.message}).` };
  }
}
