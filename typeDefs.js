const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    password: String!
  }
  type AuthPayload {
    user: User
    token: String!
  }

  type Query {
    me: User
  }
  type Mutation {
    login(email: String, password: String): AuthPayload
    signup(email: String, password: String): AuthPayload
  }
`;

module.exports = typeDefs;
