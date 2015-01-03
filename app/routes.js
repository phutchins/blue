// app/routes.js
// Todo -
// Look into route separation: https://github.com/strongloop/express/blob/master/examples/route-separation/index.js
require('../config/database');
var Project = require('./models/project');
var Board = require('./models/board');
var Card = require('./models/card');
var Column = require('./models/column');
var mongoose = require('mongoose');
var async = require('async');

module.exports = function(app, passport) {
  //app.use(function(req, res, next) {
  //  req.local.user = req.user;
  //})

  // Default Page - Redirects to login options if not authenticated
  app.get('/', isLoggedIn, function(req, res) {
      res.redirect('/projects');
  });

  // Authentication options page
  app.get('/auth', function(req, res) {
    res.render('auth.ejs')
  });

  // show the login form
  app.get('/login', function(req, res) {

      // render the page and pass in any flash data if it exists
      res.render('login.ejs', { message: req.flash('loginMessage') });
  });

  // process the login form
  // app.post('/login', do all our passport stuff here);
  // process the login form
  app.post('/login', passport.authenticate('local-login', {
      successRedirect : '/', // redirect to the secure profile section
      failureRedirect : '/login', // redirect back to the signup page if there is an error
      failureFlash : true // allow flash messages
  }));

  // show the signup form
  app.get('/signup', function(req, res) {

      // render the page and pass in any flash data if it exists
      res.render('signup.ejs', { message: req.flash('signupMessage') });
  });

  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
      successRedirect : '/profile', // redirect to the secure profile section
      failureRedirect : '/signup', // redirect back to the signup page if there is an error
      failureFlash : true // allow flash messages
  }));

  // we will want this protected so you have to be logged in to visit
  app.get('/profile', isLoggedIn, function(req, res) {
      res.render('profile.ejs', {
          user : req.user // get the user out of session and pass to template
      });
  });

  // logout function
  app.get('/logout', function(req, res) {
      req.logout();
      res.redirect('/');
  });

  // Projects View
  app.get('/projects', isLoggedIn, function(req, res) {
    Project.find( function(err, projects) {
      res.render('projects/index.ejs', {
        user : req.user,
        projects : projects
      });
    });
  });

  app.get('/projects/action/createProject', isLoggedIn, function(req, res) {
    res.render('projects/action/createProject.ejs', {
      user : req.user
    });
  });


  // process the project creation form
  app.post('/projects/action/createProject', isLoggedIn, function(req, res) {
    new Project({
      name         : req.body.name,
      description  : req.body.description,
      last_update  : Date.now(),
      owner        : req.user._id,
    }).save( function( err, project, count ){
      res.redirect( '/' );
    });
  });

  app.get('/projects/action/createBoard', isLoggedIn, function(req, res) {
    res.render('projects/action/createBoard.ejs', {
      user : req.user,
      projectName: req.query.projectName
    });
  });

  app.post('/projects/action/createBoard', isLoggedIn, function(req, res) {
    projectName = req.body.projectName;
    new Board({
      name         : req.body.name,
      last_update  : Date.now(),
      owner        : req.user._id,
    }).save( function( err, board, count ){
      console.log("Board " + board.name + " added with id " + board._id);
      Project.findOneAndUpdate(
        { "name": projectName },
        { $push: { "membership.boards": board._id }},
        function(err, project) {
          if (err) console.log(err);
        }
      )
      res.redirect( '/projects/' + projectName );
    });
  });

  app.get('/projects/action/createCard', isLoggedIn, function(req, res) {
    console.log("createCard (GET): columnId - ", req.query.columnId);
    res.render('projects/action/createCard.ejs', {
      // todo: find out why crashes without user even though its globallly defined
      user : req.user,
      columnId: req.query.columnId,
      projectName: req.param("projectName")
    });
  });

  // Make this post to /card
  app.post('/projects/action/createCard', isLoggedIn, function(req, res) {
    var projectName = req.body.projectName;
    var columnId = req.body.columnId;
    console.log("createCard (POST): columnId - ", columnId);
    new Card({
      name: req.body.name,
      description: req.body.description,
      membership: {
        _column: mongoose.Types.ObjectId(columnId),
        //_column: columnId,
        owner: req.user._id
      }
    }).save( function( err, card, count ){
      console.log("Card " + card.name + " added to " + card.columnId);
      Column.findOneAndUpdate(
        { "_id": req.body.columnId },
        { $push: { "_cards": card._id } },
        function(err, column) {
          if (err) console.log(err);
        }
      )
      res.redirect( '/projects/' + projectName );
    });
  });

  app.get('/projects/action/editCard', isLoggedIn, function(req, res) {
    console.log("Edit Card (GET): Looking up card with ID '" + req.query.cardId + "'");
    Card.findById( req.query.cardId, function ( err, card ) {
      console.log("Edit Card (GET): Found card " + card);
      res.render('projects/action/editCard.ejs', {
        user: req.user,
        card: card,
        columnId: req.param("columnId"),
        projectName: req.param("projectName"),
      });
    });
  });

  app.post('/projects/action/editCard', isLoggedIn, function(req, res) {
    console.log("Edit Card (POST): Saving updates for card with id '", req.param("cardId"), "'");
    Card.findOneAndUpdate(
      { "_id": req.param("cardId") },
      { $set: { "name": req.param("cardName"), "description": req.param("cardDescription") }, upsert: true },
      function(err, board) {
        if (err) console.log(err);
      }
    )
    res.redirect( '/projects/' + req.body.projectName );
  });

  app.get('/cards/deleteCard', isLoggedIn, function(req, res) {
    console.log("Delete Card (GET): Deleting card with ID '" + req.query.cardId + "'");
    // Add a message here to populate message field on board or project page with status of result
    Column.update( { "_id": req.query.columnId }, { $pull: { _cards: req.param("columnId") } }, function(err, numAffected) {
      if (err || numAffected == 0) {
        console.log("Delete Card (GET): FAILLLLELELELjlfwjkleflkj");
      }
      Card.remove({ _id: req.param("cardId") }, function(err) {
        console.log("Delete Card (GET): Removed card '" + req.query.cardId + "'");
        res.redirect('/projects/' + req.query.projectName || '/');
      });
    });
  });


  // delete a project
  app.get('/projects/action/delete', isLoggedIn, function(req, res) {
    console.log("Deleting Project with ID '" + req.query.id + "'");
    Project.findById( req.query.id, function ( err, project ){
      project.remove( function ( err, project ){
        if( err ) return next( err );
        res.redirect( '/' );
      });
    });
  });

  // Move a card to a different column
  app.post('/card/move', isLoggedIn, function(req, res) {
    var newColumnId = req.param('newColumnId');
    console.log("Move Card (POST): newColumnId is '", newColumnId, "'");
    var cardId = req.body.cardId;
    console.log("Move Card (POST): cardId: " + req.body.cardId + " newColumnId: " + req.body.newColumnId + " boardName: " + req.body.boardName);
    // do exec here
    Card.findOne( { _id: req.body.cardId }).populate('membership._column').exec( function (err, foundCard) {
      var myCard = foundCard;
      var oldColumn = myCard.membership._column;
      console.log("Move Card (POST): Found card name '", myCard.name, "' card data '",myCard,"'");
      Column.findOneAndUpdate( { _id: oldColumn }, { $pull: { _cards: cardId }}, function(err, column) {
        console.log("Move Card (POST): Found and removed card '", myCard.name, "' from column '", column.name, "'");
        //Card.findOne, {$set: { 'membership._column': req.body.newColumnId } }, {new: true, upsert: false}).populate('membership._column').exec(function(err, card) {
        card.membership._column = newColumnId;
        card.save(function (err) {
          console.log("Move Card (POST): Saving card after updating column to '", newColumnId, "'");
          console.log("Move Card (POST): Card after save... ", myCard);
          if (err) {
            console.log(err);
          };
        });
      });
      Column.findOneAndUpdate( { _id: newColumnId }, { $push: { _cards: cardId } }, function(err, column) {
        console.log("Move Card (POST): Found and added card '",myCard.name,"' to column '",column.name,"'");
        if (err) { console.log(err); }
      });
    //Card.findOneAndUpdate( { _id: req.body.cardId }, {$set: { 'cards.$.columnId': req.body.newColumn } }, {new: true, upsert: false}, function(err, board) {
      if (err) { console.log(err) }
      console.log("Move Card (POST): Moved card with id '" + cardId + "' to column '" + req.body.newColumnId + "'");
    });
  });

  app.get('/projects/:projectName', isLoggedIn, function(req, res) {
    var projectName = req.param("projectName");
    console.log("Loading project " + projectName);
    Project.findOne({ name: projectName }, function(err, project) {
      if (typeof project.membership != 'undefined' && project.membership.boards[0] != 'undefined' && 0 < project.membership.boards.length) {
        var boards = [];
        async.each(project.membership.boards, function(boardId, boardsCallback) {
          Board.findOne({ _id: boardId }).populate('_columns').exec( function(err, board) {
            console.log('looping board ' + board.name);
            Card.populate(board, { path: '_columns._cards' }, function(err, populatedBoard) {
              boards.push(board);
              boardsCallback();
            });
          });
        }, function(err) {
          if (err) { return console.log(err); }
          console.log("loop callback");
          req.user.session.lastProject = req.params.projectName;
          console.log("Project (GET): saving project name to session '" + req.params.projectName + "'");
          res.format({
            html: function() {
              res.render('projects/project.ejs', {
                user : req.user,
                boards: boards,
                project: project
              });
            },
            json: function() {
              res.send({project: project, boards: boards});
            }
          });
        });
        console.log("Boards: " + boards);
      } else {
        res.render('projects/project.ejs', {
          project: project
        });
      };
    });
  });
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/auth');
}

// Create project
exports.createProject = function ( req, res ){
  new Project({
    name         : req.body.name,
    description  : req.body.description,
    last_update  : Date.now(),
    owner        : user.name,
  }).save( function( err, project, count ){
    res.redirect( '/' );
  });
};
