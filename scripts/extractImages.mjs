import fs from "fs/promises";
import { dirname, join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootFolder = join(__dirname, "..");
const dirents = await fs.readdir(rootFolder, { withFileTypes: true });
const files = dirents
  .filter((d) => d.isFile())
  .map((d) => d.name)
  .filter((n) => extname(n) === ".json" && n !== "index.json");

const subjectPromises = files.map((fileName) => {
  const filePath = join(rootFolder, fileName);

  return fs.readFile(filePath, "utf8").then((v) => JSON.parse(v));
});
const subjects = await Promise.all(subjectPromises);

let finds = [];
const subjectsStats = {};
subjects.forEach((s) => {
  const questions = s.data;
  let localFinds = [];

  if (typeof questions !== "object") {
    console.log(s);
  }

  const REGEXP = /(https:\/\/.+?\..+?)"/g;
  questions.forEach((q) => {
    const matches = Array.from(q.question.matchAll(REGEXP)).map((m) => m[1]);

    if (matches != null) {
      localFinds.push(...matches);
    }

    q.answers.forEach((a) => {
      const answerMatches = Array.from(a.answer.matchAll(REGEXP)).map(
        (m) => m[1]
      );

      if (answerMatches != null) {
        localFinds.push(...answerMatches);
      }
    });
  });

  if (localFinds.length > 0) {
    const domains = Array.from(
      new Set(localFinds.map((f) => new URL(f).origin))
    );
    subjectsStats[s.id] = { length: localFinds.length, domains };
    finds.push(...localFinds);
  }
});

finds = Array.from(new Set(finds));

const stats = {
  total: {
    length: finds.length,
    domains: Array.from(new Set(finds.map((f) => new URL(f).origin))),
    extensions: Array.from(new Set(finds.map((f) => extname(f)))),
  },
  subjects: subjectsStats,
};

const html = `
<html>
  <body>
  ${finds.map((src) => `<div><img src="${src}" alt="" /></div>`).join("\n")}
  </body>
</html>
`;

await Promise.all([
  fs.writeFile("out.json", JSON.stringify(finds, null, 2)),
  fs.writeFile("stats.json", JSON.stringify(stats, null, 2)),
  fs.writeFile("index.html", html),
]);
