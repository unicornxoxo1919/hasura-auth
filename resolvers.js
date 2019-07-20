const { GraphQLClient } = require("graphql-request");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const endpoint = process.env.ENDPOINT;

const graphql = new GraphQLClient(endpoint, {
  headers: {
    "x-hasura-admin-secret": process.env.HASURA_ACCESS_KEY
  }
});

const LOGIN = `
    query user($email: String) {
      user(where:{email: {_eq: $email}}) { id password }
    }
  `;

const SIGNUP = `
    mutation signup($email: String, $password: String) {
      insert_user(objects: [{ email: $email, password: $password }]) { returning { id } }
    }
  `;

const ME = `
    query me($id: uuid) {
      user(where:{id: {_eq: $id}}) { email, id , password }
    }
  `;

const resolvers = {
  Query: {
    me: async (_, args, req) => {
      const Authorization = req.headers.authorization;
      if (Authorization) {
        const token = Authorization.replace("Bearer ", "");
        const verifiedToken = jwt.verify(token, process.env.JWT_SECRET);
        const user = await graphql
          .request(ME, { id: verifiedToken.userId })
          .then(data => {
            return data.user[0];
          });
        return { ...user };
      } else {
        throw new Error("Not logged in.");
      }
    }
  },
  Mutation: {
    signup: async (parent, { email, password }, { res }, info) => {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await graphql
        .request(SIGNUP, { email, password: hashedPassword })
        .then(data => {
          return data.insert_user.returning[0];
        });

      const token = jwt.sign(
        {
          userId: user.id,
          "https://hasura.io/jwt/claims": {
            "x-hasura-allowed-roles": ["user"],
            "x-hasura-default-role": "user",
            "x-hasura-user-id": user.id
          }
        },
        process.env.JWT_SECRET
      );
      res.cookie("token", token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 365
      });
      return { token };
    },
    login: async (parent, { email, password }, { res }, info) => {
      const user = await graphql.request(LOGIN, { email }).then(data => {
        return data.user[0];
      });

      if (!user) throw new Error("No such user found.");

      const valid = await bcrypt.compare(password, user.password);

      if (valid) {
        const token = jwt.sign(
          {
            userId: user.id,
            "https://hasura.io/jwt/claims": {
              "x-hasura-allowed-roles": ["user"],
              "x-hasura-default-role": "user",
              "x-hasura-user-id": user.id
            }
          },
          process.env.JWT_SECRET
        );

        res.cookie("token", token, {
          httpOnly: true,
          maxAge: 1000 * 60 * 60 * 24 * 365
        });
        // 5. Return the user
        return { token };
      } else {
        throw new Error("Invalid password.");
      }
    }
  }
};

module.exports = resolvers;
