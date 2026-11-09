import { demoTasks, variantNumber, variantTasks } from "./data.js";
import {
  createTask,
  findTaskById,
  getPendingTasks,
  getTaskTitles,
  getTaskStats,
  addTask,
  setTaskCompleted,
  renameTask,
  removeTask,
} from "./task-service.js";

function printStats(label, tasks) {
  const { total, completed, pending, progress } = getTaskStats(tasks);
  console.log(`${label}: всего ${total}, выполнено ${completed}, осталось ${pending}`);
  if (total === 0) {
    console.log("Задач пока нет");
  } else {
    console.log(`Прогресс: ${progress.toFixed(1)}%`);
  }
}

function apply(tasks, label, result) {
  if (!result.ok) {
    console.log(`${label} — ошибка: ${result.error}`);
    return tasks;
  }
  printStats(label, result.tasks);
  return result.tasks;
}

const ids = (tasks) => tasks.map((task) => task.id);

console.log("=== Общий сценарий ===");
const demoSnapshot = JSON.stringify(demoTasks);
let current = demoTasks;

console.table(current);
console.log("Названия:", getTaskTitles(current));
console.log("Не выполнены:", ids(getPendingTasks(current)));
console.log("Задача id 4:", findTaskById(current, 4));
printStats("Исходный набор", current);

current = apply(current, "Добавление id 20", addTask(current, 20, "Добавить проверку", "high"));
current = apply(current, "Выполнение id 4", setTaskCompleted(current, 4, true));
current = apply(current, "Переименование id 10", renameTask(current, 10, "Подготовить инструкцию запуска"));
current = apply(current, "Удаление id 7", removeTask(current, 7));

const beforeFailures = current;
current = apply(current, "Повторное добавление id 20", addTask(current, 20, "Дубликат", "low"));
current = apply(current, "Статус строкой \"true\"", setTaskCompleted(current, 1, "true"));
current = apply(current, "Удаление id 999", removeTask(current, 999));
console.log("Состояние после ошибок не изменилось:", current === beforeFailures);

console.log("Итоговые id:", ids(current));
console.log("Не выполнены:", ids(getPendingTasks(current)));
console.log("demoTasks не изменился:", JSON.stringify(demoTasks) === demoSnapshot);

console.log();
console.log(`=== Вариант ${variantNumber}: подготовка семинара ===`);
const variantSnapshot = JSON.stringify(variantTasks);
let mine = variantTasks;

console.table(mine);
printStats("Исходный набор", mine);

mine = apply(mine, "Добавление id 80", addTask(mine, 80, "Собрать отзывы участников", "high"));
mine = apply(mine, "Выполнение id 11", setTaskCompleted(mine, 11, true));
mine = apply(mine, "Переименование id 23", renameTask(mine, 23, "  Забронировать аудиторию с проектором  "));
mine = apply(mine, "Удаление id 37", removeTask(mine, 37));

const beforeDuplicate = mine;
mine = apply(mine, "Повторное добавление id 80", addTask(mine, 80, "Ещё раз отзывы", "high"));
console.log("Список после отказа не изменился:", mine === beforeDuplicate);

console.table(mine);
printStats("Итог варианта", mine);
console.log("variantTasks не изменился:", JSON.stringify(variantTasks) === variantSnapshot);

console.log();
console.log("createTask с пробелами в названии:", createTask(99, "  Проверить  данные  "));
