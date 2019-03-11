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
  getAngularVersion,
  getLatestNodeVersion,
  NodePackage,
  parseJsonAtPath,
} from '../utility/util';

import { addPackageJsonDependency, NodeDependencyType } from '../utility/dependencies';

import { Observable, of, concat } from 'rxjs';
import { map, concatMap } from 'rxjs/operators';

export default function(options: JestOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    options = { ...options, __version__: getAngularVersion(tree) };

    return chain([
      updateDependencies(),
      removeFiles(),
      addJestFiles(),
      addTestScriptsToPackageJson(),
      configureTsConfig(options),
    ])(tree, context);
  };
}

function updateDependencies(): Rule {
  return (tree: Tree, context: SchematicContext): Observable<Tree> => {
    context.logger.debug('Updating dependencies...');
    context.addTask(new NodePackageInstallTask());

    const removeDependencies = of(
      'karma',
      'karma-jasmine',
      'karma-jasmine-html-reporter',
      'karma-chrome-launcher',
      'karma-coverage-istanbul-reporter'
    ).pipe(
      map((packageName: string) => {
        context.logger.debug(`Removing ${packageName} dependency`);

        removePackageJsonDependency(tree, {
          type: NodeDependencyType.Dev,
          name: packageName,
        });

        return tree;
      })
    );

    const addDependencies = of('jest', 'jest-preset-angular').pipe(
      concatMap((packageName: string) => getLatestNodeVersion(packageName)),
      map((packageFromRegistry: NodePackage) => {
        const { name, version } = packageFromRegistry;
        context.logger.debug(`Adding ${name}:${version} to ${NodeDependencyType.Dev}`);

        addPackageJsonDependency(tree, {
          type: NodeDependencyType.Dev,
          name,
          version,
        });

        return tree;
      })
    );

    return concat(removeDependencies, addDependencies);
  };
}

function removeFiles(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const deleteFiles = [
      './src/karma.conf.js',
      './karma.conf.js',
      './src/test.ts',

      // unable to overwrite these with the url() approach.
      './jest.config.js',
      './src/setup-jest.ts',
      './src/test-config.helper.ts',
    ];

    deleteFiles.forEach((filePath) => {
      context.logger.debug(`removing ${filePath}`);

      safeFileDelete(tree, filePath);
    });

    return tree;
  };
}

function addJestFiles(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.debug('adding jest files to host dir');

    return chain([mergeWith(apply(url('./files'), [move('./')]))])(tree, context);
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

function configureTsConfig(options: JestOptions): Rule {
  return (tree: Tree) => {
    const { projectProps } = getWorkspaceConfig(tree, options);
    const tsConfigPath = projectProps.architect.test.options.tsConfig;
    const workplaceTsConfig = parseJsonAtPath(tree, tsConfigPath);

    if (workplaceTsConfig && workplaceTsConfig.value && workplaceTsConfig.value.compilerOptions) {
      let val = workplaceTsConfig.value as any;
      val.compilerOptions.module = 'commonjs';
      if(val.files && val.files.includes('test.ts')) {
        val.files.splice(val.files.findIndex(name === 'test.ts'), 1);
      }
      return tree.overwrite(tsConfigPath, JSON.stringify(val, null, 2) + '\n');
    } else {
      return tree;
    }
  };
}
