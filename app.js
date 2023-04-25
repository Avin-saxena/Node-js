const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const cors=require('cors');
const ejs = require("ejs");
const path = require("path");
const { isNumberObject } = require("util/types");
const compression = require('compression');
const cluster = require('cluster');
const os = require('os');
const PORT=process.env.port || 9002



/***********************************Using cluster method********************************************/

if (cluster.isMaster) {
  console.log(`Master process is running on PID ${process.pid}`);
  for (let i = 0; i < os.cpus().length; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
    console.log('Starting a new worker');
    cluster.fork();
  });
}
else{

const app = express();
app.set("view engine", "ejs");
app.use(express.json())
app.use(express.urlencoded({ extended: true })); 
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

app.use(compression());

const userSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true },
    gender: { type: String, required: true },
    income: { type: String, required: true },
    city: { type: String, required: true },
    car: { type: String, required: true },
    quote: { type: String, required: true },
    phone_price: { type: String, required: true },
  }, { collection: 'cars' });
  const User = mongoose.model('User', userSchema);
  module.exports = User;


/*********************************home page**********************************/
  app.get('/',async(req,res)=>{
    res.render('Home');
  });


/*********************************First api***********************************/
  
  app.get('/users', async (req, res) => {
    try {
        const users = await User.find({
            $and: [
                { income: { $regex: /^\$?(\d+(\.\d{1,2})?)$/ } },
                { $where: 'parseFloat(this.income.replace("$", "")) < 5' },
                { car: { $in: ['BMW', 'Mercedes-Benz'] } }
            ]
        });
 res.render('users', { users: users });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });


/*********************************Second api***********************************/
  app.get('/phone', async (req, res) => {
    try {
        const users = await User.find({
            gender: 'Male',
            $where: 'parseFloat(this.phone_price) > 10000'
        });
        res.render('phone', { users: users });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


/*********************************Third api***********************************/
app.get('/last', async (req, res) => {
  try {
      const users = await User.find({
          last_name: { $regex: /^M/ },
          quote: { $exists: true, $nin: ['', null], $expr: { $gt: { $strLenCP: '$quote' }, $numberLong: "15" } },
          email: { $regexMatch: /M$/i, $regexMatch: { $regexMatch: { input: { $split: ['$email', '@'] }, regex: { $concat: ['.*', { $toLower: { $arrayElemAt: [ { $split: [{ $toLower: '$last_name' }, '.'] }, -1 ] } }, '$'] } } } }

        
      });
      res.render('last', { users: users });
  } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
  }
});


/*********************************Fourth api***********************************/
app.get('/fourth', async (req, res) => {
  try {
    const users = await User.find({
      car: { $in: ['BMW', 'Mercedes-Benz', 'Audi'] },
      email: { $not: { $regex: /\d/ } }
    });
    res.render('fourth', { users: users });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


/*********************************Fifth api***********************************/
app.get('/top', async (req, res) => {
  
  try {
    const users = await User.aggregate([
      
      {
        $addFields: {
          income: {
            $convert: {
              input: {
                $substr: [
                  "$income",
                  1,
                  {
                    $subtract: [
                      { $strLenCP: "$income" },
                      1
                    ]
                  }
                ]
              },
              to: "decimal",
              onError: 0
            }
          }
        }
      },
      
      
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 },
          avg_income: { $avg: "$income" }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      },
      
    ]);
    res.render('top', {  cities: users });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


/*******************************************************************************************************************/
main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/node-cars',{ useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
    console.log("connection with dbms succesfully");
  })

  }


app.listen(PORT, () => {
  console.log('Server started on port 9002');
});
}