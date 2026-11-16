const log = (label) => console.log(label);

log("A: синхронный код");

setTimeout(() => {
  log("F: задача таймера");
}, 0);

Promise.resolve().then(() => {
  log("D: обработчик Promise");
});

async function demonstrateAwait() {
  log("B: начало async-функции");
  await null;
  log("E: продолжение после await");
}

demonstrateAwait();

// Мой обработчик (задание 2.6): попадает в очередь микрозадач после D и E.
Promise.resolve().then(() => {
  log("G: мой обработчик Promise");
});

log("C: конец синхронного кода");

// До запуска записать прогноз порядка A–F в отчёт, затем объяснить результат.
