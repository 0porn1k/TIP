const PRIORITIES = ["low", "medium", "high"];
const MAX_TITLE_LENGTH = 100;

function checkId(id) {
  if (typeof id !== "number") {
    return "Идентификатор должен быть числом";
  }
  if (!Number.isSafeInteger(id) || id <= 0) {
    return "Идентификатор должен быть положительным целым числом";
  }
  return null;
}

function normalizeTitle(title) {
  if (typeof title !== "string") {
    return { ok: false, error: "Название должно быть строкой" };
  }
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Название не может быть пустым" };
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: `Название длиннее ${MAX_TITLE_LENGTH} символов` };
  }
  return { ok: true, title: trimmed };
}

export function createTask(id, title, priority = "medium") {
  const idError = checkId(id);
  if (idError) {
    return { ok: false, error: idError };
  }

  const titleResult = normalizeTitle(title);
  if (!titleResult.ok) {
    return titleResult;
  }

  if (!PRIORITIES.includes(priority)) {
    return { ok: false, error: "Приоритет должен быть low, medium или high" };
  }

  return {
    ok: true,
    task: { id, title: titleResult.title, completed: false, priority },
  };
}

export function findTaskById(tasks, id) {
  return tasks.find((task) => task.id === id);
}

export function getPendingTasks(tasks) {
  return tasks.filter((task) => task.completed === false);
}

export function getTaskTitles(tasks) {
  return tasks.map((task) => task.title);
}

export function getTaskStats(tasks) {
  const total = tasks.length;
  let completed = 0;

  for (const task of tasks) {
    if (task.completed === true) {
      completed += 1;
    }
  }

  const progress = total > 0 ? (completed / total) * 100 : 0;
  return { total, completed, pending: total - completed, progress };
}

export function addTask(tasks, id, title, priority = "medium") {
  const created = createTask(id, title, priority);
  if (!created.ok) {
    return created;
  }

  if (findTaskById(tasks, id) !== undefined) {
    return { ok: false, error: `Задача с id ${id} уже существует` };
  }

  return { ok: true, tasks: [...tasks, created.task] };
}

function updateTask(tasks, id, changes) {
  const idError = checkId(id);
  if (idError) {
    return { ok: false, error: idError };
  }

  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: `Задача с id ${id} не найдена` };
  }

  return {
    ok: true,
    tasks: tasks.map((task) => (task.id === id ? { ...task, ...changes } : task)),
  };
}

export function setTaskCompleted(tasks, id, completed) {
  if (typeof completed !== "boolean") {
    return { ok: false, error: "Статус выполнения должен быть true или false" };
  }
  return updateTask(tasks, id, { completed });
}

export function renameTask(tasks, id, title) {
  const titleResult = normalizeTitle(title);
  if (!titleResult.ok) {
    return titleResult;
  }
  return updateTask(tasks, id, { title: titleResult.title });
}

export function removeTask(tasks, id) {
  const idError = checkId(id);
  if (idError) {
    return { ok: false, error: idError };
  }

  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: `Задача с id ${id} не найдена` };
  }

  return { ok: true, tasks: tasks.filter((task) => task.id !== id) };
}
