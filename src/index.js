import 'dotenv/config';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import jwt from 'jsonwebtoken';
import DataLoader from 'dataloader';
import express from 'express';
import bodyParser from 'body-parser';
import { HttpLink } from 'apollo-link-http';
import { setContext } from 'apollo-link-context';
import {
  ApolloServer,
  AuthenticationError,
} from 'apollo-server-express';
import {
  makeExecutableSchema,
  makeRemoteExecutableSchema,
  mergeSchemas,
  introspectSchema,
  transformSchema,
  FilterRootFields,
  RenameTypes,
  RenameRootFields,
} from 'graphql-tools';
import fetch from 'node-fetch';
import promiseLimit from 'promise-limit';

import typeDefs from './schema';
import resolvers from './resolvers';
import models, { connectDb } from './models';
import loaders from './loaders';

const app = express();

app.use(cors());

app.use(morgan('dev'));

const getMe = async req => {
  const token = req.headers['x-token'];

  if (token) {
    try {
      return await jwt.verify(token, process.env.SECRET);
    } catch (e) {
      throw new AuthenticationError(
        'Your session expired. Sign in again.',
      );
    }
  }
};

const createHttpServer = async () => {
  const localSchema = makeExecutableSchema({ typeDefs, resolvers });

  const yelpHttp = new HttpLink({
    uri: 'https://api.yelp.com/v3/graphql',
    fetch: fetch.default,
  });

  const yelpLink = setContext((request, previousContext) => ({
    headers: {
      Authorization: `Bearer xNYgUF23uSM_1t8mFuobYLNpdqWcj3fX7Ag80S26uhAiHIgNyLeeqfJwwj0Szs_OTc4LDi_Wh29sUod8D7cTus4aIvM8_QJZrf4yz1u55TYTGp6MgLLgFay9igorXXYx`,
    },
  })).concat(yelpHttp);

  const linkTypeDefs = `
    extend type Reservation {
      business: Business!
    }
  `;

  const yelpSchema = makeRemoteExecutableSchema({
    schema: await introspectSchema(yelpLink),
    link: yelpLink,
    cacheControl: {
      defaultMaxAge: 86400,
    },
  });

  const transformedYelpSchema = transformSchema(yelpSchema, [
    new RenameTypes(name => {
      if (name === 'User') return 'YelpUser';
      else return name;
    }),
    /*
    new RenameRootFields(
      (
        operation: 'Query' | 'Mutation' | 'Subscription',
        name: string,
      ) => `Chirp_${name}`,
    ),
    */
  ]);

  const limit = promiseLimit(1);
  const schema = mergeSchemas({
    schemas: [localSchema, await transformedYelpSchema, linkTypeDefs],
    resolvers: {
      Reservation: {
        business: {
          fragment: `... on Reservation { businessId }`,
          resolve({ businessId }, args, context, info) {
            info.cacheControl.setCacheHint({ maxAge: 86400 });

            console.log('resolve businessId ', businessId);
            console.log('info ', info);

            return limit(() =>
              info.mergeInfo.delegateToSchema({
                schema: transformedYelpSchema,
                operation: 'query',
                fieldName: 'business',
                args: {
                  id: businessId,
                },
                context,
                info,
                transforms: transformedYelpSchema.transforms,
              }),
            );
          },
        },
      },
    },
  });

  const server = new ApolloServer({
    introspection: true,
    tracing: true,
    cacheControl: {
      defaultMaxAge: 86400,
    },
    schema: await schema,
    formatError: error => {
      // remove the internal sequelize error message
      // leave only the important validation error
      const message = error.message
        .replace('SequelizeValidationError: ', '')
        .replace('Validation error: ', '');

      return {
        ...error,
        message,
      };
    },
    context: async ({ req, connection }) => {
      if (connection) {
        return {
          models,
          loaders: {
            user: new DataLoader(keys =>
              loaders.user.batchUsers(keys, models),
            ),
          },
        };
      }

      if (req) {
        const me = await getMe(req);

        return {
          models,
          me,
          secret: process.env.SECRET,
          loaders: {
            user: new DataLoader(keys =>
              loaders.user.batchUsers(keys, models),
            ),
          },
        };
      }
    },
  });

  server.applyMiddleware({ app, path: '/graphql' });

  const httpServer = http.createServer(app);
  server.installSubscriptionHandlers(httpServer);

  return httpServer;
};

const port = process.env.PORT || 8000;

connectDb()
  .then(createHttpServer)
  .then(async httpServer => {
    httpServer.listen({ port }, () => {
      console.log(
        `Apollo Server on http://localhost:${port}/graphql`,
      );
    });
  });
