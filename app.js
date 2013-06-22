var wp = require('./willitpass');
var express = require('express');
var jade = require('jade');
var app = express();

app.use(express.favicon());

app.set('views', 'views');
app.set('view engine', 'jade');

app.get('/bills', function(req, res) {
	wp.predictUpcoming(function(results) {
		res.json(results);
	})
})

app.use(express.static(__dirname + '/public'));

var server = require('http').createServer(app);

var port = process.env.PORT || 5000;
server.listen(port);
