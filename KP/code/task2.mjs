const demoTasks = [
  { id: 1, title: "Изучить функции", completed: true, priority: "medium" },
  { id: 4, title: "Подготовить модель задач", completed: false, priority: "high" },
  { id: 7, title: "Проверить методы массивов", completed: false, priority: "low" },
  { id: 10, title: "Оформить README", completed: true, priority: "medium" },
];

function getPendingTasks(tasks) {
  return tasks.filter((task) => task.completed === false);
}

const pending = getPendingTasks(demoTasks);
console.log("getPendingTasks(demoTasks) -> id:", pending.map((task) => task.id));
console.log("getPendingTasks([]) ->", getPendingTasks([]));
console.log("demoTasks не изменился, id:", demoTasks.map((task) => task.id), "длина:", demoTasks.length);
