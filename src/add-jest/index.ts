import {
  Rule,
  SchematicContext,
  Tree,
  chain,
  url,
  apply,
  move,
  mergeWith,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

import {
  removePackageJsonDependency,
  JestOptions,
  safeFileDelete,
  addPropertyToPackageJson,
  getWorkspaceConfig,
} from './utility/util';

import {
  addPackageJsonDependency,
  NodeDependencyType,
} from './utility/dependencies';

export default function(options: JestOptions): Rule {
  return chain([
    updateDependencies(),
    cleanAngularJson(options),
    removeFiles(),
    addJestFiles(),
    addJestToPackageJson(options),
    addTestScriptsToPackageJson(),
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

    const { projectProps, workspacePath, workspace } = getWorkspaceConfig(
      tree,
      options
    );

    if (projectProps && projectProps.architect) {
      // remove test default ng test configuration
      delete projectProps.architect.test;

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

function addJestFiles(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.debug('adding setupJest.ts file to ./src dir');
    // TODO: handle project selection
    return chain([mergeWith(apply(url('./files'), [move(`./`)]))])(
      tree,
      context
    );
  };
}

function addJestToPackageJson(options: JestOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const configChoice = options.config || '';

    if (configChoice.toLowerCase() === 'packagejson') {
      addPropertyToPackageJson(
        tree,
        context,
        'jest',
        require('./files/jest.config.js')
      );
    }
    return tree;
  };
}

function addTestScriptsToPackageJson(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    // prettier-ignore
    addPropertyToPackageJson(tree, context, 'scripts', {
      'test': 'jest',
      'test:watch': 'jest --watch'
    });
    return tree;
  };
}
