"use strict";

const totalTasks = 20;
const completedTasks = 11;
const dailyLimit = 6;

// Проверка на строки
if (typeof totalTasks !== 'number' || typeof completedTasks !== 'number' || typeof dailyLimit !== 'number') {
    console.log("Ошибка: вместо числа передана строка.");
} 
// Проверка на NaN
else if (Number.isNaN(totalTasks) || Number.isNaN(completedTasks) || Number.isNaN(dailyLimit)) {
    console.log("Ошибка: недопустимое числовое значение.");
} 
// Проверка на целые числа
else if (!Number.isInteger(totalTasks) || !Number.isInteger(completedTasks) || !Number.isInteger(dailyLimit)) {
    console.log("Ошибка: дробное количество.");
} 
// Проверка на отрицательные значения
else if (totalTasks < 0 || completedTasks < 0) {
    console.log("Ошибка: отрицательное количество.");
} 
// Проверка верхней границы totalTasks
else if (totalTasks > 1000) {
    console.log("Ошибка: превышена верхняя граница.");
} 
// Проверка, что выполнено не больше, чем всего
else if (completedTasks > totalTasks) {
    console.log("Ошибка: некорректное число выполненных задач.");
} 
// Проверка dailyLimit (от 1 до 1000)
else if (dailyLimit < 1 || dailyLimit > 1000) {
    console.log("Ошибка: дневная норма должна быть от 1 до 1000.");
} 
// Основная логика (данные корректны)
else {
    let remaining = totalTasks - completedTasks;
    
    if (totalTasks === 0) {
        console.log("Задач нет.");
        console.log("Потребуется дней: 0");
    } else if (remaining === 0) {
        console.log("Все задачи уже выполнены.");
        console.log("Потребуется дней: 0");
    } else {
        console.log(`Осталось задач: ${remaining}`);
        let days = 0;
        
        // Цикл планирования по дням
        while (remaining > 0) {
            days++;
            // Берем минимум из лимита и остатка
            const doneToday = Math.min(dailyLimit, remaining);
            remaining -= doneToday;
            
            console.log(`День ${days}: выполнено ${doneToday}, осталось ${remaining}`);
        }
        
        console.log(`Потребуется дней: ${days}`);
    }
}