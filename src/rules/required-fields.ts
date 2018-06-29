import { Context } from '../lib/interfaces/ESLint';
import createRule from '../lib/createRule';
import { RequiredFields } from '../validators';

type Options = {
  requiredFields : string[]
}

export default {
  meta: {
    schema: [
      {
        type: 'object',
        properties: {
          requiredFields: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'string',
            },
          },
        },
        additionalProperties: false
      },
    ],
  },
  create: (context : Context<Options>) => createRule(context, [RequiredFields(context.options[0])]),
}
