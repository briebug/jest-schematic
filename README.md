# Jest Angular Schematic

This schematic will configure Angular to execute unit tests with Jest for single projects or workspaces.

[![npm (scoped)](https://img.shields.io/npm/v/@briebug/jest-schematic.svg)](https://www.npmjs.com/package/@briebug/jest-schematic)

## Usage 🚀

```shell
ng add @briebug/jest-schematic
```

- install [Jest](https://facebook.github.io/jest/), types and a [builder](https://github.com/just-jeb/angular-builders/tree/master/packages/jest)
- add Jest configuration files
- remove Karma & Jasmine along with their configuration files

### Optionally: install globally

```shell
npm install -g @briebug/jest-schematic
```

Then in an Angular CLI project run

```shell
ng g @briebug/jest-schematic:add
```

![jest-schematic-demo-500](docs/jest-schematic-demo-500.gif)

## Issues 🧐

If you're experiencing issues when trying to run your tests with Jest, please view the documentation for the [builder](https://github.com/just-jeb/angular-builders/tree/master/packages/jest) which uses [jest-preset-angular](https://github.com/thymikee/jest-preset-angular#troubleshooting).

A common issues involves library dependencies. For example if your app depends on `NgRx` you'll need to tell Jest to compile the sources [explicitly](https://github.com/thymikee/jest-preset-angular#adjust-your-transformignorepatterns-whitelist) by appending it to the `transformIgnorePatterns` property in the `jest.config.js` file.

```js
module.exports = {
  transformIgnorePatterns: ['node_modules/(?!(jest-test|@ngrx))'],
};
```

## Jest issues

Issues related to jest, ts-jest, or test execution may be related the installed version of jest and jest-preset-angular. The schematic may install a version of jest other than latest in an attempt to configure package versions that work together correctly. If you experience issues with your tests after running the schematic related to the aforementioned packages, please review the package versions and adjust them as necessary.

Issues with this schematic can be filed [here](https://github.com/briebug/jest-schematic/issues/new/choose).

## Learning Resources 📚

- [Unit Testing Angular With Jest](https://medium.com/@ole.ersoy/unit-testing-angular-with-jest-b65888ff33f6)

## Development 🛠

### Getting started

Clone or fork the repo and install the dependencies with Yarn

```shell
yarn
```

### Test schematic changes against a sandbox app

When running locally, schematic changes will be applied to a test app in the `/sandboxes` directory. `/sandboxes` contain a single app repo and a workspace repo with an application and library.

Run the following when a schematic change is made to test:

```bash
// runs against /sandboxes/single-app
yarn test single

// runs against /sandboxes/workspace
yarn test workspace
```

⚠ **Be careful not to check in changes to the sandbox directory unless necessary.** ⚠

### Reset sandboxes to their version controlled state

This will reset the sandboxes to their `HEAD` commit and remove un-tracked files.

```shell
yarn reset
```

### Test schematics against a local project

- run `yarn build` to compile the schematic in watch mode
- open another shell, cd into the local repo you want to run the schematic against, and run `yarn link @briebug/jest-schematic`. This assumes you've run `yarn link` in this repo on your machine.
  - this will symlink the projects so that the Jest schematic command runs from you're local filesystem
- in the local repo you want to run the schematic against, run `ng g @briebug/jest-schematic:add`

### Update sandboxes

When a new version of Angular is released, update all the sandbox apps and libs to the latest version.

_replace `15` with the latest version of Angular_

```shell
cd sandbox

rm single-app

npx @angular/cli@15 new single-app --routing --style=css --skip-git --package-manager=yarn

rm workspace

npx @angular/cli@15 new workspace --create-application=false --skip-git --package-manager=yarn

cd workspace

ng g app app-one --routing --style=css --skip-git

ng g lib lib-one
```

### Dev tips

For faster developing, find and comment out the following line to avoid npm installing dependencies

```ts
context.addTask(new NodePackageInstallTask());
```
