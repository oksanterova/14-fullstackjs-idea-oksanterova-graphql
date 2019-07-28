import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    reservations: [Reservation!]!
    reservation(id: ID!): Reservation!
  }

  extend type Mutation {
    createReservation(
      businessId: String!
      reservationTime: Date!
      numberOfGuests: Int!
    ): Reservation!
  }

  type Reservation {
    id: ID!
    createdAt: Date!
    user: User!
    businessId: String!
    reservationTime: Date!
    numberOfGuests: Int!
  }
`;
