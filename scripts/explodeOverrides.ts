import { mkdir, readdir, rmdir } from "node:fs/promises";
import { join, parse, relative } from "node:path";
import { type Root as RootOverrides } from "./schemas/subjectOverride.ts";

const overridesPath = join(import.meta.dir, "..", "overrides");
const overridesPatchesPath = join(overridesPath, "patches");

await rmdir(overridesPatchesPath, { recursive: true });
await mkdir(overridesPatchesPath, { recursive: true });

const dirents = await readdir(overridesPath, { withFileTypes: true });

const schemasJSONFolder = join(import.meta.dir, "..", "schemas");

function stringify(data: unknown) {
  return JSON.stringify(data, null, 2) + "\n";
}

for (const dirent of dirents) {
  if (!dirent.isFile()) {
    continue;
  }

  const { name: id } = parse(dirent.name);

  const rootPath = join(overridesPatchesPath, id);
  const bf = Bun.file(join(overridesPath, dirent.name));
  const contents = (await bf.json()) as RootOverrides;

  if (id === "index") {
    const indexPatchFile = Bun.file(join(overridesPatchesPath, "index.patch.json"));
    const { base: schemaFileName } = parse(contents.$schema);
    const schemaAbsolutePath = join(schemasJSONFolder, schemaFileName);
    const schemaPath = relative(overridesPatchesPath, schemaAbsolutePath);
    contents.$schema = schemaPath;

    await Bun.write(indexPatchFile, stringify(contents));

    continue;
  }

  let i = 0;
  for (const answer of contents.data) {
    const answerId = answer.id ?? crypto.randomUUID();
    answer.id = String(answerId);
    answer.createdAt = contents.updatedAt;

    // TODO: Add schema validation here
    const answerPatchFile = Bun.file(join(rootPath, `${String(i++).padStart(2, "0")}_${answerId}.patch.json`));
    await Bun.write(answerPatchFile, stringify(answer));
  }

  const answerIndexPatchFile = Bun.file(join(rootPath, `index.patch.json`));
  const { data, ...indexData } = contents;

  const { base: schemaFileName } = parse(indexData.$schema);
  const schemaAbsolutePath = join(schemasJSONFolder, schemaFileName);
  const schemaPath = relative(rootPath, schemaAbsolutePath);
  indexData.$schema = schemaPath;

  await Bun.write(answerIndexPatchFile, stringify(indexData));
}
