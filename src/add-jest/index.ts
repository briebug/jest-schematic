import {
  Rule,
  SchematicContext,
  Tree,
  chain,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

import { JestOptions, removePackageJsonDependency } from './utility/util';
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
    const removeDependencies = [
      'karma',
      'karma-jasmine',
      'karma-jasmine-html-reporter',
      'karma-chrome-launcher',
      'karma-coverage-istanbul-reporter',
    ];
    const addJestDependencies = [
      ['@types/jest', '6.0.3'],
      ['jest', '23.1.0'],
      ['jest-preset-angular', '5.2.2'],
    ];

    context.logger.debug('Remove Karma & Jasmine dependencies');

    removeDependencies.forEach(packageName => {
      context.logger.debug(`Removing ${packageName}...`);

      removePackageJsonDependency(tree, {
        type: NodeDependencyType.Dev,
        name: packageName
      });
    });

    context.addTask(new NodePackageInstallTask());
    context.logger.debug('Adding Jest dependencies...');

    addJestDependencies.forEach((dependency) => {
      const [name, version] = dependency;
      const jestDependency = {
        type: NodeDependencyType.Dev,
        name,
        version,
      };

      context.logger.debug(`Adding ${name}...`);

      addPackageJsonDependency(tree, jestDependency);
    });

    return tree;
  };
}
