import {
  ValidationContext,
  GraphQLError,
  NamedTypeNode,
} from 'graphql';

export function TypeNamesShouldBeCapitalized(context : ValidationContext) {
  return {
    NamedType(node : NamedTypeNode) {
      const typeName = node.name.value;
      if (typeName[0] == typeName[0].toLowerCase()) {
        context.reportError(
          new GraphQLError("All type names should start with a capital letter", [ node ])
        );
      }
    }
  }
}
