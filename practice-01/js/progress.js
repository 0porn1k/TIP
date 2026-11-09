"use strict";

const totalTasks = 20;
const completedTasks = 11;


// Проверка на то, что переданы именно числа 
if (typeof totalTasks !== 'number' || typeof completedTasks !== 'number') {
    console.log("Ошибка: вместо числа передана строка.");
} 
// Проверка на NaN 
else if (Number.isNaN(totalTasks) || Number.isNaN(completedTasks)) {
    console.log("Ошибка: недопустимое числовое значение.");
} 
// Проверка на целые числа 
else if (!Number.isInteger(totalTasks) || !Number.isInteger(completedTasks)) {
    console.log("Ошибка: дробное количество.");
} 
// Проверка на отрицательные значения
else if (totalTasks < 0 || completedTasks < 0) {
    console.log("Ошибка: отрицательное количество.");
} 
// Проверка верхней границы для totalTasks
else if (totalTasks > 1000) {
    console.log("Ошибка: превышена верхняя граница.");
} 
// Проверка, что выполненных задач не больше, чем всего
else if (completedTasks > totalTasks) {
    console.log("Ошибка: выполнено больше, чем существует.");
} 
// Основная логика 
else {
    // Обработка случая, когда задач вообще нет
    if (totalTasks === 0 && completedTasks === 0) {
        console.log("Задач пока нет. Процент в этом случае не рассчитывается.");
    } else {
        // Вычисления
        const remaining = totalTasks - completedTasks;
        const progress = ((completedTasks / totalTasks) * 100).toFixed(1); // Один знак после запятой
        let status = "";

        // Определение статуса
        if (completedTasks === 0) {
            status = "Не начато";
        } else if (completedTasks === totalTasks) {
            status = "Завершено";
        } else {
            status = "В работе";
        }

        // Вывод результата
        console.log(`Всего задач: ${totalTasks}`);
        console.log(`Выполнено: ${completedTasks}`);
        console.log(`Осталось: ${remaining}`);
        console.log(`Прогресс: ${progress}%`);
        console.log(`Статус: ${status}`);
    }
}