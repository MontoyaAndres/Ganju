import { Context } from 'hono';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';
import { jwt } from 'better-auth/plugins/jwt';
import { oidcProvider } from 'better-auth/plugins/oidc-provider';
import { v7 as uuid } from 'uuid';
import { utils } from '@ganju/utils';
import { db } from '@ganju/db';

import { ganjuAuthPlugin } from './ganju-auth-plugin';
import { oauthConsentHTML } from './oauth-consent-page';

export const createAuth = (c: Context) => {
  const dbInstance = db.create(c);
  const isProduction = utils.getEnv(c, 'NODE_ENV') === 'production';
  const domain = utils.getEnv(c, 'NEXT_PUBLIC_DOMAIN');
  const apiUrl = utils.getEnv(c, 'NEXT_PUBLIC_API_URL')!;
  const webUrl = utils.getEnv(c, 'NEXT_PUBLIC_WEB_URL')!;

  return betterAuth({
    appName: 'ganju',
    database: drizzleAdapter(dbInstance, {
      provider: 'pg',
      schema: db.schema
    }),
    baseURL: apiUrl,
    basePath: '/auth',
    secret: utils.getEnv(c, 'JWT_SECRET')!,
    socialProviders: {
      google: {
        clientId: utils.getEnv(c, 'GOOGLE_CLIENT_ID')!,
        clientSecret: utils.getEnv(c, 'GOOGLE_CLIENT_SECRET')!
      },
      github: {
        clientId: utils.getEnv(c, 'GITHUB_CLIENT_ID')!,
        clientSecret: utils.getEnv(c, 'GITHUB_CLIENT_SECRET')!
      }
    },
    trustedOrigins: [webUrl, apiUrl],
    account: {
      storeStateStrategy: 'database',
      skipStateCookieCheck: true
    },
    advanced: {
      crossSubDomainCookies: domain
        ? { enabled: true, domain: `.${domain}` }
        : { enabled: false },
      database: {
        generateId: () => uuid()
      },
      useSecureCookies: isProduction
    },
    plugins: [
      jwt({
        jwt: {
          issuer: apiUrl,
          expirationTime: '1h'
        }
      }),
      oidcProvider({
        loginPage: `${webUrl}/login`,
        getConsentHTML: oauthConsentHTML,
        useJWTPlugin: true,
        allowDynamicClientRegistration: true,
        accessTokenExpiresIn: 3600,
        refreshTokenExpiresIn: 60 * 60 * 24 * 30
      }),
      ganjuAuthPlugin(utils.getEnv(c, 'BOT_OAUTH_CLIENT_ID'))
    ]
  });
};

export type Auth = ReturnType<typeof createAuth>;
