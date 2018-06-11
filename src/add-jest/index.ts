import {
  Rule,
  SchematicContext,
  Tree,
  chain,
  SchematicsException,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

import { JestOptions } from './utility/util';
import {
  getPackageJsonDependency,
  addPackageJsonDependency,
} from './utility/dependencies';

export function addJest(options: JestOptions): Rule {
  return chain([
    updateDependencies(options),
    // writeLicenseToHeader(options),
  ]);
}

function updateDependencies(options: JestOptions): Rule {
  if (options) {
  }
  return (tree: Tree, context: SchematicContext) => {
    context.addTask(new NodePackageInstallTask());
    context.logger.debug('Adding Jest dependency...');

    const coreDep = getPackageJsonDependency(tree, '@angular/core');
    if (coreDep === null) {
      throw new SchematicsException('Could not find version.');
    }

    const packageName = '@types/jest';
    // const packageNames = ['@types/jest', 'jest', 'jest-preset-angular'];

    const platformServerDep = {
      ...coreDep,
      name: packageName,
    };
    addPackageJsonDependency(tree, platformServerDep);

    return tree;
  };
}
