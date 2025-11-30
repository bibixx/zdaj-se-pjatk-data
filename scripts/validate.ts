import { resolve, join, relative, parse } from "node:path";
import { Glob } from "bun";
import Ajv, { type ErrorObject } from "ajv";
import chalk from "chalk";

const rootFilesPath = join(import.meta.dir, "..");
const subjectsScanPath = rootFilesPath;
const overridesScanPath = resolve(rootFilesPath, "overrides");
const ajv = new Ajv();
ajv.addKeyword("x-validate-file-id");

type ValidationResult =
  | {
      valid: false;
      errors: undefined | null | (ErrorObject | Error | string)[];
    }
  | {
      valid: true;
    };
async function validate(filePath: string): Promise<ValidationResult> {
  const file = Bun.file(filePath);
  const jsonData = await file.json();
  const schemaPath = jsonData["$schema"];

  if (!schemaPath) {
    throw new Error(`Missing $schema in ${file}`);
  }

  const { dir } = parse(filePath);
  const schemaFile = Bun.file(resolve(dir, schemaPath));
  const schema = await schemaFile.json();
  const validate = ajv.getSchema(schema.$id) ?? ajv.compile(schema);
  const valid = validate(jsonData);

  if (!valid) {
    return { valid: false, errors: validate.errors };
  }

  if (schema["x-validate-file-id"]) {
    const inFileId = jsonData.id;
    const fileName = parse(filePath).name;
    const [fileNameId] = fileName.split(".");

    if (inFileId !== fileNameId) {
      return { valid: false, errors: [`File ID ${inFileId} does not match file name ${fileName}`] };
    }
  }

  return { valid: true };
}

const glob = new Glob("*.json");
const patchesGlob = new Glob("patches/**/*.json");

const subjectsScanResult = Array.from(glob.scanSync({ cwd: subjectsScanPath, absolute: true }));
const overridesScanResult = Array.from(glob.scanSync({ cwd: overridesScanPath, absolute: true }));
const patchesScanResult = Array.from(patchesGlob.scanSync({ cwd: overridesScanPath, absolute: true }));

const resultsPromises = [subjectsScanResult, patchesScanResult, overridesScanResult].map((scanResult) =>
  Promise.all(
    scanResult.map(async (path) => {
      try {
        return { path, result: await validate(path) };
      } catch (error) {
        return { path, result: { valid: false, errors: [error as Error] } };
      }
    })
  )
);

const [subjectsValidationResults, patchesScanResults, overridesValidationResults] = await Promise.all(resultsPromises);

let didAnythingFail = false;
const logValidationResults = (
  validationResults: {
    path: string;
    result: ValidationResult;
  }[]
) => {
  for (const validationResult of validationResults) {
    if (validationResult.result.valid) {
      console.log(chalk.green(`✅ ${relative(rootFilesPath, validationResult.path)} valid`));
    } else {
      console.error(chalk.red(`❌ ${relative(rootFilesPath, validationResult.path)} invalid`));
      console.error(validationResult.result.errors);
      didAnythingFail = true;
    }
  }
};

console.log(chalk.cyan.bold.underline("Subjects & Index"));
logValidationResults(subjectsValidationResults);

console.log("");
console.log(chalk.cyan.bold.underline("Patches"));
logValidationResults(patchesScanResults);

console.log("");
console.log(chalk.cyan.bold.underline("Overrides"));
logValidationResults(overridesValidationResults);

console.log("");
if (didAnythingFail) {
  console.error(chalk.red.bold("====== ❌ Check failed ======"));
  process.exit(1);
} else {
  console.error(chalk.green.bold("==== ✅ Check successful ===="));
  process.exit(0);
}
