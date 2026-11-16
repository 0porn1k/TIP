import { ApiError } from "./api-client.js";
import { validateTaskDraft } from "./form-validation.js";

export function messageForError(error) {
  if (!(error instanceof ApiError)) return "Не удалось выполнить операцию.";
  if (error.kind === "timeout") return "Сервер не ответил вовремя. Попробуйте ещё раз.";
  if (error.kind === "network") return "Нет соединения с учебным API. Проверьте, запущен ли npm start.";
  if (error.kind === "invalid-response") return "Сервер вернул ответ неожиданного формата.";
  if (error.kind === "http" && error.status === 404) return "Запись уже отсутствует на сервере. Обновите список.";
  if (error.kind === "http") return error.message || `Сервер вернул ошибку ${error.status}.`;
  return "Не удалось выполнить операцию.";
}

const API_METHODS = [
  "loadInitialData", "getTasks", "createTask", "updateTask",
  "setTaskCompleted", "deleteTask", "resetDemoData",
];
const VIEW_METHODS = [
  "setListState", "setTasks", "setCategories", "setTotal",
  "setFormTask", "showFormErrors", "setMutationPending", "notify",
];

function requireMethods(target, names, label) {
  if (!target || typeof target !== "object") {
    throw new TypeError(`Не передан ${label}.`);
  }
  for (const name of names) {
    if (typeof target[name] !== "function") {
      throw new TypeError(`${label} должен содержать метод ${name}.`);
    }
  }
}

function isAbort(error) {
  return error instanceof ApiError && error.kind === "aborted";
}

// view — адаптер из dom-app.js. Контроллер не должен обращаться к document.
export function createAppController({ api, view, validateDraft = validateTaskDraft } = {}) {
  requireMethods(api, API_METHODS, "api");
  requireMethods(view, VIEW_METHODS, "view");

  const state = {
    tasks: [],
    categories: null, // null — категории ещё ни разу не получены
    filters: {},
    editingId: null,
  };
  let loadController = null; // AbortController активной загрузки
  let loadSequence = 0; // номер последней загрузки
  let mutating = false;

  // Единая загрузка списка: отмена предыдущей + проверка номера ответа.
  async function load() {
    loadController?.abort();
    const controller = new AbortController();
    loadController = controller;
    const sequence = ++loadSequence;
    const filters = { ...state.filters };
    const needInitial = state.categories === null;

    view.setListState("loading");
    try {
      let tasks;
      let meta;
      if (needInitial) {
        const result = await api.loadInitialData(filters, { signal: controller.signal });
        if (sequence !== loadSequence) return; // устаревший ответ — игнорируем
        state.categories = result.categories;
        view.setCategories(result.categories);
        ({ tasks, meta } = result);
      } else {
        ({ tasks, meta } = await api.getTasks(filters, { signal: controller.signal }));
        if (sequence !== loadSequence) return;
      }

      state.tasks = tasks;
      view.setTasks(tasks, state.categories);
      view.setTotal(meta?.total ?? tasks.length);
      view.setListState(tasks.length === 0 ? "empty" : "ready");
    } catch (error) {
      // Отмена — штатное управление потоком, пользователю не показывается.
      if (sequence !== loadSequence || isAbort(error)) return;
      view.setListState("error", messageForError(error));
    } finally {
      if (loadController === controller) loadController = null;
    }
  }

  // Общая схема мутации: блокировка → запрос → сообщение → повторный GET → разблокировка.
  async function mutate(action, successMessage, onSuccess) {
    if (mutating) return false;
    mutating = true;
    view.setMutationPending(true);
    try {
      await action();
      onSuccess?.();
      view.notify(successMessage, "success");
      await load();
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.kind === "http" && error.code === "VALIDATION_ERROR"
        && error.details && typeof error.details === "object") {
        view.showFormErrors(error.details);
      }
      view.notify(messageForError(error), "error");
      return false;
    } finally {
      mutating = false;
      view.setMutationPending(false);
    }
  }

  function findTask(id) {
    return state.tasks.find((task) => task.id === id) ?? null;
  }

  function resetForm() {
    state.editingId = null;
    view.setFormTask(null);
    view.showFormErrors({});
  }

  return {
    start(filters = {}) {
      state.filters = { ...filters };
      return load();
    },

    applyFilters(filters = {}) {
      state.filters = { ...filters };
      return load();
    },

    refresh() {
      return load();
    },

    async submit(draft) {
      const result = validateDraft(draft, state.categories ?? []);
      view.showFormErrors(result.errors);
      if (!result.valid) return false;

      const editingId = state.editingId;
      if (editingId === null) {
        return mutate(() => api.createTask(result.value), "Задача добавлена.", resetForm);
      }
      // completed не передаём: редактирование не меняет статус.
      return mutate(() => api.updateTask(editingId, result.value), "Изменения сохранены.", resetForm);
    },

    beginEdit(id) {
      const task = findTask(id);
      if (!task) {
        view.notify("Задача не найдена в текущем списке.", "error");
        return;
      }
      state.editingId = id;
      view.showFormErrors({});
      view.setFormTask(task);
    },

    cancelEdit() {
      resetForm();
    },

    async toggleTask(id) {
      const task = findTask(id);
      if (!task) {
        view.notify("Задача не найдена в текущем списке.", "error");
        return false;
      }
      const next = !task.completed;
      return mutate(
        () => api.setTaskCompleted(id, next),
        next ? "Задача выполнена." : "Задача возвращена в работу.",
      );
    },

    async deleteTask(id) {
      return mutate(() => api.deleteTask(id), "Задача удалена.", () => {
        if (state.editingId === id) resetForm();
      });
    },

    async resetData() {
      return mutate(() => api.resetDemoData(), "Исходные данные восстановлены.", resetForm);
    },

    destroy() {
      loadSequence += 1; // любой незавершённый ответ станет устаревшим
      loadController?.abort();
      loadController = null;
    },
  };
}
