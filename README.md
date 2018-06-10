# Getting Started With Schematics

This repository is a basic Schematic implementation that serves as a starting point to create and publish Schematics to NPM.

### Testing

To test locally, install `@angular-devkit/schematics` globally and use the `schematics` command line tool. That tool acts the same as the `generate` command of the Angular CLI, but also has a debug mode.

Check the documentation with
```bash
schematics --help
```

### Unit Testing

`npm run test` will run the unit tests, using Jasmine as a runner and test framework.

### Publishing

To publish, simply do:

```bash
npm run build
npm publish
```

That's it!

---

## Link package to test app

From the test dir (`./my-project`) run

```shell
npm link ../
```

## Development

Changes will be applied to test app at `./my-project`

In one shell run:

```shell
npm run build
```

In another terminal run:

```shell
npm run launch
```