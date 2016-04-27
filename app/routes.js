// app/routes.js
// Todo -
// Look into route separation: https://github.com/strongloop/express/blob/master/examples/route-separation/index.js
require('../config/database');
var URL = require('url');
var Project = require('./models/project');
var Board = require('./models/board');
//var Setting = require('./models/setting');
var Card = require('./models/card');
var Setting = require('./models/setting');
var Comment = require('./models/comment');
var User = require('./models/user');
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
    console.log("Requested '/auth'");
    Setting.findOne({ name: "signup" }).exec( function(err, signup) {
      if (signup == null) {
        signup = { enabled: false };
        var signup = new Setting({ name: 'signup', enabled: true });
        signup.save();
      }

      console.log("Rendering 'auth.ejs' - Signup is: " + signup.enabled);
      return res.render('auth.ejs', { signup: signup });
    });
  });

  // show the login form
  app.get('/login', function(req, res) {
    Setting.findOne({ name: "signup" }).exec( function(err, signup) {
      if (signup == null) {
        signup = { enabled: false };
        var signup = new Setting({ name: 'signup', enabled: true });
        signup.save();
      }

      // render the page and pass in any flash data if it exists
      res.render('login.ejs', { message: req.flash('loginMessage'), signup: signup });
    });
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
    Setting.findOne({ name: "signup" }).exec( function(err, signup) {
      if (signup == null) {
        var signup = new Setting({ name: 'signup', enabled: true });
        signup.save();
        res.send(404, "registration is currently disabled 1").end();
      } else {
        console.log("(1) signup is: ", signup);

      // render the page and pass in any flash data if it exists
        if (signup.enabled) {
          res.render('signup.ejs', { message: req.flash('signupMessage') });
        } else {
          res.send(404, "registration is currently disabled 2").end();
        }
      }
    });
  });

  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect : '/profile', // redirect to the secure profile section
    failureRedirect : '/signup', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
  }));

  // we will want this protected so you have to be logged in to visit
  app.get('/profile', isLoggedIn, function(req, res) {
    console.log("Trying to render profile page");
    res.render('profile.ejs', {
        user : req.user // get the user out of session and pass to template
    });
  });

  // logout function
  app.get('/logout', function(req, res) {
      req.logout();
      res.redirect('/');
  });

// - ADMIN CONTROLS - //
  app.get('/admin', isLoggedIn, function(req, res) {
    console.log("Trying to render Admin page");

    Setting.getAllSettings(function(settings) {
      res.render('admin.ejs', {
        user : req.user,
        settings : settings
      });
    });
  });

  app.post('/admin', isLoggedIn, function(req, res) { 
    var signup = req.body.local_signup_check;
    console.log("Signup is " + signup);
    if (signup == "on") {
      console.log("enable local Signup");
      Setting.findOneAndUpdate(
        { "name" : "signup" },
        { $set: { "enabled" : "true" }}, { new: true }, function( err, doc ) { if (err) console.log(err); }
      );
    } else {
      console.log("disabling local Signup");
      Setting.findOneAndUpdate(
        { "name" : "signup" },
        { $set: { "enabled" : "false" }}, { new: true }, function( err, doc ) { if (err) console.log(err); }
        );
    }
    Setting.getAllSettings(function(settings) {
      res.render('admin.ejs', {
        user : req.user,
        settings : settings
      });
    });
    // get value of the checkbox
  });

// - PROJECTS - //
  // Projects View
  app.get('/projects', isLoggedIn, function(req, res) {
    Project.find().populate('_owner').exec( function(err, projects) {
      console.log("(GET) - /projects - Rendering index.ejs");
      res.render('projects/index.ejs', {
        user : req.user,
        projects : projects
      });
    });
  });

  app.get('/projects/:projectName', isLoggedIn, function(req, res) {
    var projectName = req.param('projectName').split('?')[0]
    var queryString = req.param('projectName').split('?')[1]
    //var projectName = req.param("projectName");
    var defaultBoardId = "";
    var url = require('url');
    var urlParts = url.parse(req.url, true);
    var query = urlParts.query;
    var selectedBoardId = '';
    var selectedBoard = null;
    console.log("(GET) /projects/:projectName - Loading project " + projectName);
    Project.findOne({ name: projectName }).populate('membership._defaultBoard').populate('membership._boards').exec( function(err, project) {
      if (project == null) {
        // Instead of sending 404, create a fun error page!
        return res.send(404, "not found").end();
      }

      if (typeof project.membership != 'undefined' && typeof project.membership._boards[0] != 'undefined') {
        if (typeof req.param('board') !== 'undefined' && req.param('board') !== null && req.param('board') !== '') {
          queryBoardName = req.param('board');
          selectedBoard = project.membership._boards.filter(function(doc) {
            return doc.name == queryBoardName;
          });
          if (selectedBoard[0]) {
            console.log("(GET) - /projects/:projectName - found board with name '"+selectedBoard[0].name+"'");
            selectedBoardId = selectedBoard[0]._id;
          } else {
            console.log("(GET) - /projects/:projectName - selected board null, loading default board of ", project.membership._defaultBoard._id);
            selectedBoardId = project.membership._defaultBoard._id;
          };
        } else if (typeof project.membership._defaultBoard == "undefined") {
          project.membership._defaultBoard = project.membership._boards[0];
          selectedBoardId = project.membership._boards[0]._id;
          project.save( function(err) {
            if (err) {
              console.log(err);
            }
          });
        } else {
          selectedBoardId = project.membership._defaultBoard._id;
          //console.log("defaultBoardId is '" + defaultBoardId + "'");
        };

        // Maybe do (project.membership._boards, { path: '_columns._cards'}...
        Column.populate(project, { path: 'membership._boards._columns' }, function(err, projectPopulatedColumns) {
          Card.populate(projectPopulatedColumns, { path: 'membership._boards._columns._cards' }, function(err, projectPopulatedCards) {
            if (err) { return console.log(err); }

            //console.log("projectPopulatedCards: ", projectPopulatedCards);
            var boards = projectPopulatedCards.membership._boards.toObject();
            boards.sort(function(b1, b2) { return b1._id - b2._id; });

            req.user.session.lastProject = projectPopulatedCards.name;
            console.log("(GET) - /projects/:projectName - Rendering project.ejs");
            projectPopulatedCards.membership._boards.forEach(function(board) {
              console.log("(GET) - /projects/:projectName - boards are ",board.name," id: ",board._id.toString());
            })
            console.log("(GET) - /projects/:projectName - selectedBoardId is ", selectedBoardId);
            res.render('projects/project.ejs', {
              user : req.user,
              boards : projectPopulatedCards.membership._boards,
              project : projectPopulatedCards,
              defaultBoardId : defaultBoardId,
              selectedBoardId : selectedBoardId
            });
          });
        });
      } else {
        console.log("(GET) - /orjects/:projectName - Rendering project.ejs without boards");
        res.render('projects/project.ejs', {
          user : req.user,
          project: project
        });
      };
    });
  });

  app.get('/projects/:projectName/:boardName', isLoggedIn, function(req, res) {
    var projectName = req.param("projectName");
    var boardName = req.param("boardName");
    console.log("(GET) /projects/:projectName/:boardName - Loading board: " + boardName);
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
  // TODO: Move this to a post with a data object for _method to determine what to do
  app.delete('/projects/:projectId', isLoggedIn, function(req, res) {
    console.log("Deleting Project with ID '" + req.param('projectId') + "'");
    Project.findById( req.param('projectId'), function ( err, project ){
      if (project != null) {
        project.remove( function ( err, project ){
          if( err ) return next( err );
          res.status(204).end();
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

// - COLUMNS - //
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

// - CARDS - //
  // Create a card and add it to a column
  app.post('/cards/', isLoggedIn, function(req, res) {
    var columnId = req.param('columnId');
    var name = req.param('name');
    var description = req.param('description');
    console.log("(POST) /cards/ - columnId - ", columnId);
    console.log("(POST) /cards/ - name: ", name, "description: ",description);
    new Card({
      name: req.param('name'),
      description: req.param('description'),
      membership: {
        _column: mongoose.Types.ObjectId(columnId),
        owner: req.user._id
      }
    }).save( function( err, card, count ){
      console.log("(POST) /cards/ - card: ",card);
      console.log("(POST) /cards/ - Card " + card.name + " added to " + card.membership._column);
      Column.findOneAndUpdate(
        { "_id": req.param('columnId') },
        { $push: { "_cards": card._id } },
        function(err, column) {
          if (err) console.log(err);
          // should render the correct board here
        }
      )
      //res.redirect( '/projects/' + projectName );
      res.redirect(req.get('referer'));
    });
  });

  app.post('/cards/update', isLoggedIn, function(req, res) {
    console.log("(POST) /cards/ - Edit Card (POST): Saving updates for card with id '", req.param("cardId"), "' and name '", req.param("name"), "'");
    Card.findOneAndUpdate(
      { "_id": req.param("cardId") },
      { $set: { "name": req.param("name"), "description": req.param("description") }, upsert: true },
      function(err, board) {
        if (err) console.log(err);
      }
    )
  });

  // change this to /cards/:cardId with app.delete
  app.delete('/cards/:cardId', isLoggedIn, function(req, res) {
    var cardId = req.param("cardId");
    var columnId = req.param("columnId");
    //console.log("Delete Card (GET): Deleting card with ID '" + req.query.cardId + "'");
    console.log("Delete Card (GET): Deleting card with ID '" + cardId + "'");
    // Add a message here to populate message field on board or project page with status of result
    Column.update( { "_id": columnId }, { $pull: { _cards: cardId } }, function(err, numAffected) {
      if (err) {
        console.log("(DELETE) - /cards/:cardId - Error deleting card: "+err);
        res.send(500);
        return;
      } else if (numAffected == 0) {
        console.log("(DELETE): No cards found with id " + cardId);
        res.send(404, "Card not found");
        return;
      }
      console.log("(DELETE) - /cards/:cardId - Card "+cardId+" deleted!");
      res.send(200, "Success");
      // need to send back the changed column data here

      // Change this to update the card to reflect that it is not on a column or is in trash
      //Card.remove({ _id: cardId }, function(err) {
      //  console.log("Delete Card (GET): Removed card '" + cardId + "'");
        //res.redirect('/projects/' + req.query.projectName || '/');
        //var returnPath = URL.parse(req.headers['referer']).pathname
        //res.render(returnPath);
      //});
    });
  });

  app.get('/cards/:cardId', isLoggedIn, function(req, res) {
    Card.findOne( { "_id": req.param('cardId') } ).populate('membership._comments').exec( function(err, card) {
      User.populate(card, { path: 'membership._comments._user' }, function(err, cardPopulated) {
        if (err) res.writeHead(500, err.message)
        else if (card == null) res.writeHead(404);
        else {
          console.log("(GET) /cards/" + req.param('cardId') + " - Found card '" + cardPopulated.name + "'");
          console.log("(GET) /cards/ - Returning card json - ", cardPopulated);
          res.json({ data: JSON.stringify(cardPopulated) });
        }
      });
    });
  });

  app.post('/board/column/order', isLoggedIn, function(req, res) {
    var boardId = req.body.boardId;
    var columnOrder = req.body.columnOrder;
    console.log("Updating column order for board with id '"+boardId+"'");
    Board.findOne({ _id: boardId }).populate("_columns").exec( function(err, board) {
      if (err) {
        console.log("Error finding board with id: '"+boardId+"'");
        res.status(500, "error").end();
      };
      if (board == null) {
        console.log("No board found with id: '"+boardId+"'");
        res.status(404, "failed").end();
      } else {
        console.log("Found board '"+board.name+"'");
        console.log("Board columns: "+board._columns);
        var columnOrderArray = columnOrder.split(',');
        var columnOrderObjects = [];
        var cardCount = (columnOrderArray.length - 1);
        var count = 0;
        if (typeof columnOrderArray[0] !== 'undefined' && columnOrderArray[0] !== null && columnOrderArray[0] != '') {
          console.log("columnOrderArray.length: "+columnOrderArray.length);
          columnOrderArray.forEach( function(columnId) {
            console.log("Column sort order processing column: "+columnId);
            columnOrderObjects[count] = mongoose.Types.ObjectId(columnId);
            count = count + 1;
          });
        } else {
          console.log("No columns");
        };
        board._columns = columnOrderArray;
        board.save( function(err) {
          console.log("Board saved after column order update: "+board._columns);
          res.status(200, "success").end();
        });
      }
    });
  });
  // Update column card order
  app.post('/column/card/order', isLoggedIn, function(req, res) {
    var columnId = req.body.columnId;
    var cardOrder = req.body.cardOrder;
    console.log("Updating column ID '"+columnId+"' with order: '"+cardOrder+"'");
    //if (cardOrder[0] == null) {
    //  console.log("Sort order request submitted empty request");
    //  res.status(404, "empty request").end();
    //} else {
    Column.findOne({ _id: columnId }).populate("_cards").exec( function(err, column) {
      if (err) {
        console.log("Error finding column with id: "+columnId+" err: "+err);
        res.status(500, "error").end();
      };
      if (column == null) {
        console.log("No column found with id: "+columnId);
        res.status(404, "failure").end();
      } else {
        console.log("Found colum '"+column.name);
        //console.log("Column _cards before update: "+column._cards);
        var cardOrderArray = cardOrder.split(',');
        var cardOrderObjects = [];
        var cardCount = (cardOrderArray.length - 1);
        var count = 0;
        // This might should check for null also
        if (typeof cardOrderArray[0] !== 'undefined' && cardOrderArray[0] !== null && cardOrderArray[0] != '') {
          console.log("cardOrderArray.length: "+cardOrderArray.length);
          cardOrderArray.forEach( function(cardId) {
            console.log("Sort order processing card: "+cardId);
            cardOrderObjects[count] = mongoose.Types.ObjectId(cardId);
            count = count + 1;
          });
        } else {
          console.log("Column is empty");
        };
        column._cards = cardOrderArray;
        column.save( function(err) {
          console.log("Column _cards after update: "+column._cards);
          res.status(200, "success").end();
        });
      };
    });
  });

  // Move a card to a different column
  app.post('/card/move', isLoggedIn, function(req, res) {
    var newColumnId = req.body.newColumnId;
    var cardId = req.body.cardId;
    console.log("Move Card (POST): cardId: " + req.body.cardId + " newColumnId: " + req.body.newColumnId);
    Card.findOne( { _id: cardId }).populate('membership._column').exec( function (err, card) {
      // If no card is found send a 404 back and stop processing the request
      if (card == null) {
        console.log("No card found with id: "+cardId);
        res.status(404, "Failure").end();
      } else {
        // We found a card so lets update it with the new changes
        var oldColumn = card.membership._column;
        console.log("oldColumn._id: "+oldColumn._id+" newColumnId: "+newColumnId);
        if (oldColumn._id == newColumnId) {
          console.log("Card moved within column");
          res.status(200, "success").end();
        } else {
          console.log("(POST) /card/move [INFO] - oldColumn name: " + oldColumn.name);
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
                Column.findOneAndUpdate( { _id: oldColumn }, { $pull: { _cards: card._id }}, function(err, oldColumn) {
                  console.log("Move Card (POST): Found and removed card '", card.name, "' from column '", oldColumn.name, "'");
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
                res.status(200, "Success").end();
              };
            });
          };
        };
      };
    });
  });

// - COMMENTS - //
  app.post('/comments', isLoggedIn, function(req, res) {
    console.log("(POST) /comments/ - Adding comment...");
    var cardId = req.param('cardId');
    var userId = req.user._id;
    var comment = req.param('comment');
    console.log("(POST) /comments/ - CardId: " + cardId + " userId: " + userId + " comment: " + comment);
    new Comment({
      _user: userId,
      content: comment,
      membership: {
        _card: cardId
      }
    }).save( function( err, comment, count ) {
      console.log("(POST) /comments/ - Comment added - count: ",count);
      Card.findOneAndUpdate(
        { "_id": cardId },
        { $push: { "membership._comments": comment } },
        function(err, card) {
          if (err) console.log("(POST) /comments/ [ERROR] Error pushing comment to card");
          res.status(200, "Success").end();
        }
      );
    });
  });

  app.get('/comments/delete/:commentId', isLoggedIn, function(req, res) {
    console.log("(POST) /comments/delete - Deleting comment...");
    var commentId = req.param('commentId');
    // remove comment from card here
    Comment.findById( commentId, function ( err, comment ){
      if (comment != null) {
        comment.remove( function ( err, data ){
          if( err ) return next( err );
          res.status(200, "Success").end();
        });
      } else {
        console.log("(POST) /projects/delete - [ERROR] Comment with id " + req.param('commentId') + " does not exist");
        res.status(404).end();
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
