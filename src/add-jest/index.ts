import {
  Rule,
  SchematicContext,
  Tree,
  chain,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

import { JestOptions } from './utility/util';
import {
  addPackageJsonDependency,
  NodeDependencyType,
} from './utility/dependencies';

export function addJest(options: JestOptions): Rule {
  return chain([updateDependencies(options)]);
}

function updateDependencies(options: JestOptions): Rule {
  if (options) {
  }
  return (tree: Tree, context: SchematicContext) => {
    context.addTask(new NodePackageInstallTask());
    context.logger.debug('Adding Jest dependency...');

    [
      ['@types/jest', '6.0.3'],
      ['jest', '23.1.0'],
      ['jest-preset-angular', '5.2.2'],
    ].forEach((dependency) => {
      const [packageName, version] = dependency;
      const jestDep = {
        type: NodeDependencyType.Dev,
        name: packageName,
        version: version ? version : '',
      };

      context.logger.debug(`Adding ${packageName}...`);
      addPackageJsonDependency(tree, jestDep);
    });

    return tree;
  };
}
