const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const resolvers = require("./resolvers");
const typeDefs = require("./typeDefs");

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({ ...req })
});

const app = express();

server.applyMiddleware({ app, cors: { credentials: true } });

app.listen(process.env.PORT, () =>
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
);
