import {
  ValidationContext,
  GraphQLError,
  getNamedType,
  FieldNode,
  EnumValueNode,
  GraphQLEnumType,
} from 'graphql';

// Mostly taken from https://github.com/graphql/graphql-js/blob/063148de039b02670a760b8d3dfaf2a04a467169/src/utilities/findDeprecatedUsages.js
// See explanation in [#93](https://github.com/apollographql/eslint-plugin-graphql/pull/93)
export function NoDeprecatedFields(context : ValidationContext) {
  return {
    Field(node : FieldNode) {
      const fieldDef = context.getFieldDef();
      if (fieldDef && fieldDef.isDeprecated) {
        const parentType = context.getParentType();
        if (parentType) {
          const reason = fieldDef.deprecationReason;
          context.reportError(new GraphQLError(
            `The field ${parentType.name}.${fieldDef.name} is deprecated.` +
            (reason ? ' ' + reason : ''),
            [ node ],
          ));
        }
      }
    },
    EnumValue(node : EnumValueNode) {
      const enumType = context.getType() as GraphQLEnumType;
      const enumVal = enumType.getValue(node.value);
      if (enumVal && enumVal.isDeprecated) {
        const inputType = context.getInputType();
        if (inputType) {
          const type = getNamedType(inputType);
          if (type) {
            const reason = enumVal.deprecationReason;
            context.reportError(new GraphQLError(
              `The enum value ${type.name}.${enumVal.name} is deprecated.` +
              (reason ? ' ' + reason : ''),
              [ node ],
            ));
          }
        }
      }
    }
  }
}
