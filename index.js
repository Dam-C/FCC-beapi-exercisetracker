const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const { Schema } = mongoose;
const bodyParser = require('body-parser');
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = new Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
})

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.post('/api/users', async (req, res) => {
  const user = new User({ username: req.body.username });
  const insertUser = await user.save()

  if (!insertUser) {
    res.json({error: 'Could not add user to DB'})
  };

  res.json({ 
    username: insertUser.username, 
    _id: insertUser._id })
});

app.get('/api/users', async (req, res) => {

  const userList = await User.find();
  res.send(userList);
})

app.post('/api/users/:_id/exercises', async (req, res) => {

  const userExists = await User.findById(req.params._id);

  if(!userExists) {
    res.json({error: 'User not found'});
  } else {

    const exercise = new Exercise({
      userId: req.params._id,
      description: req.body.description,
      duration: req.body.duration,
      date: req.body.date
    })

    const insertExercise = await exercise.save();

    if(!insertExercise){
      res.json({error: 'Could not insert exercise'})
    }

    res.json({
      username: userExists.username,
      description: insertExercise.description,
      duration: insertExercise.duration,
      date: insertExercise.date.toDateString(),
      _id: userExists._id,
    })
  }
})

app.get('/api/users/:_id/logs', async (req, res) => {
  const {from, to, limit} = req.query;
  const user = await User.findById(req.params._id);
  if(!user) {
    res.json({error: 'Could not find user'})
  }

  let dateFilter = {};
  if(from){
    dateFilter["$gte"] = new Date(from);
  }  
  if(to){
    dateFilter["$lte"] = new Date(to);
  }  

  let queryFilter = {
    userId: req.params._id
  }
  if(from || to) {
    queryFilter.date = dateFilter
  }

  const logs = await Exercise.find(queryFilter).select({userId: 0}).limit(+limit)

  if (!logs) {
    res.json({error: 'Could not find logs'})
  }

  const formatedLogs = logs.map(l => ({
    description: l.description, 
    duration: l.duration, 
    date: l.date.toDateString()
  }))

  res.json({
    username: user.username,
    count: logs.length,
    _id: user._id,
    log:formatedLogs
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
