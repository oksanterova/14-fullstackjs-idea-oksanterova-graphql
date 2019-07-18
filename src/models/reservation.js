import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    business: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const Reservation = mongoose.model('Reservation', reservationSchema);

export default Reservation;
