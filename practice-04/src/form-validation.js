const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const MAX_TITLE_LENGTH = 100;

function parseId(rawId) {
  if (typeof rawId === "string" && rawId.trim() === "") {
    return { error: "Укажите идентификатор" };
  }
  if (typeof rawId !== "string" && typeof rawId !== "number") {
    return { error: "Укажите идентификатор" };
  }
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { error: "Идентификатор должен быть положительным целым числом" };
  }
  return { id };
}

export function validateTaskDraft(draft, tasks, editingId = null) {
  const errors = {};
  const isEditing = editingId !== null;
  let id;

  if (isEditing) {
    if (!Number.isSafeInteger(editingId) || editingId <= 0 || !tasks.some((task) => task.id === editingId)) {
      errors.id = "Редактируемая задача не найдена";
    } else {
      id = editingId;
    }
  } else {
    const parsed = parseId(draft.id);
    if (parsed.error) {
      errors.id = parsed.error;
    } else if (tasks.some((task) => task.id === parsed.id)) {
      errors.id = `Задача с id ${parsed.id} уже существует`;
    } else {
      id = parsed.id;
    }
  }

  let title;
  if (typeof draft.title !== "string") {
    errors.title = "Укажите название";
  } else {
    title = draft.title.trim();
    if (title.length === 0) {
      errors.title = "Название не может состоять только из пробелов";
    } else if (title.length > MAX_TITLE_LENGTH) {
      errors.title = `Название длиннее ${MAX_TITLE_LENGTH} символов`;
    }
  }

  if (!ALLOWED_PRIORITIES.has(draft.priority)) {
    errors.priority = "Выберите приоритет: низкий, средний или высокий";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { id, title, priority: draft.priority } };
}
