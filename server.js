const mongoose = require('mongoose');
const dotenv = require('dotenv');

/*
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION');
  process.exit(1);
});
*/

dotenv.config({ path: './config.env' });

const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
//console.log(DB);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    // useCreateIndex: true,
    // useFindAndModify: false,
  })
  .then((con) => {
    //   console.log(con.connections);
    // console.log('DB connection successful');
  });

// 4 - START SERVER
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  // console.log(`App running on port ${port}...`);
});
console.log('this is the port', port);
console.log('this is the error');

process.on('unhandledRejection', (err) => {
  //last safety net
  //console.log(err.name, err.message);
  //console.log('UNHANDLED REJECTION SHUTTING DOWN..');
  server.close(() => {
    console.log('this is the error,', err);
    process.exit(1);
  });
});
