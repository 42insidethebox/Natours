const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
//const reviewController = require('../controllers/reviewController');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getTour);

router.route('/tour-stats').get(tourController.getTourStates);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

// /tours-distance?distance=233,center=-40,45,unit=mi
// /tours-diance/233/center/-40,45/unit/mi
router
  .route('/')
  .get(tourController.getTour)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.postTour
  );

router
  .route('/:id')
  .get(authController.protect, tourController.getTours)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.patchTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

// POST/tour/1654sa/reviews
//nested routes make a lot of sense in a parent-child related like this.
//GET POST/tour/1654sa/reviews
//GET POST/tour/1654sa/reviews/cb531fad543b5

/*
router
  .route('/:tourId/reviews')
  .post(5c88fa8cf4afda39709c2955
    authController.protect,
    authController.restrictTo('user'),
    reviewController.createReview
  );
*/

router.use('/:tourId/reviews', reviewRouter);

//enable reviewrouter to have access to tourId param..

module.exports = router;
