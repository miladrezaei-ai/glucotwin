import { Amplify } from 'aws-amplify';

const config = {
  Auth: {
    Cognito: {
      region: 'eu-central-1',
      userPoolId: 'eu-central-1_tz1FOru1J',
      userPoolClientId: '79pd2jju2q7r67iff2e6qo64pg'
    }
  }
};

Amplify.configure(config);

export default config;