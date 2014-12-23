// app/routes.js
// Todo -
// Look into route separation: https://github.com/strongloop/express/blob/master/examples/route-separation/index.js
require('../config/database');
var Project = require('./models/project');
var Board = require('./models/board');
var Card = require('./models/card');
var mongoose = require('mongoose');
var async = require('async');

module.exports = function(app, passport) {

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
      res.render('projects/action/createCard.ejs', {
        user : req.user,
        projectName: req.query.projectName,
        boardName: req.query.boardName,
        columnName: req.query.columnName
      });
    });

    app.post('/projects/action/createCard', isLoggedIn, function(req, res) {
      var projectName = req.body.projectName;
      var columnName = req.body.columnName;
      new Card({
        name: req.body.name,
        projectName: req.body.projectName,
        boardName: req.body.boardName,
        columnName: req.body.columnName
      }).save( function( err, card, count ){
        console.log("Card " + card.name + " added to " + projectName + " under " + req.body.columnName);
        Board.findOneAndUpdate(
          { "name": req.body.boardName },
          { $push: { "cards": {"cardId": card._id, "columnName": req.body.columnName} } },
          function(err, board) {
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
          cardId: req.query.cardId,
          projectName: req.query.projectName,
          boardName: req.query.boardName,
          cardName: card.name,
          cardDescription: card.description
        });
      });
    });

    app.post('/projects/action/editCard', isLoggedIn, function(req, res) {
      console.log("Edit Card (POST): Saving updates for card with id '" + req.body.cardId + "'");
      Card.findOneAndUpdate(
        { "_id": req.body.cardId },
        { $set: { "name": req.body.cardName, "description": req.body.cardDescription }, upsert: true },
        function(err, board) {
          if (err) console.log(err);
        }
      )
      res.redirect( '/projects/' + req.body.projectName );
    });

    app.get('/cards/deleteCard', isLoggedIn, function(req, res) {
      console.log("Delete Card (GET): Deleting card with ID '" + req.query.cardId + "'");
      // Add a message here to populate message field on board or project page with status of result
      Board.findOne( { "name": req.query.boardName }, function(err, board) {
        if (!board) {
          console.log("Delete Card (GET): No board found");
        }
        console.log("Delete Card (GET): Found board '" + board.name + "'");
        console.log("Delete Card (GET): Cards that belong to board '" + board.cards + "'");
        console.log("Delete Card (GET): Looking for card with cardId '" + req.query.cardId + "'");
        var i = 0;
        var found = false;
        var id = null;
        for (i = 0; i < board.cards.length; i++) {
          var card = board.cards[i];
          if (card.cardId === req.query.cardId) {
            id = board.cards[i]._id;
            found = true;
            break;
          }
        };
        //var idx = board.cards ? board.cards.cardId.indexOf(req.query.cardId) : -1;
        if (found) {
          console.log("Delete Card (GET): Ready to splice");
          var doc = board.cards.id(id).remove();
          board.save(function(err) {
            if (err) { console.log(err); };
            console.log("Delete Card (GET): Removing card");
            Card.remove({ _id: req.query.cardId },
              function(err) {
                console.log("Delete Card (GET): Removed card '" + req.query.cardId + "'");
                res.redirect('/projects/' + req.query.projectName || '/');
              }
            );
          });
        };
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
    app.post('/projects/action/moveCard', isLoggedIn, function(req, res) {
      console.log("Move Card (POST): boardName: " + req.body.boardName + " cardId: " + req.body.cardId + " newColumn: " + req.body.newColumn);
      // Need to move to finding these boards by ID
      Board.findOneAndUpdate( { 'name': req.body.boardName, 'cards.cardId': req.body.cardId }, {$set: { 'cards.$.columnName': req.body.newColumn } }, {new: true, upsert: false}, function(err, board) {
        if (err) { console.log(err); };
        console.log("Move Card (POST): Found board with name '" + board.name + "'");
        console.log("Move Card (POST): Moved card with id '" + req.body.cardId + "' to column '" + req.body.newColumn + "'");
      });
    });

    app.get('/projects/:projectName', isLoggedIn, function(req, res) {
      var projectName = req.params.projectName;
      console.log("Loading project " + projectName);
      Project.findOne({ name: projectName }, function(err, project) {
        if (typeof project.membership != 'undefined' && project.membership.boards[0] != 'undefined' && 0 < project.membership.boards.length) {
          var boards = [];
          var cards = {};
          async.each(project.membership.boards, function(boardId, boardsCallback) {
            Board.findOne({ _id: boardId }, function(err, board) {
              console.log("looping board " + board.name);
              boards.push(board);
              async.each(board.cards, function(cardList, cardsCallback) {
                console.log("looping card with ID '" + cardList.cardId + "'");
                Card.findOne({ _id: cardList.cardId }, function(err, card) {
                  if (err) { console.log(err) };
                  if (!card) {
                    console.log("Could not look up card with id '" + cardList.cardId + "'");
                  } else {
                    cards[card._id] = card;
                  }
                  cardsCallback();
                });
              }, function(err) {
                if (err) { return console.log(err); }
                boardsCallback();
              });
            });
          }, function(err) {
            if (err) { return console.log(err); }
            console.log("loop callback");
            req.user.session.lastProject = req.params.projectName;
            console.log("Project (GET): saving project name to session '" + req.params.projectName + "'");
            res.render('projects/project.ejs', {
              cards: cards,
              boards: boards,
              project: project
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
