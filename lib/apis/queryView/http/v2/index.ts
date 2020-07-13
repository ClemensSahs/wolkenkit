import { Application } from '../../../../common/application/Application';
import { CorsOrigin } from 'get-cors-origin';
import { Application as ExpressApplication } from 'express';
import { getApiBase } from '../../../base/getApiBase';
import { getAuthenticationMiddleware } from '../../../base/getAuthenticationMiddleware';
import { IdentityProvider } from 'limes';
import { query } from './query';
import {getDescription} from "./getDescription";

const getV2 = async function<TItem> ({ application, corsOrigin, identityProviders }: {
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
