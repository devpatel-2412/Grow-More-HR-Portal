import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { createRoomBookingSchema, listRoomBookingsQuerySchema, idParamSchema } from './roombooking.validators.js';
import { createRoomBooking, cancelRoomBooking, listRoomBookings } from './roombooking.controller.js';

export const roomBookingRouter = Router();
roomBookingRouter.use(authenticateAccessToken);

// Booking a room is a self-service action open to every employee, same as Leave/Attendance.
roomBookingRouter.post('/', validate({ body: createRoomBookingSchema }), asyncHandler(createRoomBooking));
roomBookingRouter.get('/', validate({ query: listRoomBookingsQuerySchema }), asyncHandler(listRoomBookings));
roomBookingRouter.post('/:id/cancel', validate({ params: idParamSchema }), asyncHandler(cancelRoomBooking));
