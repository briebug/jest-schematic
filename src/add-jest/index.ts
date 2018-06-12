import {
  Rule,
  SchematicContext,
  Tree,
  chain,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

import {
  removePackageJsonDependency,
  getWorkspace,
  JestOptions,
  getWorkspacePath,
} from './utility/util';

import {
  addPackageJsonDependency,
  NodeDependencyType,
} from './utility/dependencies';

export function addJest(options: JestOptions): Rule {
  return chain([
    updateDependencies(),
    cleanAngularJson(options),
    removeFiles(),
  ]);
}

function updateDependencies(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const removeDependencies = [
      'karma',
      'karma-jasmine',
      'karma-jasmine-html-reporter',
      'karma-chrome-launcher',
      'karma-coverage-istanbul-reporter',
    ];
    const addJestDependencies = [
      ['@types/jest', '23.0.2'],
      ['jest', '23.1.0'],
      ['jest-preset-angular', '5.2.2'],
    ];

    context.logger.debug('Remove Karma & Jasmine dependencies');

    removeDependencies.forEach((packageName) => {
      context.logger.debug(`Removing ${packageName}...`);

      removePackageJsonDependency(tree, {
        type: NodeDependencyType.Dev,
        name: packageName,
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

function cleanAngularJson(options: JestOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.debug('Cleaning Angular.json file');

    const workspace = getWorkspace(tree);
    const workspacePath = getWorkspacePath(tree);
    const project = options.project
      ? workspace.projects[options.project]
      : workspace.projects[workspace.defaultProject || ''];

    if (project && project.architect) {
      // remove test default ng test configuration
      delete project.architect.test;

      // const recorder = tree.beginUpdate(Paths.AngularJson);
      console.log('angular json-> ', JSON.stringify(workspace, null, 2));

      tree.overwrite(workspacePath, JSON.stringify(workspace, null, 2));
    }
    return tree;
  };
}

function removeFiles(): Rule {
  return (tree: Tree) => {
    return tree;
  };
}
