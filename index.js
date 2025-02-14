const express = require('express');
let bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
require('dotenv').config();
let mongoose = require('mongoose')
//IMPORTANT
mongoose.connect("mongodb+srv://<db_user>:<db_password>@cluster0.8d3kj.mongodb.net/?retryWrites=true&w=majority&appName=<cluster_name>", { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  username: String,
  log: [Object]
});

let User = mongoose.model('User', userSchema);
var users = [];
const checkValidDate = (date)=>{
  if(date === undefined){
    return true;
  }
  if(!date.match('^[0-9][0-9][0-9][0-9]-[0-9]?[0-9]-[0-9]?[0-9]$')){
    return false;
  }
  
  const date_args = date.split('-');
  const year = parseInt(date_args[0]);
  const month = parseInt(date_args[1]);
  const day = parseInt(date_args[2]);

  const aDate = new Date(year,month-1,day);
  
  return(aDate.getFullYear()===year && aDate.getMonth()+1 === month && aDate.getDate());
}

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', (req, res) => {
  res.json(users);
});

app.post("/api/users",function(req,res){

  const user = new User({ username: req.body.username, log: []});
  user.save();
  users.push({username: user.username,_id: user._id});
  res.send({username: user.username,_id: user._id});

});

app.get("/api/users/:_id/logs/:from?/:to?/:limit?", async function(req,res){

  let from;
  let to;
  let limit;

  if(!checkValidDate(req.query.from)){
    return res.json({error: "Invalid Date! Please insert date in format: YYYY-MM-DD!!!"});
  }
  
  if(!checkValidDate(req.query.to)){
    return res.json({error: "Invalid Date! Please insert date in format: YYYY-MM-DD!!!"})
  }
  if(req.query.limit){
    if(!req.query.limit.match(/^[1-9]\d*$/)){
      return res.json({error: "Invalid limit please enter positive Integer value!!!"})
    }
    limit = parseInt(req.query.limit);
  }

  var id = req.params._id
  
  try {

    const userFound = await User.findById(id);
    let log = [...userFound.log];
    if(req.query.from){
      from = new Date(req.query.from).getTime();
      log = log.filter(val => {
        const aDate = new Date(val.date).getTime();
        return aDate >= from;
      })
    }
    if(req.query.to){
      to = new Date(req.query.to).getTime();
      log = log.filter(val => {
        const aDate = new Date(val.date).getTime();
        return aDate <= to;
      })
    }
    if(limit){
      log = log.slice(0,limit);
    }

    res.send({username: userFound.username,count: userFound.log.length, _id: userFound._id,log: log});
  
  } catch (err) {
    console.log(err)
    res.json({error: 'User Not Found'});
  }

});

app.post("/api/users/:_id/exercises", async function(req,res){
  
  if(req.body.date !== '' && !checkValidDate(req.body.date)){
    console.log("ELSE IF");
    res.json({error: "Invalid Date! Please insert date in format: YYYY-MM-DD!!!"})
  } else if(!req.body.duration.match(/^[1-9]\d*$/)){
    res.json({error: "Invalid Duration! Please insert duration as Integer (e.g.: 9)"})
  } else{
    
    var id = req.params['_id'];
    var aDate = (req.body.date === '' || req.body.date === undefined) ? new Date():new Date(req.body.date);
    var exercise = {description: req.body.description, duration: parseInt(req.body.duration), date: aDate.toDateString()}
    
    try {
      const userFound = await User.findOneAndUpdate({_id: id}, {$push: {log: exercise}}, {new: true});
      res.send({username: userFound.username, description: exercise.description, duration: exercise.duration, date: exercise.date, _id: userFound.id});
    } catch (err) {
      res.json({error: 'User Not Found'});
    }

  }

});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
