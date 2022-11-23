const express = require('express');

const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');

const router = express.Router(); // we need this bc by default each route only has access to the params of their specific route.
//we want to have access to tourId so we need to merge the parameters

router.use(authController.protect);

router.get('/checkout-session/:tourID', bookingController.getCheckoutSession);

router.use(authController.restrictTo('admin', 'lead-guide'));
router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;
