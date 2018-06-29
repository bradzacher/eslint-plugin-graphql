import { IntrospectionQuery, GraphQLSchema } from 'graphql'

import Validator from './Validator';

export const SETTINGS_KEY = 'graphql/schema'
export const PARSED_SETTINGS_SYMBOL = Symbol('ParsedSettings')

export type ClientType = 'lokka' | 'relay' | 'apollo' | 'literal'

// the settings variations that a user can input
export interface SettingsInput {
  env : ClientType,
  projectName ?: string,
  tagName ?: string,
  validators ?: 'all' | string[],

  schemaJson ?: { data : IntrospectionQuery },
  schemaJsonFilepath ?: string,
  schemaString ?: string,
}

// the normalised resolved settings
interface Settings {
  schema : GraphQLSchema;
  env : ClientType;
  tagName : string;
  validators : Validator[];
}

export default Settings
