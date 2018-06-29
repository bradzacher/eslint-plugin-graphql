import { flatten } from 'lodash';
import { Linter } from 'eslint';

import internalTag from '../lib/internalTag';
import rules from '../rules'

const gqlFiles = ['gql', 'graphql'];

const ruleKeys = Object.keys(rules).map((key) => `graphql/${key}`)

const gqlProcessor = {
  preprocess: function(text : string) {
    // Wrap the text in backticks and prepend the internal tag. First the text
    // must be escaped, because of the three sequences that have special
    // meaning in JavaScript template literals, and could change the meaning of
    // the text or cause syntax errors.
    // https://tc39.github.io/ecma262/#prod-TemplateCharacter
    //
    // - "`" would end the template literal.
    // - "\" would start an escape sequence.
    // - "${" would start an interpolation.
    const escaped = text.replace(/[`\\]|\$\{/g, '\\$&');
    return [`${internalTag}\`${escaped}\``];
  },
  postprocess: function(messages : Linter.LintMessage[]) {
    // only report graphql-errors
    return flatten(messages).filter((message) => {
      if (!message.ruleId) {
        return false
      }

      return ruleKeys.includes(message.ruleId);
    })
  }
}

export default gqlFiles.reduce((result, value) => {
  result[`.${value}`] = gqlProcessor

  return result
}, {} as Record<string, typeof gqlProcessor>)
