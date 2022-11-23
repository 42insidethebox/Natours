const cors = require('cors');
const fs = require('fs');
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const reviewRouter = require('./routes/reviewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

//app.use(cors());
//serving static files
app.use(express.static(path.join(__dirname, 'public')));
//1 - GLOBAL MIDDLEWARES

//Security set HTTP headers
// app.use(helmet()); // will return a returner function. Put this at the begining
/*
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https:', 'http:', 'data:', 'ws:'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'http:', 'data:'],
      scriptSrc: ["'self'", 'trusted-cdn.com', 'https:', 'http:', 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'http:'],
    },
  })
);
*/
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
//app.use(helmet({ contentSecurityPolicy: false }));

// Development Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
  console.log('Were using development environment now..');
}

//Limit requests from same API
const limiter = rateLimit({
  //define max requests per ip .. 100 requests per h
  //adapt to your own application
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP. Please try again in an hour',
}); // this is a middleware function.

app.use('/api', limiter);

// Body parser. Reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // we need middleware to parse data from form
app.use(cookieParser());
// Data sinitization against NoSQL query injection
// This will use a middleware function that removes {$: ""}. Looking at req.body req query string and req.params
app.use(mongoSanitize());

// Data sanitization agains xSS
app.use(xss());
// Serving static files

//Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();

  next();
});

// 3 ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl}`));
});

app.use(globalErrorHandler);

module.exports = app;
