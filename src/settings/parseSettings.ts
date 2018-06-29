import { getGraphQLConfig, ConfigNotFoundError } from 'graphql-config';
import { specifiedRules as allGraphQLValidators, GraphQLSchema } from 'graphql';
import { without } from 'lodash';
import * as path from 'path';

import { Context } from '../lib/interfaces/ESLint';
import { initSchema, initSchemaFromFile, initSchemaFromString } from './initSchema';
import Settings, { SETTINGS_KEY, PARSED_SETTINGS_SYMBOL, SettingsInput } from '../lib/interfaces/Settings';
import internalTag from '../lib/internalTag';

const allGraphQLValidatorNames = allGraphQLValidators.map(rule => rule.name);
const envGraphQLValidatorNames = {
  apollo: without(allGraphQLValidatorNames,
    'KnownFragmentNames',
    'NoUnusedFragments',
  ),
  lokka: without(allGraphQLValidatorNames,
    'KnownFragmentNames',
    'NoUnusedFragments',
  ),
  relay: without(allGraphQLValidatorNames,
    'KnownDirectives',
    'KnownFragmentNames',
    'NoUndefinedVariables',
    'NoUnusedFragments',
    'ProvidedNonNullArguments',
    'ScalarLeafs',
  ),
  literal: without(allGraphQLValidatorNames,
    'KnownFragmentNames',
    'NoUnusedFragments',
  ),
};

function parseSetting(context : Context, setting : SettingsInput) : Settings {
  const {
    schemaJson, // Schema via JSON object
    schemaJsonFilepath, // Or Schema via absolute filepath
    schemaString, // Or Schema as string,
    env,
    projectName,
    tagName: tagNameOption,
    validators: validatorNamesOption,
  } = setting;

  // Validate and unpack schema
  let schema : GraphQLSchema;
  if (schemaJson) {
    schema = initSchema(schemaJson);
  } else if (schemaJsonFilepath) {
    schema = initSchemaFromFile(schemaJsonFilepath);
  } else if (schemaString) {
    schema = initSchemaFromString(schemaString);
  } else {
    try {
      const filename = context.getFilename();
      const config = getGraphQLConfig(path.dirname(filename));
      let projectConfig;
      if (projectName) {
        const projects = config.getProjects();
        if (!projects) {
          throw new Error(`No projects found in ${config.configPath}.`);
        }
        projectConfig = projects[projectName];
        if (!projectConfig) {
          throw new Error(`Project with name "${projectName}" not found in ${config.configPath}.`);
        }
      } else {
        projectConfig = config.getConfigForFile(filename);
        if (!projectConfig) {
          throw new Error(`Project was not found in ${config.configPath}.`);
        }
      }

      schema = projectConfig.getSchema();
    } catch (e) {
      if (e instanceof ConfigNotFoundError) {
        throw new Error('Must provide .graphqlconfig file or pass in `schemaJson` option ' +
          'with schema object or `schemaJsonFilepath` with absolute path to the json file.');
      }
      throw e;
    }

  }

  // Validate env
  if (env && env !== 'lokka' && env !== 'relay' && env !== 'apollo' && env !== 'literal') {
    throw new Error('Invalid option for env, only `apollo`, `lokka`, `relay`, and `literal` supported.')
  }

  // Validate tagName and set default
  let tagName;
  if (tagNameOption) {
    tagName = tagNameOption;
  } else if (env === 'relay') {
    tagName = 'Relay.QL';
  } else if (env === 'literal') {
    tagName = internalTag;
  } else {
    tagName = 'gql';
  }

  // The validator list may be:
  //    The string 'all' to use all rules.
  //    An array of rule names.
  //    null/undefined to use the default rule set of the environment, or all rules.
  let validatorNames;
  if (validatorNamesOption === 'all') {
    validatorNames = allGraphQLValidatorNames;
  } else if (validatorNamesOption) {
    validatorNames = validatorNamesOption;
  } else {
    validatorNames = envGraphQLValidatorNames[env] || allGraphQLValidatorNames;
  }

  const validators = validatorNames.map(name => require(`graphql/validation/rules/${name}`)[name]);

  return { schema, env, tagName, validators };
}


export default function parseSettings(context : Context) {
  // short circuit the parse
  if (context[PARSED_SETTINGS_SYMBOL]) {
    return context[PARSED_SETTINGS_SYMBOL]
  }
  if (!context.settings || !context.settings[SETTINGS_KEY]) {
    throw new Error('Must specify settings key "graphql/schema" in eslintrc')
  }

  const rawSettings = context.settings[SETTINGS_KEY]!
  const settings = Array.isArray(rawSettings)
    ? rawSettings
    : [rawSettings]

  const results = settings.map(s => parseSetting(context, s))

  context[PARSED_SETTINGS_SYMBOL] = results;

  return results;
}
