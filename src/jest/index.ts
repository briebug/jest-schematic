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
import { TsConfigSchema } from '../interfaces/ts-config-schema';

import { getWorkspaceConfig as gwc } from '@schuchard/schematics-core';

export default function (options: JestOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    options = { ...options, __version__: getAngularVersion(tree) };

    return chain([
      updateDependencies(),
      removeFiles(),
      updateAngularJson(),
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

    const addDependencies = of(
      'jest',
      '@types/jest',
      'jest-preset-angular',
      '@angular-builders/jest'
    ).pipe(
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
    const angularProjects = parseAngularJson(gwc(tree));

    const deleteFiles = [
      'src/karma.conf.js',
      'karma.conf.js',
      'src/test.ts',

      // unable to overwrite these with the url() approach.
      'jest.config.js',
      'src/setup-jest.ts',
      'src/test-config.helper.ts',
    ];

    const projects = angularProjects
      .map((p) => p.root)
      .map((root: string) => deleteFiles.map((deletePath) => `${root}/${deletePath}`));

    projects.forEach((paths) => {
      paths.forEach((path) => {
        context.logger.debug(`removing ${path}`);

        safeFileDelete(tree, path);
      });
    });

    return tree;
  };
}

function updateAngularJson(): Rule {
  return (tree: Tree) => {
    const angularJson = gwc(tree);

    Object.entries(angularJson.projects as Record<string, any>).forEach(([_, v]) => {
      const { test } = v?.architect;

      test.builder = '@angular-builders/jest:run';
      delete test.options.main;
      delete test.options.karmaConfig;
    });

    // todo use project formatter or an ast update strategy to avoid formatting irrelevant fields
    tree.overwrite('angular.json', JSON.stringify(angularJson, null, 2));
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

    addPropertyToPackageJson(tree, context, 'jest', {
      globals: {
        'ts-jest': {
          tsConfig: '<rootDir>/tsconfig.spec.json',
          stringifyContentPathRegex: '\\.html$',
          astTransformers: {
            before: [
              'jest-preset-angular/build/InlineFilesTransformer',
              'jest-preset-angular/build/StripStylesTransformer',
            ],
          },
        },
      },
      moduleNameMapper: {
        '@app/(.*)': '<rootDir>/src/app/$1',
        '@assets/(.*)': '<rootDir>/src/assets/$1',
        '@core/(.*)': '<rootDir>/src/app/core/$1',
        '@env': '<rootDir>/src/environments/environment',
        '@src/(.*)': '<rootDir>/src/src/$1',
        '@state/(.*)': '<rootDir>/src/app/state/$1',
      },
      preset: 'jest-preset-angular',
      roots: ['src'],
      setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],
      snapshotSerializers: [
        'jest-preset-angular/build/AngularSnapshotSerializer.js',
        'jest-preset-angular/build/HTMLCommentSerializer.js',
      ],
      transform: {
        '^.+\\.(ts|js|html)$': 'ts-jest',
      },
    });
    return tree;
  };
}

function configureTsConfig(options: JestOptions): Rule {
  return (tree: Tree) => {
    const { projectProps } = getWorkspaceConfig(tree, options);
    const tsConfigPath = projectProps.architect.test.options.tsConfig;
    const workplaceTsConfig = parseJsonAtPath(tree, tsConfigPath);

    let tsConfigContent: TsConfigSchema;

    if (workplaceTsConfig && workplaceTsConfig.value) {
      tsConfigContent = workplaceTsConfig.value;
    } else {
      return tree;
    }

    tsConfigContent.compilerOptions = Object.assign(tsConfigContent.compilerOptions, {
      module: 'commonjs',
      emitDecoratorMetadata: true,
      allowJs: true,
    });
    tsConfigContent.files = tsConfigContent.files.filter(
      (file: String) =>
        // remove files that match the following
        !['test.ts', 'src/test.ts'].some((testFile) => testFile === file)
    );

    return tree.overwrite(tsConfigPath, JSON.stringify(tsConfigContent, null, 2) + '\n');
  };
}

function parseAngularJson(json: any) {
  const { projects } = json;

  return Object.entries(projects as Record<string, any>).map(([k, v]) => {
    const { projectType, root, sourceRoot, architect } = v;
    const {
      test: {
        options: { tsConfig },
      },
    } = architect;

    return {
      project: k,
      projectType,
      root,
      sourceRoot,
      tsConfig,
    };
  });
}
