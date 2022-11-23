const mongoose = require('mongoose');
const slugify = require('slugify');

const validator = require('validator');
// const User = require('./userModel');
// Creating a model out of mongoose schema...
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'], // This is a validator and there are a lot of them.
      trim: true,
      unique: true,
      maxlength: [40, 'A tour name must have 40 or less characters'],
      minlength: [10, ' A tour name must have 10 or more characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'], // we don't call it. will be called automatically
    },
    slug: String,
    ratingsAverage: {
      //doesn't have required bc is not the user that specifies this
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be at least 1.0'], // works not only with numbers but also dates
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },

    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, ' A tour should have a difficulty'],
      enum: {
        //only for strings
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either easy medium or difficult',
      },
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // a real function bc we need this
          // this only points to current doc on NEW document creation
          return val < this.price; //
        },
        message: 'Discount price ({VALUE}) should be less than regular price',
      },
    },
    summary: {
      type: String,
      trim: true, //there are different schema types for different types. For string we have trim, that removes spaces from begining and end..
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String, // we leave image in fs and put name of the  in database as a field
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // this is an embeded object
      //GeoJSON
      type: {
        type: String,
        default: 'Point', // polygons, lines.. etc
        enum: ['Point'], // we only want it to be Point
      },
      coordinates: [Number], // an array of numbers (first longitude and then latitude)
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: 'Point',
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // guides: Array, // embeding

    guides: [
      { type: mongoose.Schema.ObjectId, ref: 'User' }, // a mongodb ID
      // how we establish relationship between datasets. We don't even need user to be imported
    ],

    // will try to parse anything we put as a data. eg real data, unix timestamp etc.. only if it can't will throw an error
  },
  {
    toJSON: {
      virtuals: true,
      toObject: { virtuals: true },
    },
  }
);

//tourSchema.index({ price: 1 }); // 1 means ascending and -1 is descending order.. Other types of indexes as well ..

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });
tourSchema.virtual('durationWeeks').get(function () {
  // we actually need the this keyword so use regular function
  return this.duration / 7;
}); //we need to explicitly define we want virtual options available

// virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review', // specify 2 fields. foreign field and
  foreignField: 'tour',
  localField: '_id',
});

// only for save() and create()
tourSchema.pre('save', function (next) {
  console.log(this);
  this.slug = slugify(this.name, { lower: true });
  next();
});
/*
tourSchema.pre('save', async function (next) {
  const guidesPromises = this.guides.map(async (id) => await User.findById(id)); // the result is an array full of promises
  this.guides = await Promise.all(guidesPromises);
  next();
});
*/

/*
tourSchema.pre('save', function (next) {
  console.log('Will save document...');
  next();
});

tourSchema.post('save', function (doc, next) {
  console.log(doc);
  next();
});
*/

tourSchema.pre(/^find/, function (next) {
  //secret tours should not appear in results output;
  this.find({ secretTour: { $ne: true } });
  next();
  this.start = Date.now();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    // remember that in query middleware this always points to the query
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });

  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  console.log(docs);
  next();
});

//AGGREGATION MIDDLEWARE
/*
tourSchema.pre('aggregate', function (next) {
  console.log(this);
  console.log(
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }) //filtering out our secret tour
  ); // points to current aggregation object
  next();
});
*/
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
