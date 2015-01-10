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

// - PROJECTS - //
  // Projects View
  app.get('/projects', isLoggedIn, function(req, res) {
    Project.find().populate('_owner').exec( function(err, projects) {
      res.render('projects/index.ejs', {
        user : req.user,
        projects : projects
      });
    });
  });

  app.get('/projects/:projectName', isLoggedIn, function(req, res) {
    var projectName = req.param("projectName");
    var defaultBoardId = "";
    console.log("(GET) /projects/:projectName - Loading project " + projectName);
    Project.findOne({ name: projectName }).populate('membership._defaultBoard').populate('membership._boards').exec( function(err, project) {
      if (typeof project.membership != 'undefined' && typeof project.membership._boards[0] != 'undefined') {
        if (typeof project.membership._defaultBoard == "undefined") {
          project.membership._defaultBoard = project.membership._boards[0];
          defaultBoardId = project.membership._boards[0]._id;
          project.save( function(err) {
            if (err) {
              console.log(err);
            }
          });
        } else {
          defaultBoardId = project.membership._defaultBoard._id;
          console.log("defaultBoardId is '" + defaultBoardId + "'");
        };

        console.log("Project (GET): boards - ",project.membership._boards);

        // Maybe do (project.membership._boards, { path: '_columns._cards'}...
        Column.populate(project, { path: 'membership._boards._columns' }, function(err, projectPopulatedColumns) {
          Card.populate(projectPopulatedColumns, { path: 'membership._boards._columns._cards' }, function(err, projectPopulatedCards) {
            if (err) { return console.log(err); }

            var boards = projectPopulatedCards.membership._boards.toObject();
            boards.sort(function(b1, b2) { return b1._id - b2._id; });

            req.user.session.lastProject = projectPopulatedCards.name;
            res.render('projects/project.ejs', {
              user : req.user,
              boards : projectPopulatedCards.membership._boards,
              project : projectPopulatedCards,
              defaultBoardId : defaultBoardId
            });
          });
        });
      } else {
        res.render('projects/project.ejs', {
          user : req.user,
          project: project
        });
      };
    });
  });

  // process the project creation form
  app.post('/projects/', isLoggedIn, function(req, res) {
    console.log("(POST) /projects/ - Creating project");
    new Project({
      name         : req.body.name,
      description  : req.body.description,
      last_update  : Date.now(),
      _owner        : req.user._id,
    }).save( function( err, project, count ){
      res.redirect( '/' );
    });
  });

  // delete a project
  app.delete('/projects/:projectId', isLoggedIn, function(req, res) {
    console.log("Deleting Project with ID '" + req.param('projectId') + "'");
    Project.findById( req.param('projectId'), function ( err, project ){
      if (project != null) {
        project.remove( function ( err, project ){
          if( err ) return next( err );
          res.redirect( '/projects' );
        });
      } else {
        console.log("(DELETE) /projects/:projectId - [ERROR] Project with id " + req.param('projectId') + " does not exist");
      };
    });
  });

// - BOARDS - //
  // Create a board
  app.post('/boards/', isLoggedIn, function(req, res) {
    var projectName = req.param('project-name');
    var boardName = req.param('board-name');
    new Board({
      name         : boardName,
      last_update  : Date.now()
      //_owner        : mongoose.Types.ObjectId(req.user._id),
    }).save( function( err, board, count ){
      console.log("/boards/ - Board " + board.name + " added with id " + board._id);
      console.log("/boards/ - Adding board '" + board.name + "' to project '" + projectName + "'");
      var boardId = board._id;
      Project.findOneAndUpdate(
        { "name": projectName },
        { $push: { "membership._boards": boardId }},
        function(err, project) {
          console.log("/boards/ - updated project '" + project.name + "'");
          if (err) console.log(err);
          res.redirect( '/projects/' + projectName );
        }
      )
    });
  });

  app.post('/columns/', isLoggedIn, function(req, res) {
    var boardId = req.param('boardId');
    var projectName = req.param('projectName');
    console.log("(POST) /columns/ - DEBUG - boardId: ",boardId);
    console.log("(POST) /columns/ - DEBUG - projectName: ",projectName);
    new Column({
      name : req.param("columnName")
    }).save( function(err, column, count) {
      console.log("(POST) /columns/ - Column '", column.name, "' created with id '", column._id, "'");
      console.log("(POST) /columns/ - DEBUG - boardId: ",boardId);
      Board.findOneAndUpdate({ _id : mongoose.Types.ObjectId(boardId) }, { $push : { "_columns" : column._id }}, function(err, board) {
        console.log("(POST) /columns/ - INFO - column inside of Board.findOneAndUpdate: ",column);
        if (err) {
          console.log("(POST) /columns/ - ERROR - adding column to board");
          console.log(err);
        } else {
          console.log("(POST) /columns/ - Column '", column.name, "' added to board '",board.name,"'");
        }
      });
    });
    res.redirect( '/projects/' + projectName );
  });

  // Create a card and add it to a column
  app.post('/cards/', isLoggedIn, function(req, res) {
    var columnId = req.param('columnId');
    var name = req.param('name');
    var description = req.param('description');
    console.log("(POST) /cards/ - createCard (POST): columnId - ", columnId);
    new Card({
      name: req.param('name'),
      description: req.param('description'),
      membership: {
        _column: mongoose.Types.ObjectId(columnId),
        owner: req.user._id
      }
    }).save( function( err, card, count ){
      console.log("(POST) /cards/ - Card " + card.name + " added to " + card.membership._column);
      Column.findOneAndUpdate(
        { "_id": req.param('columnId') },
        { $push: { "_cards": card._id } },
        function(err, column) {
          if (err) console.log(err);
        }
      )
      //res.redirect( '/projects/' + projectName );
      res.redirect(req.get('referer'));
    });
  });

  app.post('/cards/update', isLoggedIn, function(req, res) {
    console.log("(PATCH) /cards/ - Edit Card (POST): Saving updates for card with id '", req.param("cardId"), "'");
    Card.findOneAndUpdate(
      { "_id": req.param("cardId") },
      { $set: { "name": req.param("cardName"), "description": req.param("cardDescription") }, upsert: true },
      function(err, board) {
        if (err) console.log(err);
      }
    )
    res.redirect( '/projects/' + req.body.projectName );
  });

  // change this to /cards/:cardId with app.delete
  app.delete('/cards/', isLoggedIn, function(req, res) {
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

  app.get('/cards/:cardId', isLoggedIn, function(req, res) {
    Card.findOne( { "_id": req.param('cardId') }, function(err, card) {
      if (err) res.writeHead(500, err.message)
      else if (card == null) res.writeHead(404);
      else {
        console.log("/cards/" + req.param('cardId') + " - Found card '" + card.name + "'");
        res.json({ data: JSON.stringify(card) });
      }
    });
  });


  // Move a card to a different column
  app.post('/card/move', isLoggedIn, function(req, res) {
    var newColumnId = req.body.newColumnId;
    var cardId = req.body.cardId;
    console.log("Move Card (POST): cardId: " + req.body.cardId + " newColumnId: " + req.body.newColumnId);
    Card.findOne( { _id: req.body.cardId }).populate('membership._column').exec( function (err, card) {
      var oldColumn = card.membership._column;
      console.log("Move Card (POST): Found card '", card.name, "' with id '",card._id,"'");
      if (err) {
        console.log(err);
      } else {
        // change this to findOne and then save manually to avoid no erroring
        Column.findOneAndUpdate( { _id: newColumnId }, { $push: { _cards: mongoose.Types.ObjectId(card._id) } }, { safe: true, upsert: false }, function(err, column) {
          console.log("Move Card (POST): Column cards is now - ", column._cards);
          console.log("Move Card (POST): Found and added card '",card.name,"' to column '",column.name,"'");
          if (err) {
            console.log(err);
          } else {
            Column.findOneAndUpdate( { _id: oldColumn }, { $pull: { _cards: card._id }}, function(err, column) {
              console.log("Move Card (POST): Found and removed card '", card.name, "' from column '", column.name, "'");
              //Card.findOne, {$set: { 'membership._column': req.body.newColumnId } }, {new: true, upsert: false}).populate('membership._column').exec(function(err, card) {
              card.membership._column = req.body.newColumnId;
              card.save(function (err) {
                if (err) {
                  console.log(err);
                } else {
                  console.log("Move Card (POST): Saved updates to new column");
                };
              });
            });
            if (err) { console.log(err) }
            console.log("Move Card (POST): Moved card with id '" + cardId + "' to column '" + req.body.newColumnId + "'");
          };
        });
      };
    });
  });

  // route middleware to make sure a user is logged in
  function isLoggedIn(req, res, next) {

      // if user is authenticated in the session, carry on
      if (req.isAuthenticated())
          return next();

      // if they aren't redirect them to the home page
      res.redirect('/auth');
  }
};
