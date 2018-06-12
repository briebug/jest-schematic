import {
  Rule,
  SchematicContext,
  Tree,
  chain,
  url,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

import {
  removePackageJsonDependency,
  getWorkspace,
  JestOptions,
  getWorkspacePath,
  safeFileDelete,
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
    addJestFile(),
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

      tree.overwrite(workspacePath, JSON.stringify(workspace, null, 2));
    }
    return tree;
  };
}

function removeFiles(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const deleteFiles = ['./src/karma.conf.js', './src/test.ts'];

    deleteFiles.forEach((filePath) => {
      context.logger.debug(`removing ${filePath}`);

      const didDelete = safeFileDelete(tree, filePath);

      if (!didDelete) {
        context.logger.info(
          `Warning: attempted to remove the CLI original ${filePath} file.This file is no longer necessary for testing if it has been renamed.`
        );
      }
    });

    return tree;
  };
}

function addJestFile(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.debug('adding setupJest.ts file to ./src dir');

    tree.create(
      './src/setupJest.ts',
      "import 'jest-preset-angular';\nimport './jestGlobalMocks'; // browser mocks globally available for every test\n"
    );
    return tree;
  };
}
