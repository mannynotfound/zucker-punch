var express = require('express');
var http = require('http');
var path = require('path');
var myoListener = require('./myo');

var port = process.env.PORT || 3000;
var app = express();

app.use(express.static(path.resolve(__dirname, './build')));

var server = http.createServer(app).listen(port, function() {
  console.log('Express server listening on port ' + port);
});

var io = require('socket.io').listen(server);
myoListener.init(function() {
  io.emit('punch');
});
