import {
  JsonParseMode,
  experimental,
  parseJson,
  join,
  Path,
} from '@angular-devkit/core';
import { SchematicsException, Tree } from '@angular-devkit/schematics';
import { readPackageJson, pkgJson, DeleteNodeDependency } from './dependencies';
import { findPropertyInAstObject } from './json-utils';

export type WorkspaceSchema = experimental.workspace.WorkspaceSchema;

export interface JestOptions {
  updateTests?: boolean;
}

export function getWorkspacePath(host: Tree): string {
  const possibleFiles = ['/angular.json', '/.angular.json'];
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

// modified version from `utility/dependencies/getPackageJsonDependency`
export function removePackageJsonDependency(
  tree: Tree,
  dependency: DeleteNodeDependency
): void {
  const packageJsonAst = readPackageJson(tree);
  const depsNode = findPropertyInAstObject(packageJsonAst, dependency.type);
  const recorder = tree.beginUpdate(pkgJson.Path);

  if (!depsNode) {
    // Haven't found the dependencies key.
    new SchematicsException('Could not find the package.json dependency');
  } else if (depsNode.kind === 'object') {
    // check if package exists
    const fullPackageString = depsNode.text
      .split('\n')
      .filter((pkg) => {
        return pkg.includes(`"${dependency.name}"`);
      })[0]
      .trim();

    const commaDangle = fullPackageString.slice(-1) === ',' ? 1 : 0;
    const packageAst = depsNode.properties.find(
      (node) => node.key.value === dependency.name
    );

    // TODO: does this work for last dependency?
    const newLineIndentation = 5;

    if (packageAst) {
      const end = packageAst.end.offset + commaDangle;
      // Package found, remove it.
      recorder.remove(
        packageAst.key.start.offset,
        end - packageAst.start.offset + newLineIndentation
      );
    }
  }

  tree.commitUpdate(recorder);
}
