const mongoose = require("mongoose");

const connectDB = (url) => {
  return mongoose.connect(url).then(()=>{console.log("db connected")}).catch((e)=>{console.log("error while connecting to db:"+e)});
};

module.exports = connectDB;