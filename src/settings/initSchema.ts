import * as fs from 'fs';
import {
  buildClientSchema,
  buildSchema,
  IntrospectionQuery,
} from 'graphql';

export function initSchema(json : { data: IntrospectionQuery }) {
  const unpackedSchemaJson = json.data ? json.data : json;
  if (!('__schema' in unpackedSchemaJson)) {
    throw new Error('Please pass a valid GraphQL introspection query result.');
  }
  return buildClientSchema(unpackedSchemaJson);
}

export function initSchemaFromFile(jsonFilePath : string) {
  return initSchema(JSON.parse(fs.readFileSync(jsonFilePath, 'utf8')));
}

export function initSchemaFromString(source : string) {
  return buildSchema(source)
}
