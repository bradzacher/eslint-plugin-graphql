import {
  ValidationContext,
  GraphQLError,
  OperationDefinitionNode,
} from 'graphql';

export function OperationsMustHaveNames(context : ValidationContext) {
  return {
    OperationDefinition(node : OperationDefinitionNode) {
      if (!node.name) {
        context.reportError(
          new GraphQLError("All operations must be named", [ node ])
        );
      }
    },
  };
}
