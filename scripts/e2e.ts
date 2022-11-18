import { exec } from './utils';
import * as packageJson from '../package.json';

enum SandboxType {
  single = 'sandboxes/single-app',
  workspace = 'sandboxes/workspace',
}
const sandboxList = Object.keys(SandboxType);

// build the schematic code
const build = async () => {
  return await exec('tsc -p tsconfig.json');
};

// reset the sandboxes to their version controlled state
const reset = async (type: SandboxType) => {
  return await exec(`git checkout HEAD -- ${type} && git clean -f -d ${type}`);
};

// ensure the schematic code is linked so it can be called in a later step
const link = async (type: SandboxType) => {
  return await exec(`yarn link && cd ${type} && yarn link ${packageJson.name}`);
};

// simulate running the schematic
const runSchematic = async (type: SandboxType) => {
  return await exec(`cd ${type} && yarn && ./node_modules/.bin/ng g ${packageJson.name}:jest`);
};

// run the app or lib unit tests using jest
const testSchematic = async (type: SandboxType) => {
  // Remove yarn lint since in angular 13, we must add eslint but now the schematic for add eslint not works with angular 13
  return await exec(`cd ${type} && yarn test`);
};

// test that the app and/or lib builds after the schematic is executed
const testProjectBuild = async (type: SandboxType) => {
  // Remove yarn lint since in angular 13, we must add eslint but now the schematic for add eslint not works with angular 13
  return type === SandboxType.single
    ? await exec(`cd ${type} && yarn build`)
    : await exec(`cd ${type} && yarn build app-one && yarn build lib-one`);
};

const launch = async () => {
  let arg = process.argv[2] as string;

  if (arg === 'reset') {
    await reset(SandboxType.single);
    return await reset(SandboxType.workspace);
  }

  if (!arg || !sandboxList.find((t) => t.includes(arg))) {
    return [
      `Invalid Sandbox type "${arg}"`,
      `Please provide a valid type: ${sandboxList.join(', ')}`,
    ].join('\n');
  }

  const type = SandboxType[arg];

  await build();
  await reset(type);
  await link(type);
  await runSchematic(type);
  await testSchematic(type);
  await testProjectBuild(type);
  return await reset(type);
};

launch()
  .then((msg) => {
    if (msg) {
      console.log(msg);
    }
    return process.exit(process.exitCode || 0);
  })
  .catch((msg) => {
    if (msg) {
      console.log(msg);
    }
    return process.exit(process.exitCode || 1);
  });
