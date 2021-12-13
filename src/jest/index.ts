import {
  Rule,
  SchematicContext,
  Tree,
  chain,
  url,
  apply,
  move,
  mergeWith,
  template,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

import {
  removePackageJsonDependency,
  JestOptions,
  safeFileDelete,
  getAngularVersion,
  getLatestNodeVersion,
  NodePackage,
} from '../utility/util';

import { addPackageJsonDependency, NodeDependencyType } from '../utility/dependencies';

import { Observable, of, concat } from 'rxjs';
import { map, concatMap } from 'rxjs/operators';
import { TsConfigSchema } from '../interfaces/ts-config-schema';

import { getWorkspaceConfig, readJsonInTree } from '@schuchard/schematics-core';

export default function (options: JestOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    options = { ...options, __version__: getAngularVersion(tree) };

    return chain([
      updateDependencies(),
      removeFiles(),
      updateAngularJson(),
      addRootFiles(),
      addWorkspaceFiles(),
      configureTsConfig(),
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
      'karma-coverage-istanbul-reporter',
      'karma-coverage',
      'jasmine-core',
      '@types/jasmine'
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

    const addDependencies = of('jest', '@types/jest', '@angular-builders/jest').pipe(
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
    const angularProjects = Object.values(
      (getWorkspaceConfig(tree)?.projects as Record<string, any>) ?? {}
    ).map((o) => o.root);

    const deleteFiles = [
      'src/karma.conf.js',
      'karma.conf.js',
      'src/test.ts',

      // unable to overwrite these with the url() approach.
      'jest.config.js',
      'src/setup-jest.ts',
      'src/test-config.helper.ts',
    ];

    const projects = angularProjects.map((root: string) =>
      deleteFiles.map((deletePath) => `${root}/${deletePath}`)
    );

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
    const angularJson = getWorkspaceConfig(tree);

    Object.values(angularJson.projects as Record<string, any>).forEach((o) => {
      const { test } = o?.architect;

      if (test?.builder) {
        test.builder = '@angular-builders/jest:run';
        delete test.options.main;
        delete test.options.polyfills;
        delete test.options.inlineStyleLanguage;
        delete test.options.karmaConfig;
      }
    });

    // todo use project formatter or an ast update strategy to avoid formatting irrelevant fields
    tree.overwrite('angular.json', JSON.stringify(angularJson, null, 2));
    return tree;
  };
}

function addRootFiles(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.debug('adding jest files to host dir');

    return chain([mergeWith(apply(url('./files'), [move('./')]))])(tree, context);
  };
}

function addWorkspaceFiles(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.debug('adding jest files to workspace projects');
    const { projects } = getWorkspaceConfig(tree);

    if (!projects || !Object.keys(projects).length) {
      return tree;
    }

    const paths = Object.values(projects)
      .map((proj: any) => proj?.root as string)
      .filter((path) => !!path)
      .map((path) => mergeWith(apply(url('./workspace-files'), [template({ path }), move(path)])));

    return chain(paths)(tree, context);
  };
}

function configureTsConfig(): Rule {
  return (tree: Tree) => {
    const angularJson = getWorkspaceConfig(tree);

    Object.values(angularJson.projects as Record<string, any>)
      .map((o) => o?.architect?.test?.options?.tsConfig as string)
      .filter((path) => !!path)
      .forEach((path) => {
        const json = readJsonInTree<TsConfigSchema>(tree, path);

        json.compilerOptions = {
          ...json.compilerOptions,
          module: 'commonjs',
          emitDecoratorMetadata: true,
          allowJs: true,
        };

        json.files = json.files.filter(
          (file: string) =>
            // remove files that match the following
            !['test.ts', 'src/test.ts'].some((testFile) => testFile === file)
        );

        json.compilerOptions.types = (json.compilerOptions?.types ?? [])
          .filter((type: string) => !['jasmine'].some((jasmineType) => jasmineType === type))
          .concat('jest');

        tree.overwrite(path, JSON.stringify(json, null, 2) + '\n');
      });

    return tree;
  };
}
