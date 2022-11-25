const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const AppError = require('../utils/appError');

const APIFeatures = require('../utils/apiFeatures');

const catchAsync = require('../utils/catchAsync');

const factory = require('./handlerFactory');
/*
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/img/users');
  },
  filename: (req, file, cb) => {
    // user-54309ab40395ba-4508374238.jpg
    // name, userid, timestamp

    const ext = file.mimetype.split('/')[1];
    cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
  },
});

*/

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  //test if uploaded file is an img. We only want to upload images
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image. Please upload only images', 400), false);
  }
};

const upload = multer({
  //where we want to save pics that are uploaded
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`); // we can chain multiple methods
  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};

  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });

  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  //create error if user tries to update password
  //console.log(req.file);
  // console.log(req.body);
  if (req.body.password || req.body.passwordConfirm)
    return next(new AppError('This route is not for password updates!', 400));

  // update user document
  // console.log('usher');

  //save is not correct in this case because we cannot patch without updatepassword for eg.
  //  const user = await User.findById(req.user.id);
  //user.name = 'peter';
  //console.log(user);

  // await user.save();
  // we canot put as object 'req.body' for example

  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  const updateUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updateUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined. Please use signup instead',
  });
};
exports.getUser = factory.getOne(User);

//Do NOT use for passwords
exports.updateUser = factory.updateOne(User);
exports.getAllUsers = factory.getAll(User);
exports.deleteUser = factory.deleteOne(User);
