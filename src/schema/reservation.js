import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    reservations: [Reservation!]!
    reservation(id: ID!): Reservation!
  }

  extend type Mutation {
    createReservation(business: String!): Reservation!
  }

  type Reservation {
    id: ID!
    createdAt: Date!
    user: User!
    business: Business!
  }

  type Business {
    id: ID!
    name: String!
  }
`;
