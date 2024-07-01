import { mkdir, readdir, rmdir } from "node:fs/promises";
import { join, parse, relative } from "node:path";
import { type Root as RootOverrides } from "./schemas/subjectOverride.ts";

const overridesPath = join(import.meta.dir, "..", "overrides");
const overridesPatchesPath = join(overridesPath, "patches");

await rmdir(overridesPatchesPath, { recursive: true });
await mkdir(overridesPatchesPath, { recursive: true });

const dirents = await readdir(overridesPath, { withFileTypes: true });

const schemasJSONFolder = join(import.meta.dir, "..", "schemas");

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

    await Bun.write(indexPatchFile, JSON.stringify(contents, null, 2));

    continue;
  }

  for (const answer of contents.data) {
    const answerId = answer.id ?? crypto.randomUUID();
    answer.id = answerId as number;
    answer.createdAt = contents.updatedAt;

    // TODO: Add schema validation here
    const answerPatchFile = Bun.file(join(rootPath, `${answerId}.patch.json`));
    await Bun.write(answerPatchFile, JSON.stringify(answer, null, 2));
  }
}
