const express = require('express');

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotpassword', authController.forgotPassword);
router.patch('/resetpassword/:token', authController.resetPassword);

//middleware that protects all routes that come after this
router.use(authController.protect);

router.patch('/updatemypassword', authController.updatePassoword);

router.get('/me', userController.getMe, userController.getUser);

router.patch(
  '/updateme',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.delete('/deleteme', userController.deleteMe);

//from this point on all routes are only authorized to admin

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router.use(authController.restrictTo('admin'));

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
