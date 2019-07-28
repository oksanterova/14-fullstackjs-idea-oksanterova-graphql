import { combineResolvers } from 'graphql-resolvers';

import { isAuthenticated, isMessageOwner } from './authorization';

export default {
  Query: {
    reservations: async (parent, {}, { models }) => {
      return await models.Resevation.find();
    },
    reservation: async (parent, { id }, { models }) => {
      return await models.Reservation.findById(id);
    },
  },

  Mutation: {
    createReservation: combineResolvers(
      isAuthenticated,
      async (
        parent,
        { businessId, reservationTime, numberOfGuests },
        { models, me },
      ) => {
        return await models.Reservation.create({
          businessId,
          userId: me.id,
          reservationTime,
          numberOfGuests,
        });
      },
    ),
  },

  Reservation: {},
};
