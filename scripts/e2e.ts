import { exec } from './utils';
import * as packageJson from '../package.json';

enum SandboxType {
  single = 'sandbox',
  workspace = 'workspace',
}

const build = async () => {
  return await exec('tsc -p tsconfig.json');
};

const clean = async (type: SandboxType) => {
  return await exec(`git checkout HEAD -- ${type} && git clean -f -d ${type}`);
};

const link = async (type: SandboxType) => {
  return await exec(`yarn link && cd ${type} && yarn link ${packageJson.name}`);
};

const runSchematic = async (type: SandboxType) => {
  return await exec(`cd ${type} && yarn && ./node_modules/.bin/ng g ${packageJson.name}:jest`);
};

const testSchematic = async (type: SandboxType) => {
  return await exec(`cd ${type} && yarn lint && yarn test --no-cache && yarn build`);
};

const launch = async (type: SandboxType) => {
  await build();
  await clean(type);
  await link(type);
  await runSchematic(type);
  await testSchematic(type);
  await clean(type);
  return;
};

launch(SandboxType.single)
  .then(() => process.exit(process.exitCode || 0))
  .catch((e) => {
    console.log(e);
    return process.exit(process.exitCode || 1);
  });
