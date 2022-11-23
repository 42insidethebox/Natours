/* es-lint disable */
const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid: ${err.path} : ${err.value}`;

  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const key = Object.keys(err.keyValue).join('');
  console.log('this is the key', key);
  const message = `The key '${key}' has duplicate value of '${err.keyValue[key]}'`;
  return new AppError(message, 400);
};

const handleValidationErrorDb = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTerror = () =>
  new AppError(`Invalid signature.  Please login to see tours!`, 401);

const handleTokenExpired = () =>
  new AppError(`Token has expired!. Please login again!`, 401);

const sendErrorDev = (err, req, res) => {
  //API
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    //RENDERED WEBSITE
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
};

const sendErrorProd = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    console.log('error is operational');
    console.log(err.isOperational);
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });

      //Programming or other unknown error: dont leak error details
    }
    //1) Log error to console
    console.error('ERROR', err);
    //2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong! ',
      errr: 'errrrrr',
    });
  }
  if (err.isOperational) {
    //RENDERED WEBSITE
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });

    //Programming or other unknown error: dont leak error details
  }
  //1) Log error to console
  console.error('ERROR', err);
  //2) Send generic message
  return res.status(500).json({
    status: 'error',
    message: 'Please try again later! ',
    errr: 'errrrrr',
  });
};
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    console.log(`this is the error: ${err}`);
    console.log(err.code === 11000);
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;
    error.code = err.code;
    console.log(`error name: ${error.name}`);
    console.log(`errorcode ${err.code}`);

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDb(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTerror();
    if (error.name === 'TokenExpiredError') error = handleTokenExpired();

    sendErrorProd(error, req, res);
  }
};
