import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../../practice-01/js/progress.js", import.meta.url), "utf8");
const cases = [[12, 5], [0, 0], [5, 6]];

for (const [total, completed] of cases) {
  console.log(`--- progress.js, totalTasks = ${total}, completedTasks = ${completed}`);
  const code = source
    .replace(/^const totalTasks = .*$/m, `const totalTasks = ${total};`)
    .replace(/^const completedTasks = .*$/m, `const completedTasks = ${completed};`);
  runInNewContext(code, { console });
}
