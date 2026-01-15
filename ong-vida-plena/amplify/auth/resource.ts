import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ['Gerenciador', 'Administrador', 'Operador'],
  userAttributes: {
    'custom:cpf': {
      dataType: 'String',
      mutable: true,
      maxLen: 14,
      minLen: 11,
    }
  }
});
