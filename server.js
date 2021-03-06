var path = require('path');
var express = require('express');

var routes = require('./app/routes');
var db = require('./app/config');

var app = express();


app.set('port', (process.env.PORT || 3000));


// Client Route - serve up all files in the public directory on requests to the home page
app.use('/', express.static(path.join(__dirname, 'dist')));
app.use('/info', express.static(path.join(__dirname, 'staticSite')));


// Routing
app.use('/', routes);

// Start Server
app.listen(app.get('port'), function() {
  console.log('Server started: http://localhost:' + app.get('port') + '/');
});

module.exports = app;