// review / rating / createdAt / ref to tour / ref to user

const mongoose = require('mongoose');
const Tour = require('./tourModel');
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      require: [true, 'Review must belong to a tour!'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A review must belong to a user'],
    },
  },
  {
    // this makes sure that when we have a virtual property(not stored in db). Also show up whenever there is an output.
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  /* 
  this.populate({
    // remember that in query middleware this always points to the query
    path: 'tour',
    select: 'name',
  }).populate({
    // remember that in query middleware this always points to the query
    path: 'user',
    select: 'name photo',
  });
    next();
})
*/

  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // console.log(tourId);
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // console.log(stats);

  // all we want to do is update so we don't need to save it anywhere4

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function (next) {
  // this points to current review
  /* Review is not yet defined..  
Review.calcAverageRatings(this.tour);*/
  this.constructor.calcAverageRatings(this.tour); //constructor is the model that created this document
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne(); //review // we create a property on the variable
  next();
});

reviewSchema.post(/^findOneAnd/, async function (next) {
  //pass data from pre middleware to post middleware
  //we need to call method on the model
  await this.r.constructor.calcAverageRatings(this.r.tour);
});
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
