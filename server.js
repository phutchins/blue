// server.js

// set up ======================================================================
// get all the tools we need
var express  = require('express');
var app      = express();
var port     = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash    = require('connect-flash');
var path     = require('path');

var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');

var configDB = require('./config/database.js');
var configRedis = require('./config/redis.js');

var RedisStore = require('connect-redis')(session);


// configuration ===============================================================
var db = mongoose.connection;
db.on('error', console.error);
db.once('open', function() {
  // create schemas and models here? maybe not.
  require('./app/models/project');
});

mongoose.connect(configDB.url); // connect to our database

require('./config/passport')(passport); // pass passport for configuration

//app.use(express.session({
//    secret:'secret',
//    maxAge: new Date(Date.now() + 3600000),
//    store: new MongoStore(
//        {db:mongoose.connection.db},
//        function(err){
//            console.log(err || 'connect-mongodb setup ok');
//        })
//}));

// set up our express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser()); // get information from html forms
app.use(flash());

app.set('view engine', 'ejs'); // set up ejs for templating
app.use(express['static'](path.join(__dirname, 'public')));

// required for passport
app.use(session({
  secret: "y0urR4nd0mT0k3n",
  store : new RedisStore({
    host : configRedis.host,
    port : configRedis.port,
    user : configRedis.username,
    pass : configRedis.password
  }),
  cookie : {
    maxAge : 604800 // one week
  }
}));
//app.use(session({ secret: 'ilovescotchscotchyscotchscotch' })); // session secret
app.use(passport.initialize());
app.use(passport.session({
  secret: "y0urR4nd0mT0k3n",
  store : new RedisStore({
    host : configRedis.host,
    port : configRedis.port,
    user : configRedis.username,
    pass : configRedis.password
  }),
  cookie : {
    maxAge : 604800 // one week
  }
}));
app.use(flash()); // use connect-flash for flash messages stored in session

// routes ======================================================================
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// launch ======================================================================
app.listen(port);
console.log('The magic happens on port ' + port);
