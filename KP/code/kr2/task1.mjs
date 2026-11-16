// КР2, задание 1: проверка названия через validateTaskDraft из ПР4.
import { validateTaskDraft } from "../../../practice-04/src/form-validation.js";

const tasks = [];

const ok = validateTaskDraft({ id: "20", title: "  Изучить localStorage  ", priority: "high" }, tasks);
console.log('title = "  Изучить localStorage  " ->', ok);
console.log("value.title в кавычках:", JSON.stringify(ok.value?.title));

const bad = validateTaskDraft({ id: "20", title: "   ", priority: "high" }, tasks);
console.log('title = "   " ->', bad);
