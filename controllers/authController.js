const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const catchAsync = require('../utils/catchAsync');

const AppError = require('../utils/appError');

const Email = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    //    secure: true, // encrypted connection https
    httpOnly: true, //prevent cross site scripting attack
  };

  if (process.env.NODE_ENV === 'production ') cookieOptions.secure = true;

  //since security is true we could only access it with https so we will put this only in production
  res.cookie('jwt', token, cookieOptions);

  //remove password from output
  user.password = undefined;

  console.log(process.env.NODE_ENV);
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

//console.log(signToken);
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body; //req.body.email and req.body.password

  //1 Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and passowrd', 400));
  }
  //2 Check if user exists and passowrd is correct
  const user = await User.findOne({ email }).select('+password');
  //  console.log(user);

  console.log(`this is the password ${password}`);
  console.log(`this is the password ${user.password}`);
  const test = await user.correctPassword(password, user.password);
  console.log(test);
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401)); //401 means unauthorized
  }
  //3 If everything ok send token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'logged out', {
    expiresIn: new Date(Date.now + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1 Gettting token and checking if it's there
  let token;

  console.log('Using protect middleware');
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
    console.log('this is the token', token);
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(new AppError('You are not logged in', 401));
  }

  // 2 Verificating if the token is valid and unaltered
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  console.log(`this is decoded`);
  console.log(decoded);

  // 3 If user still exists
  const freshUser = await User.findById(decoded.id);

  if (!freshUser) {
    return next(new AppError('The user from this token no longer exists', 401));
  }
  //4 Check if user changed password after JWT was issued
  freshUser.changedPasswordAfter(decoded.iat);

  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password!! Please login :D', 401)
    );
  }
  /*
  



  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Pleasee login again', 401)
    );
  }*/

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = freshUser;
  res.locals.user = freshUser;
  next();
});

// Only for rendered pages, no errors
exports.isLoggedIn = async (req, res, next) => {
  let token;

  //1) VERIFIES THE TOKEN
  if (req.cookies.jwt) {
    try {
      //If user stiff exists
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      console.log(`this is decoded`);
      console.log(decoded);

      // 3 If user still exists
      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        return next();
      }
      //4 Check if user changed password after JWT was issued
      currentUser.changedPasswordAfter(decoded.iat);

      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      //There is a logged in user
      res.locals.user = currentUser; //passing data into a render function

      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

//roles is an array ['admin','lead-guide']. Role ='user' does not hav permission
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log(req.user.role);
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }
  //generate the random reset token

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // send it to users email

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetpassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    console.log('doing forgotpassword');

    res.status(200).json({
      status: 'success',
      message: 'Token sent via email',
    });
  } catch (err) {
    console.log(`this is the error`, err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        `There was aproblem sending email. Please try again later`,
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // if token has not expired and there is used set new password
  if (!user) return next(new AppError('Token has expired or is invalid', 400));

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  console.log('resetting password!!');
  //update changepasswordat propert for the user
  //login the user send jwt
  createSendToken(user, 201, res);
});

exports.updatePassoword = catchAsync(async (req, res, next) => {
  //get user from collection
  const user = await User.findById(req.user.id).select('+password');

  //check if pw is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }
  console.log(user.password, req.body.passwordConfirm);
  //update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //login user, send JWT
  createSendToken(user, 200, res);
});
