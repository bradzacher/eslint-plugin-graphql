import { Context } from '../lib/interfaces/ESLint';
import createRule from '../lib/createRule';
import { OperationsMustHaveNames } from '../validators';

export default {
  meta: {
    schema: [],
  },
  create: (context : Context) => createRule(context, [OperationsMustHaveNames]),
}
