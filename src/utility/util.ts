import {
  JsonParseMode,
  experimental,
  parseJson,
  join,
  Path,
  parseJsonAst,
  JsonAstObject,
} from '@angular-devkit/core';

import {
  SchematicsException,
  Tree,
  SchematicContext,
} from '@angular-devkit/schematics';

import {
  pkgJson,
  DeleteNodeDependency,
  getPackageJsonDependency,
} from './dependencies';

import {
  findPropertyInAstObject,
  appendPropertyInAstObject,
  insertPropertyInAstObjectInOrder,
} from './json-utils';

import { get } from 'http';

export interface NodePackage {
  name: string;
  version: string;
}

export enum Paths {
  AngularJson = './angular.json',
}

export enum Configs {
  JsonIndentLevel = 4,
}

export type WorkspaceSchema = experimental.workspace.WorkspaceSchema;

export interface JestOptions {
  updateTests?: boolean;
  project?: string;
  config?: 'file' | 'packagejson' | string;
  overwrite?: boolean;
  __version__: number;
}

export function getAngularVersion(tree: Tree): number {
  const packageNode = getPackageJsonDependency(tree, '@angular/core');

  const version =
    packageNode &&
    packageNode.version.split('').find((char) => !!parseInt(char, 10));

  return version ? +version : 0;
}

export function getWorkspacePath(host: Tree): string {
  const possibleFiles = [
    '/angular.json',
    '/.angular.json',
    '/angular-cli.json',
  ];
  const path = possibleFiles.filter((path) => host.exists(path))[0];

  return path;
}

export function getWorkspace(host: Tree): WorkspaceSchema {
  const path = getWorkspacePath(host);
  const configBuffer = host.read(path);
  if (configBuffer === null) {
    throw new SchematicsException(`Could not find (${path})`);
  }
  const content = configBuffer.toString();

  return (parseJson(content, JsonParseMode.Loose) as {}) as WorkspaceSchema;
}

export function getSourcePath(tree: Tree, options: any): String {
  const workspace = getWorkspace(tree);

  if (!options.project) {
    throw new SchematicsException('Option "project" is required.');
  }

  const project = workspace.projects[options.project];

  if (project.projectType !== 'application') {
    throw new SchematicsException(
      `AddJest requires a project type of "application".`
    );
  }

  // const assetPath = join(project.root as Path, 'src', 'assets');
  const sourcePath = join(project.root as Path, 'src');

  return sourcePath;
}

// modified version from utility/dependencies/getPackageJsonDependency
export function removePackageJsonDependency(
  tree: Tree,
  dependency: DeleteNodeDependency
): void {
  const packageJsonAst = parseJsonAtPath(tree, pkgJson.Path);
  const depsNode = findPropertyInAstObject(packageJsonAst, dependency.type);
  const recorder = tree.beginUpdate(pkgJson.Path);

  if (!depsNode) {
    // Haven't found the dependencies key.
    new SchematicsException('Could not find the package.json dependency');
  } else if (depsNode.kind === 'object') {
    const fullPackageString = depsNode.text.split('\n').filter((pkg) => {
      return pkg.includes(`"${dependency.name}"`);
    })[0];

    const commaDangle =
      fullPackageString && fullPackageString.trim().slice(-1) === ',' ? 1 : 0;

    const packageAst = depsNode.properties.find((node) => {
      return node.key.value.toLowerCase() === dependency.name.toLowerCase();
    });

    // TODO: does this work for the last dependency?
    const newLineIndentation = 5;

    if (packageAst) {
      // Package found, remove it.
      const end = packageAst.end.offset + commaDangle;

      recorder.remove(
        packageAst.key.start.offset,
        end - packageAst.start.offset + newLineIndentation
      );
    }
  }

  tree.commitUpdate(recorder);
}

export function safeFileDelete(tree: Tree, path: string): boolean {
  if (tree.exists(path)) {
    tree.delete(path);
    return true;
  } else {
    return false;
  }
}

export function addPropertyToPackageJson(
  tree: Tree,
  context: SchematicContext,
  propertyName: string,
  propertyValue: { [key: string]: any }
) {
  const packageJsonAst = parseJsonAtPath(tree, pkgJson.Path);
  const pkgNode = findPropertyInAstObject(packageJsonAst, propertyName);
  const recorder = tree.beginUpdate(pkgJson.Path);

  if (!pkgNode) {
    // outer node missing, add key/value
    appendPropertyInAstObject(
      recorder,
      packageJsonAst,
      propertyName,
      propertyValue,
      Configs.JsonIndentLevel
    );
  } else if (pkgNode.kind === 'object') {
    // property exists, update values
    for (let [key, value] of Object.entries(propertyValue)) {
      const innerNode = findPropertyInAstObject(pkgNode, key);

      if (!innerNode) {
        // script not found, add it
        context.logger.debug(`creating ${key} with ${value}`);

        insertPropertyInAstObjectInOrder(
          recorder,
          pkgNode,
          key,
          value,
          Configs.JsonIndentLevel
        );
      } else {
        // script found, overwrite value
        context.logger.debug(`overwriting ${key} with ${value}`);

        const { end, start } = innerNode;

        recorder.remove(start.offset, end.offset - start.offset);
        recorder.insertRight(start.offset, JSON.stringify(value));
      }
    }
  }

  tree.commitUpdate(recorder);
}

export function getWorkspaceConfig(tree: Tree, options: JestOptions) {
  const workspace = getWorkspace(tree);
  const workspacePath = getWorkspacePath(tree);
  let projectName;
  let projectProps;

  if (options.__version__ >= 6) {
    projectName = options.project || workspace.defaultProject || '';
    projectProps = workspace.projects[projectName];
  } else if (options.__version__ < 6) {
    projectName = (workspace as any).project.name || '';
    projectProps = (workspace as any).apps[0];
  }

  return { projectProps, workspacePath, workspace, projectName };
}

/**
 * Angular5 (angular-cli.json) config is formatted into an array of applications vs Angular6's (angular.json) object mapping
 * multi-app Angular5 apps are currently not supported.
 *
 * @param tree
 * @param options
 */
export function isMultiAppV5(tree: Tree, options: JestOptions) {
  const config = getWorkspaceConfig(tree, options);

  return options.__version__ < 6 && (config.workspace as any).apps.length > 1;
}

/**
 * Attempt to retrieve the latest package version from NPM
 * Return an optional "latest" version in case of error
 * @param packageName
 */
export function getLatestNodeVersion(packageName: string): Promise<NodePackage> {
  const DEFAULT_VERSION = 'latest';

  return new Promise((resolve) => {
    return get(`http://registry.npmjs.org/${packageName}`, (res) => {
      let rawData = '';
      res.on('data', (chunk) => (rawData += chunk));
      res.on('end', () => {
        try {
          const response = JSON.parse(rawData);
          const version = response && response['dist-tags'] || {};

          resolve(buildPackage(packageName, version.latest));
        } catch (e) {
          resolve(buildPackage(packageName));
        }
      });
    }).on('error', () => resolve(buildPackage(packageName)));
  });

  function buildPackage(name: string, version: string = DEFAULT_VERSION): NodePackage {
    return { name, version };
  }
}

export function parseJsonAtPath(tree: Tree, path: string): JsonAstObject {
  const buffer = tree.read(path);

  if (buffer === null) {
    throw new SchematicsException('Could not read package.json.');
  }

  const content = buffer.toString();

  const json = parseJsonAst(content, JsonParseMode.Strict);
  if (json.kind != 'object') {
    throw new SchematicsException(
      'Invalid package.json. Was expecting an object'
    );
  }

  return json;
}
