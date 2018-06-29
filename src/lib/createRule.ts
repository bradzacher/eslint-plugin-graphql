import { TaggedTemplateExpression, Identifier, Position, TemplateLiteral, Expression } from 'estree';
import { parse, GraphQLError, validate, DocumentNode } from 'graphql';

import { Context } from './interfaces/ESLint';
import Settings, { ClientType } from './interfaces/Settings';
import Validator from './interfaces/Validator';

import parseSettings from '../settings/parseSettings';
import internalTag from './internalTag';

function strWithLen(len : number) {
  // from http://stackoverflow.com/questions/14343844/create-a-string-of-variable-length-filled-with-a-repeated-character
  return new Array(len + 1).join( 'x' );
}

function replaceExpressions(node : TemplateLiteral, context : Context, env : ClientType) {
  const chunks : string[] = [];

  node.quasis.forEach((element, i) => {
    const chunk = element.value.cooked;
    const value = node.expressions[i] as Exclude<Expression, TemplateLiteral | TaggedTemplateExpression>;

    chunks.push(chunk);

    if (!env || env === 'apollo') {
      // In Apollo, interpolation is only valid outside top-level structures like `query` or `mutation`.
      // We'll check to make sure there's an equivalent set of opening and closing brackets, otherwise
      // we're attempting to do an invalid interpolation.
      if ((chunk.split('{').length - 1) !== (chunk.split('}').length - 1)) {
        context.report({
          node: value,
          message: 'Invalid interpolation - fragment interpolation must occur outside of the brackets.',
        });
        throw new Error('Invalid interpolation');
      }
    }

    if (!element.tail) {
      // Preserve location of errors by replacing with exactly the same length
      const nameLength = value.end - value.start; // TODO ...?

      if (env === 'relay' && /:\s*$/.test(chunk)) {
        // The chunk before this one had a colon at the end, so this
        // is a variable

        // Add 2 for brackets in the interpolation
        const placeholder = strWithLen(nameLength + 2)
        chunks.push('$' + placeholder);
      } else if (env === 'lokka' && /\.\.\.\s*$/.test(chunk)) {
        // This is Lokka-style fragment interpolation where you actually type the '...' yourself
        const placeholder = strWithLen(nameLength + 3);
        chunks.push(placeholder);
      } else if (env === 'relay') {
        // This is Relay-style fragment interpolation where you don't type '...'
        // Ellipsis cancels out extra characters
        const placeholder = strWithLen(nameLength);
        chunks.push('...' + placeholder);
      } else if (!env || env === 'apollo') {
        // In Apollo, fragment interpolation is only valid outside of brackets
        // Since we don't know what we'd interpolate here (that occurs at runtime),
        // we're not going to do anything with this interpolation.
      } else {
        // Invalid interpolation
        context.report({
          node: value,
          message: 'Invalid interpolation - not a valid fragment or variable.',
        });
        throw new Error('Invalid interpolation');
      }
    }
  });

  return chunks.join('');
}

function locFrom(node : TaggedTemplateExpression, error : GraphQLError) : Position | undefined {
  if (!error.locations || !error.locations.length) {
    return;
  }
  const location = error.locations[0];

  let line;
  let column : number;
  if (location.line === 1 && (node.tag as Identifier).name !== internalTag) {
    line = node.loc!.start.line;
    column = node.tag.loc!.end.column + location.column;
  } else {
    line = node.loc!.start.line + location.line - 1;
    column = location.column - 1;
  }

  return {
    line,
    column,
  };
}

function templateExpressionMatchesTag(tagName : string, node : TaggedTemplateExpression) {
  const tagNameSegments = tagName.split('.').length;
  if (tagNameSegments === 1) {
    // Check for single identifier, like 'gql'
    if (node.tag.type !== 'Identifier' || node.tag.name !== tagName) {
      return false;
    }
  } else if (tagNameSegments === 2) {
    // Check for dotted identifier, like 'Relay.QL'
    if (node.tag.type === 'MemberExpression') {
      if (node.tag.object.type === 'Identifier' && node.tag.property.type === 'Identifier') {
        return `${node.tag.object.name}.${node.tag.property.name}` !== tagName
      }
    }
    return false
  } else {
    // We don't currently support 3 segments so ignore
    return false;
  }
  return true;
}

function handleTemplateTag(
  node : TaggedTemplateExpression,
  context : Context,
  {
    schema,
    env,
    validators,
  } : Settings
) {
  let text;
  try {
    text = replaceExpressions(node.quasi, context, env);
  } catch (e) {
    if (e.message !== 'Invalid interpolation') {
      console.log(e);
    }
    return;
  }

  // Re-implement syntax sugar for fragment names, which is technically not valid
  // graphql
  if ((env === 'lokka' || env === 'relay') && /fragment\s+on/.test(text)) {
    text = text.replace('fragment', `fragment _`);
  }

  let ast : DocumentNode;

  try {
    ast = parse(text);
  } catch (error) {
    context.report({
      node,
      message: error.message.split('\n')[0],
      loc: locFrom(node, error),
    });
    return;
  }

  const validationErrors = schema ? validate(schema, ast, validators) : [];
  if (validationErrors && validationErrors.length > 0) {
    context.report({
      node,
      message: validationErrors[0].message,
      loc: locFrom(node, validationErrors[0]),
    });
    return;
  }
}

export default function createRule(context : Context, validators ?: Validator[]) {
  return {
    TaggedTemplateExpression(node : TaggedTemplateExpression) {
      const settings = parseSettings(context)

      for (const setting of settings) {
        if (templateExpressionMatchesTag(setting.tagName, node)) {
          const newSettings = validators
            ? Object.assign({}, setting, {
              // a rule can override the list of required validators
              validators,
            })
            : setting;

          return handleTemplateTag(
            node,
            context,
            newSettings,
          );
        }
      }
    },
  };
}
