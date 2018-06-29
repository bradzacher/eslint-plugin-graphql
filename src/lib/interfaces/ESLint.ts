import { Linter, Rule } from 'eslint'
import { Node, SourceLocation, Position } from 'estree';

import Settings, { SettingsInput, SETTINGS_KEY, PARSED_SETTINGS_SYMBOL } from './Settings';

// https://github.com/eslint/eslint/blob/c74933b0fc140f6b1d9dd09f72dc5a2963f31f88/docs/developer-guide/working-with-rules.md#the-context-object
export interface Context<TRuleOptions = any> {
  id : string,
  options : TRuleOptions[],
  parserOptions : Linter.ParserOptions,
  parserServices : {}, // no custom parser integration
  settings ?: {
    [SETTINGS_KEY] ?: SettingsInput | SettingsInput[],
  },

  getFilename() : string,
  report(descriptor : {
    message : string,
    node ?: Node,
    loc ?: Position | SourceLocation,
    data ?: Record<string, any>,
    fix ?: Rule.RuleFixer,
  }) : void

  [PARSED_SETTINGS_SYMBOL] : Settings[]
}

