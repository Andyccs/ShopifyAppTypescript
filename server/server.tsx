import "@babel/polyfill";
import "isomorphic-fetch";
import createShopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import graphQLProxy, { ApiVersion } from "@shopify/koa-shopify-graphql-proxy";
import Koa from "koa";
import next from "next";
import Router, { RouterContext } from "koa-router";
import session from "koa-session";

import { readEnvironmentVariables } from "./env";

const {
  PORT,
  NODE_ENV,
  SHOPIFY_API_SECRET_KEY,
  SHOPIFY_API_KEY,
  SCOPES,
} = readEnvironmentVariables();

const port: number = parseInt(PORT, 10);
const dev: boolean = NODE_ENV !== "production";
const app = next({
  dev,
});
const handle = app.getRequestHandler();

const initializationFn = () => {
  const server: Koa = new Koa();

  // Koa Session: https://github.com/koajs/session
  // This is a dependency of @shopify/koa-shopify-auth
  server.use(
    session(
      {
        sameSite: "none",
        secure: true,
      },
      server
    )
  );

  // Set signed cookie keys.
  server.keys = [SHOPIFY_API_SECRET_KEY];

  // Integrate Koa Shopify Auth
  //
  // Koa Shopify Auth is a middleware to authenticate a Koa application with Shopify.
  // For reference: https://github.com/Shopify/koa-shopify-auth
  server.use(
    createShopifyAuth({
      apiKey: SHOPIFY_API_KEY,
      secret: SHOPIFY_API_SECRET_KEY,
      scopes: [SCOPES],

      async afterAuth(ctx) {
        // Access token and shop available in ctx.state.shopify
        const { shop } = ctx.state.shopify;

        // Redirect to app with shop parameter upon auth
        ctx.redirect(`/?shop=${shop}`);
      },
    })
  );

  // Proxying of GraphQL requests from an embedded Shopify app.
  // Attaching the middleware will proxy any requests sent to /graphql on your
  // app to the current logged-in shop found in session.
  // For reference: https://www.npmjs.com/package/@shopify/koa-shopify-graphql-proxy
  server.use(
    graphQLProxy({
      version: ApiVersion.October20,
    })
  );

  // Use Koa router to route all get requests to the following handler. The
  // handler will verify whether the request is authenticated, before using
  // Next.js provided handler to handle the requests.
  // https://github.com/koajs/router/blob/master/API.md#module_koa-router--Router+routes
  const router: Router = new Router();
  router.get("(.*)", verifyRequest(), async (ctx: RouterContext) => {
    await handle(ctx.req, ctx.res);

    // This is a false positive by ESLint.
    // ESLint assumes that the asynchronous function will be called in parallel
    // using the same Context. However, Context is always a different object
    // in this case because it is supposed to be request scoped.
    ctx.respond = false; // eslint-disable-line require-atomic-updates
    ctx.res.statusCode = 200; // eslint-disable-line require-atomic-updates
  });
  server.use(router.allowedMethods());
  server.use(router.routes());

  // Starts listening for requests.
  server.listen(port, () => {
    console.info(`> Ready on http://localhost:${port}`);
  });
};

const catchFn = (error: Error) => {
  console.error(error);
};

app.prepare().then(initializationFn).catch(catchFn);
