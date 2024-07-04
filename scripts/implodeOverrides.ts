import { mkdir, readdir, rmdir, unlink } from "node:fs/promises";
import { join, parse, relative } from "node:path";
import { type Root as RootOverrides } from "./schemas/subjectOverride.ts";

const overridesPath = join(import.meta.dir, "..", "overrides");
const overridesPatchesPath = join(overridesPath, "patches");
const schemasJSONFolder = join(import.meta.dir, "..", "schemas");

function stringify(data: unknown) {
  return JSON.stringify(data, null, 2) + "\n";
}

const rootDirentsForCleanup = await readdir(overridesPath, { withFileTypes: true, recursive: false });
for (const dirent of rootDirentsForCleanup) {
  if (!dirent.isFile()) {
    continue;
  }

  try {
    const filePath = join(overridesPath, dirent.name);
    await unlink(filePath);
  } catch (error) {}
}

async function processRootIndexPatch(name: string) {
  const indexPatchFile = join(overridesPatchesPath, name);
  const indexPatchContents = (await Bun.file(indexPatchFile).json()) as RootOverrides;
  const { base: schemaFileName } = parse(indexPatchContents.$schema);

  const schemaAbsolutePath = join(schemasJSONFolder, schemaFileName);
  const schemaPath = relative(overridesPath, schemaAbsolutePath);
  indexPatchContents.$schema = schemaPath;

  const outPath = join(overridesPath, "index.json");
  await Bun.write(outPath, stringify(indexPatchContents));
}

async function processSubject(subjectId: string) {
  const subjectPath = join(overridesPatchesPath, subjectId);
  const subjectDirents = await readdir(subjectPath, { withFileTypes: true });

  let outData = { data: [] } as any;

  subjectDirents.sort((a, b) => a.name.localeCompare(b.name));

  for (const dirent of subjectDirents) {
    if (!dirent.isFile()) {
      continue;
    }

    const file = Bun.file(join(overridesPatchesPath, subjectId, dirent.name));
    if (dirent.name === "index.patch.json") {
      const fileContents = await file.json();
      outData = { ...fileContents, ...outData };

      continue;
    }

    const fileContents = await file.json();

    outData.data.push(fileContents);
  }

  const schemaAbsolutePath = join(schemasJSONFolder, "subject-override.json");
  const schemaPath = relative(overridesPath, schemaAbsolutePath);
  outData.$schema = schemaPath;

  let updatedAt = outData.updatedAt;
  for (const data of outData.data) {
    const createdAt = data.createdAt;

    delete data.createdAt;
    delete data.$schema;

    updatedAt = Math.max(data.updatedAt ?? 0, createdAt ?? 0);
  }

  outData.updatedAt = updatedAt;

  const outFile = Bun.file(join(overridesPath, `${subjectId}.json`));
  await Bun.write(outFile, stringify(outData));
}

const patchesRootDirents = await readdir(overridesPatchesPath, { withFileTypes: true });
for (const dirent of patchesRootDirents) {
  if (dirent.isFile() && dirent.name === "index.patch.json") {
    await processRootIndexPatch(dirent.name);

    continue;
  }

  if (dirent.isDirectory()) {
    await processSubject(dirent.name);

    continue;
  }
}
