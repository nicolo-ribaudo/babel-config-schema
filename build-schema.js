const yaml = require("yaml-tag");

const [/* node */, /* this file */, kind] = process.argv;
if (kind !== "relative" && kind !== "root") {
  throw new Error(`\
Usage:
  node build-schema root     > schemas/babel-config.schema.json
  node build-schema relative > schemas/babelrc.schema.json
`)
}

const plugins = [];
const presets = [];

const schema = yaml`
  $schema: http://json-schema.org/draft-07/schema
  $id: http://babeljs.io/config-schema
  title: Babel 7 configuration schema
  type: object
  additionalProperties: false
  properties:
    <<: ${kind === "root" ? yaml`
      babelrc:
        type: boolean
        default: true
        description: >
          Enable searching for configuration files relative to the
          "filename" provided to Babel.

          Note: .babelrc files are only loaded if the current "filename" is
          inside of a package that matches one of the "babelrcRoots" packages.
      
      babelrcRoots:
        oneOf:
          - type: boolean
          - $ref: "#/utils/match-patterns"
        description: >
          By default, Babel will only search for .babelrc files within the
          "root" package because otherwise Babel cannot know if a given .babelrc
          is meant to be loaded, or if it's "plugins" and "presets" have even
          been installed, since the file being compiled could be inside
          node_modules, or have been symlinked into the project.

          This option allows users to provide a list of other packages that
          should be considered "root" packages when considering whether to
          load .babelrc files.
    ` : {}}

    plugins:
      type: array
      items:
        oneOf: ${plugins}

    presets:
      type: array
      items:
        oneOf: ${presets}

    extends:
      type: string
      description: >
        Configs may "extend" other configuration files. Config fields in the
        current config will be merged on top of the extended file's
        configuration.

    env:
      type: object
      patternProperties:
        ^.*$:
          type: object
          properties: ${configOpts(["plugins", "presets", "test", "include", "exclude", "ignore", "only"])}
          additionalProperties: false
      additionalProperties: false
      description: >
        Allows for entire nested configuration options that will only be enabled
        if the envKey matches the envName option.

        Note: env[envKey] options will be merged on top of the options specified
        in the root object.

    override:
      type: array
      items:
        type: object
        properties: ${configOpts(["env", "plugins", "presets", "test", "include", "exclude", "ignore", "only"])}
        additionalProperties: false
      description: >
        Allows users to provide an array of options that will be merged into the
        current configuration one at a time. This feature is best used alongside
        the "test"/"include"/"exclude" options to provide conditions for which
        an override should apply.

    test:
      $ref: "#/utils/match-patterns"
      description: >
        If all patterns fail to match, the current configuration object is
        considered inactive and is ignored during config processing. This option
        is most useful when used within an overrides option object, but it's
        allowed anywhere.

    include:
      $ref: "#/utils/match-patterns"
      description: >
        If all patterns fail to match, the current configuration object is
        considered inactive and is ignored during config processing. This option
        is most useful when used within an overrides option object, but it's
        allowed anywhere.


        This option is a synonym for "test".

    exclude:
      $ref: "#/utils/match-patterns"
      description: >
        If any of patterns match, the current configuration object is considered
        inactive and is ignored during config processing. This option is most
        useful when used within an overrides option object, but it's allowed
        anywhere.

    ignore:
      $ref: "#/utils/match-patterns"
      description: >
        If any of the patterns match, Babel will immediately stop all processing
        of the current build.

        Note: This option disables all Babel processing of a file. While that
        has its uses, it is also worth considering the "exclude" option as a
        less aggressive alternative.

    only:
      $ref: "#/utils/match-patterns"
      description: >
        If all of the patterns match, Babel will immediately stop all processing
        of the current build.

        Note: This option disables all Babel processing of a file. While that
        has its uses, it is also worth considering the "test"/"include" option
        as a less aggressive alternative.

  plugin-options:
    empty:
      type: object
      properties: {}
      additionalProperties: false
    loose:
      type: object
      properties:
        loose: ${bool(false)}
  
  utils:
    browserslist:
      oneOf:
        - type: string
        - type: array
          items:
            type: string
      description: >
        A query to select browsers (ex: "last 2 versions, > 5%, safari tp")
        using browserslist.

    match-patterns:
      oneOf:
        - type: string
        - type: array
          items:
            type: string
`;

const options = {
  empty: { $ref: "#/plugin-options/empty" },
  loose: { $ref: "#/plugin-options/loose" }
};

plugin("@babel/plugin-proposal-class-properties", options.loose);
plugin("@babel/plugin-proposal-do-expressions", options.empty);
plugin("@babel/plugin-proposal-export-default-from", options.empty);
plugin("@babel/plugin-proposal-export-namespace-from", options.empty);
plugin("@babel/plugin-proposal-function-bind", options.empty);
plugin("@babel/plugin-proposal-function-sent", options.empty);
plugin("@babel/plugin-proposal-logical-assignment-operators", options.empty);
plugin("@babel/plugin-proposal-nullish-coalescing-operator", options.loose);
plugin("@babel/plugin-proposal-numeric-separator", options.empty);
plugin("@babel/plugin-proposal-optional-chaining", options.loose);
plugin("@babel/plugin-proposal-partial-application", options.empty);
plugin("@babel/plugin-proposal-private-methods", options.loose);
plugin("@babel/plugin-proposal-throw-expressions", options.empty);

plugin("@babel/plugin-proposal-decorators", yaml`
  oneOf:
    - type: object
      properties:
        decoratorsBeforeExport: ${bool(false)}
        legacy:
          const: false
      additionalProperties: false
      required: [decoratorsBeforeExport]
    - type: object
      properties:
        legacy:
          const: true
      additionalProperties: false
      required: [legacy]
`, { required: true });

plugin("@babel/plugin-proposal-pipeline-operator", yaml`
  type: object
  properties:
    proposal:
      enum: [minimal, smart, fsharp]
  additionalProperties: false
  required: [proposal]
`, { required: true });

const version = {
  type: "string",
  description: "The minimum version of this engine to support."
};

preset("@babel/preset-env", yaml`
  type: object
  properties:
    targets:
      description: >
        Describes the environments you support/target for your project.

        This can either be a browserslist-compatible query, provided as a
        string or an array, or an object of minimum environment versions to
        support.
      oneOf:
        - $ref: "#/utils/browserslist"
        - type: object
          properties:
            chrome: ${version}
            opera: ${version}
            edge: ${version}
            firefox: ${version}
            ie: ${version}
            ios: ${version}
            android: ${version}
            eleftron: ${version}
            safari:
              anyOf:
                - ${version}
                - const: tp
                  description: >
                    If you want to compile against the technology preview
                    version of Safari.
            node:
              anyOf:
                - enum: [current, true]
                  description: >
                    If you want to compile against the current node version,
                    you can specify "node": true or "node": "current", which
                    would be the same as "node": process.versions.node.
                - ${version}
            browsers:
              $ref: "#/utils/browserslist"
            esmodules:
              type: boolean
              default: false
              description: >
                You may also target browsers supporting ES Modules. When
                specifying this option, the browsers field will be ignored.
                You can use this approach in combination with
                <script type="module"></script> to conditionally serve smaller
                scripts to users.
      default: "last 2 versions, >5%, safari tp"
    spec:
      type: boolean
      default: false
      description: >
        Enable more spec compliant, but potentially slower, transformations for
        any plugins in this preset that support them.
    loose:
      type: boolean
      default: false
      description: >
        Enable "loose" transformations for any plugins in this preset that
        allow them.
    modules:
      description: >
        Configure transformation of ECMAScript modules.
      oneOf:
        - const: "auto"
          description: >
            Autmatically choose depending on how Babel is called. For example,
            this will disable the modules transform when using webpack or
            rollup, but not then using @babel/cli.
        - const: false
          description: >
            Don't transform modules.
        - enum: [amd, umd, systemjs, commonjs, cjs]
      default: auto
    debug:
      type: boolean
      default: false
      description: >
        Output the targets/plugins used and the version specified in plugin
        data version to console.log
    include:
      type: array
      items:
        type: string
    exclude:
      type: array
      items:
        type: string
    useBuiltIns:
      enum: [usage, entry, false]
    corejs:
      oneOf:
        - enum: [2, 3]
        - type: object
          properties:
            version:
              enum: [2, 3]
            proposals: ${bool(false)}
          additionalProperties: false
          required: [version]
    configPath:
      type: string
    ignoreBrowserslistConfig: ${bool(false)}
    shippedProposals: ${bool(false)}
  additionalProperties: false
`);

preset("@babel/preset-typescript", yaml`
  type: object
  properties:
    isTSX:
      type: boolean
`);

console.log(JSON.stringify(schema, null, 2));

function bool(def) {
  return { type: "boolean", default: def };
}

function plugin() {
  pluginOrPreset(plugins, ...arguments);
}

function preset() {
  pluginOrPreset(presets, ...arguments);
}

function pluginOrPreset(items, name, options, { required } = {}) {
  if (!required) items.push({ const: name });
  items.push({
    type: "array",
    items: [{ const: name }, options, { type: "string" }],
    minItems: required ? 2 : 1,
    additionalItems: false
  });

  items.sort((a, b) => {
    if (a.const) {
      if (b.const) {
        return [a.const, b.const].sort()[0] === a.const ? -1 : 1;
      }
      return 1;
    }
    if (b.const) return 1;
    return [a.items[0].const, b.items[0].const].sort()[0] === a.items[0].const
      ? -1
      : 1;
  });
}

function configOpts(names) {
  const obj = {};
  for (const name of names) obj[name] = { $ref: `#/properties/${name}` };
  return obj;
}
