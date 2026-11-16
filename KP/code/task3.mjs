const demoTasks = [
  { id: 1, title: "Изучить функции", completed: true, priority: "medium" },
  { id: 4, title: "Подготовить модель задач", completed: false, priority: "high" },
  { id: 7, title: "Проверить методы массивов", completed: false, priority: "low" },
  { id: 10, title: "Оформить README", completed: true, priority: "medium" },
];

function checkId(id) {
  if (typeof id !== "number") {
    return "Идентификатор должен быть числом";
  }
  if (!Number.isSafeInteger(id) || id <= 0) {
    return "Идентификатор должен быть положительным целым числом";
  }
  return null;
}

function findTaskById(tasks, id) {
  return tasks.find((task) => task.id === id);
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

function setTaskCompleted(tasks, id, completed) {
  if (typeof completed !== "boolean") {
    return { ok: false, error: "Статус выполнения должен быть true или false" };
  }
  return updateTask(tasks, id, { completed });
}

const result = setTaskCompleted(demoTasks, 4, true);
console.log("setTaskCompleted(demoTasks, 4, true) -> ok:", result.ok);
console.log("Новая запись id 4, completed:", findTaskById(result.tasks, 4).completed);
console.log("Исходная запись id 4, completed:", findTaskById(demoTasks, 4).completed);
console.log("Новый объект задачи:", findTaskById(result.tasks, 4) !== findTaskById(demoTasks, 4));

const failed = setTaskCompleted(demoTasks, 777, true);
console.log("setTaskCompleted(demoTasks, 777, true) ->", failed);
console.log("demoTasks после отказа:", demoTasks.map((task) => `${task.id}:${task.completed}`).join(", "));
