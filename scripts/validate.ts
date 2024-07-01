import { resolve, join, relative, parse } from "node:path";
import { Glob } from "bun";
import Ajv, { type ErrorObject } from "ajv";
import chalk from "chalk";

const rootFilesPath = join(import.meta.dir, "..");
const subjectsScanPath = rootFilesPath;
const overridesScanPath = resolve(rootFilesPath, "overrides");
const ajv = new Ajv();

type ValidationResult =
  | {
      valid: false;
      errors: undefined | null | ErrorObject[];
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

  if (valid) {
    return { valid: true };
  }

  return { valid: false, errors: validate.errors };
}

const glob = new Glob("*.json");

const subjectsScanResult = Array.from(glob.scanSync(subjectsScanPath));
const overridesScanResult = Array.from(glob.scanSync(overridesScanPath));

const subjectsValidationResultsPromises = subjectsScanResult.map(async (file) => {
  const path = join(subjectsScanPath, file);
  return { path, result: await validate(path) };
});
const overridesValidationResultsPromises = overridesScanResult.map(async (file) => {
  const path = join(overridesScanPath, file);
  return { path, result: await validate(path) };
});

const [subjectsValidationResults, overridesValidationResults] = await Promise.all([
  Promise.all(subjectsValidationResultsPromises),
  Promise.all(overridesValidationResultsPromises),
]);

let didAnythingFail = false;
console.log(chalk.cyan.bold.underline("Subjects & Index"));
for (const validationResult of subjectsValidationResults) {
  if (validationResult.result.valid) {
    console.log(chalk.green(`✅ ${relative(rootFilesPath, validationResult.path)} valid`));
  } else {
    console.error(chalk.red(`❌ ${relative(rootFilesPath, validationResult.path)} invalid`));
    console.error(validationResult.result.errors);
    didAnythingFail = true;
  }
}

console.log("");
console.log(chalk.cyan.bold.underline("Overrides"));
for (const validationResult of overridesValidationResults) {
  if (validationResult.result.valid) {
    console.log(chalk.green(`✅ ${relative(rootFilesPath, validationResult.path)} valid`));
  } else {
    console.error(chalk.red(`❌ ${relative(rootFilesPath, validationResult.path)} invalid`));
    console.error(validationResult.result.errors);
    didAnythingFail = true;
  }
}

console.log("");
if (didAnythingFail) {
  console.error(chalk.red.bold("====== ❌ Check failed ======"));
  process.exit(1);
} else {
  console.error(chalk.green.bold("==== ✅ Check successful ===="));
  process.exit(0);
}
