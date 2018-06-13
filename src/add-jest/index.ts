import {
  Rule,
  SchematicContext,
  Tree,
  chain,
  url,
  apply,
  move,
  mergeWith,
  filter,
  FileEntry,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

import {
  removePackageJsonDependency,
  JestOptions,
  safeFileDelete,
  addPropertyToPackageJson,
  getWorkspaceConfig,
  getAngularVersion,
} from './utility/util';

import {
  addPackageJsonDependency,
  NodeDependencyType,
} from './utility/dependencies';
import { Path } from '@angular-devkit/core';

export default function(options: JestOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    options = { ...options, __version__: getAngularVersion(tree) };

    return chain([
      updateDependencies(),
      cleanAngularJson(options),
      removeFiles(),
      addJestFiles(options),
      addJestToPackageJson(options),
      addTestScriptsToPackageJson(),
    ])(tree, context);
  };
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

      context.addTask(new NodePackageInstallTask());
    });

    return tree;
  };
}

function cleanAngularJson(options: JestOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.debug('Cleaning Angular.json file');

    if (options.__version__ === 6) {
      const { projectProps, workspacePath, workspace } = getWorkspaceConfig(
        tree,
        options
      );

      if (projectProps && projectProps.architect) {
        // remove test default ng test configuration
        delete projectProps.architect.test;

        tree.overwrite(workspacePath, JSON.stringify(workspace, null, 2));
      }
    } else if (options.__version__ < 6) {
      // TODO: clean up angular-cli.json file. different format that V6 angular.json
      console.warn(
        'Automated clean up of the angular-cli.json file is not currently support for apps < version 6'
      );
    }
    return tree;
  };
}

function removeFiles(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const deleteFiles = [
      './src/karma.conf.js',
      './karma.conf.js',
      './src/test.ts',
    ];

    deleteFiles.forEach((filePath) => {
      context.logger.debug(`removing ${filePath}`);

      const didDelete = safeFileDelete(tree, filePath);

      if (!didDelete) {
      }
    });

    return tree;
  };
}

function addJestFiles(options: JestOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.debug('adding jest files to host dir');
    // TODO: handle project selection

    const checkForFiles = filter((path: Path, entry: FileEntry) => {
      // older versions of the CLI (Angular v5) throw exception when writing a file that already exists
      // check for files that already exists in host app against ./files
      if (tree.exists(path)) {
        // file already exists in host
        const source = url('./files')(context);
        const file = (source as Tree).read(path);
        if (source !== null && file !== null) {
          // overwrite file with template from ./files
          tree.overwrite(path, file.toString());
          return false;
        } else {
          // error reading file template, delete host file so a new one can be added
          tree.delete(path);
        }
      }
      // file doesn't exists in host, add from ./files
      return true;
    });

    const rules = [move(`./`)];

    if (options.__version__ < 6) {
      // filter() doesn't work with V6 apps, files that already exist will throw an error
      // < V6 apps will be able to apply the correct file changes (creat, update)
      rules.unshift(checkForFiles);
    }
    return chain([mergeWith(apply(url('./files'), rules))])(tree, context);
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
