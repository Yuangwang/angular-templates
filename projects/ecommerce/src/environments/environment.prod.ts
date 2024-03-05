import { Environment } from './env-types';
import { Common } from './common';

export const environment: Environment = {
  ...Common,
  apiUrl: 'https://prod.api',
};
