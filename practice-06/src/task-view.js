const PRIORITY_LABELS = Object.freeze({
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
});

// Весь текст с сервера попадает в DOM только через textContent.
function createElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function createActionButton(action, label) {
  const button = createElement("button");
  button.type = "button";
  button.dataset.action = action;
  button.append(createElement("span", "action-label", label));
  return button;
}

export function createTaskElement(task, category) {
  const card = createElement("li", "task-card");
  card.dataset.taskId = String(task.id);
  card.classList.toggle("is-completed", task.completed);

  const title = createElement("h3", "task-title", task.title);

  const meta = createElement("p", "task-meta");
  meta.append(
    createElement("span", "task-status", task.completed ? "Выполнена" : "В работе"),
    createElement("span", "task-priority", `Приоритет: ${PRIORITY_LABELS[task.priority] ?? task.priority}`),
  );
  const categoryLabel = createElement("span", "task-category-label", "Категория: ");
  categoryLabel.append(createElement("span", "task-category", category?.name ?? "Неизвестно"));
  meta.append(categoryLabel);

  const toggle = createActionButton("toggle", task.completed ? "Вернуть в работу" : "Выполнена");
  toggle.setAttribute("aria-pressed", String(task.completed));

  const actions = createElement("div", "task-actions");
  actions.append(
    toggle,
    createActionButton("edit", "Изменить"),
    createActionButton("delete", "Удалить"),
  );

  card.append(title, meta, actions);
  return card;
}

export function renderTaskList(list, tasks, categories) {
  const byId = new Map((categories ?? []).map((category) => [category.id, category]));
  // replaceChildren удаляет старые карточки — повторная отрисовка не накапливает их.
  list.replaceChildren(...tasks.map((task) => createTaskElement(task, byId.get(task.categoryId))));
}
