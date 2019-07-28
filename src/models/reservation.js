import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    businessId: {
      type: String,
      required: true,
    },
    reservationTime: {
      type: Date,
      required: true,
    },
    numberOfGuests: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const Reservation = mongoose.model('Reservation', reservationSchema);

export default Reservation;
