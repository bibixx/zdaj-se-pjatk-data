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

const mapping = Object.fromEntries(
  await fs.readFile(join(__dirname, "../images/map.csv"), "utf8").then((v) =>
    v
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const [k, v] = l.split(", ");
        return [v, k];
      })
  )
);

const subjectPromises = files.map((fileName) => {
  const filePath = join(rootFolder, fileName);

  return fs.readFile(filePath, "utf8").then((v) => [filePath, JSON.parse(v)]);
});
const subjects = await Promise.all(subjectPromises);

const REGEXP = /(https:\/\/.+?\..+?)"/g;
const BASE_ASSET_URL = "https://bibixx.github.io/zdaj-se-pjatk-data/images";
const replace = (s) =>
  s.replace(REGEXP, (match, url) => {
    // TODO: html decode
    const newUrl = mapping[url];

    if (newUrl == null) {
      return url + '"';
    }

    return BASE_ASSET_URL + "/" + newUrl + '"';
  });

const ps = subjects.map(([filePath, s]) => {
  const questions = s.data;

  questions.forEach((q) => {
    q.question = replace(q.question);

    q.answers.forEach((a) => {
      a.answer = replace(a.answer);
    });
  });

  return fs.writeFile(filePath, JSON.stringify(s, null, 2));
});

await Promise.all(ps);
