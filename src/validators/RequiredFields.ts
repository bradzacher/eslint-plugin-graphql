import {
  ValidationContext,
  GraphQLError,
  FieldNode,
  isNonNullType,
  isListType,
  GraphQLType,
  isObjectType,
  isInterfaceType,
  isInputObjectType,
  InlineFragmentNode,
} from 'graphql';

function getFieldWasRequestedOnNode(node : FieldNode | InlineFragmentNode, field : string, recursing = false) : boolean {
  if (!node.selectionSet) {
    return false
  }

  return node.selectionSet.selections.some(n => {
    // If it's an inline fragment, we need to look deeper
    if (n.kind === 'InlineFragment') {
      if (!recursing) {
        return getFieldWasRequestedOnNode(n, field, true);
      }

      return false
    }

    if (n.kind === 'FragmentSpread') {
      // We don't know if the field was requested in this case, so default to not erroring.
      return true;
    }

    return n.name.value === field;
  });
}

export function RequiredFields(options : { requiredFields : string[] }) {
  return (context : ValidationContext) => ({
    Field(node : FieldNode) {
      const def = context.getFieldDef();
      if (!def) {
        return;
      }
      const { requiredFields } = options;
      (requiredFields || []).forEach(field => {
        function recursivelyCheckOnType(type : GraphQLType, field : string) : boolean {
          if (isNonNullType(type) || isListType(type)) {
            return recursivelyCheckOnType(type.ofType, field)
          }

          if (isObjectType(type) || isInputObjectType(type) || isInterfaceType(type)) {
            return !!type.getFields()[field]
          }

          // TODO support unions?
          // if (isUnionType(type)) {
          // }

          return false
        }

        if (recursivelyCheckOnType(def.type, field)) {
          const fieldWasRequested = getFieldWasRequestedOnNode(node, field);
          if (!fieldWasRequested) {
            context.reportError(
              new GraphQLError(`'${field}' field required on '${node.name.value}'`, [node])
            );
          }
        }
      });
    },
  });
}
