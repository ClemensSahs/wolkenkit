import { Application } from '../../../../common/application/Application';
import { CorsOrigin } from 'get-cors-origin';
import { Application as ExpressApplication } from 'express';
import { getApiBase } from '../../../base/getApiBase';
import { getAuthenticationMiddleware } from '../../../base/getAuthenticationMiddleware';
import { getDescription } from './getDescription';
import { IdentityProvider } from 'limes';
import { query } from './query';

const getV2 = async function ({ application, corsOrigin, identityProviders }: {
  application: Application;
  corsOrigin: CorsOrigin;
  identityProviders: IdentityProvider[];
}): Promise<{ api: ExpressApplication }> {
  const api = await getApiBase({
    request: {
      headers: { cors: { origin: corsOrigin }},
      body: { parser: { sizeLimit: 100_000 }},
      query: { parser: { useJson: true }}
    },
    response: {
      headers: { cache: false }
    }
  });

  const authenticationMiddleware = await getAuthenticationMiddleware({
    identityProviders
  });

  api.get(`/${getDescription.path}`, getDescription.getHandler({
    application
  }));

  api.get(`/${query.path}`, authenticationMiddleware, query.getHandler({
    application
  }));

  return { api };
};

export { getV2 };
