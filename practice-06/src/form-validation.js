const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

// Возвращает { valid, value, errors }.
// value содержит нормализованные title, priority и числовой categoryId.
// Функция не читает DOM и не меняет входные объекты.
export function validateTaskDraft(draft, categories) {
  const source = draft ?? {};
  const knownCategories = Array.isArray(categories) ? categories : [];
  const errors = {};

  const title = typeof source.title === "string" ? source.title.trim() : "";
  if (title.length < 1 || title.length > 100) {
    errors.title = "Название должно содержать от 1 до 100 символов.";
  }

  const priority = source.priority;
  if (!ALLOWED_PRIORITIES.has(priority)) {
    errors.priority = "Выберите приоритет: низкий, средний или высокий.";
  }

  // Из <select> приходит строка: "" → нет выбора, "2" → 2.
  const rawCategory = source.categoryId;
  const categoryId = typeof rawCategory === "string" && rawCategory.trim() !== ""
    ? Number(rawCategory)
    : rawCategory;
  const categoryExists = Number.isSafeInteger(categoryId)
    && knownCategories.some((category) => category.id === categoryId);
  if (!categoryExists) {
    errors.categoryId = "Выберите существующую категорию.";
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    value: valid ? { title, priority, categoryId } : null,
    errors,
  };
}
