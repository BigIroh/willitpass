var fs = require('fs');
var brain = require('brain');
var request = require('request');
var when = require('when');

var net = new brain.NeuralNetwork();
var netData = {};

var willTheyPass = function(bills) {
	var results = [];
	for (var i = bills.length - 1; i >= 0; i--) {
		var bill = bills[i];

		//convert bill into something usable in the NN
		var billData = transform(bill);
		var prediction = net.run(billData);
	};
}

module.exports.predictUpcoming = function(callback) {
	var url = 'http://congress.api.sunlightfoundation.com/upcoming_bills\
		&api=9643597dc6fc44afb4bb32f8ee8caf75_';

	request(url, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			try {
				var bills = JSON.parse(body).results;
				var results = willTheyPass(bills);
				callback(null, results);
			}
			catch(e) {
				callback(e);
			}
		}
		else {
			callback(error || response.statusCode);
		}
	});
}

module.exports.initializeNetwork = function(callback) {
	var loadNetwork = function() {
		var d = when.defer();
		fs.readFile('nn.json', {encoding: 'utf8'}, function(err, raw) {
			if(err) {
				d.reject(err);	
			}
			else {
				var obj = JSON.parse(raw);
				net.fromJSON(obj);
				d.resolve('nn.json loaded from file');
			}
		});
		return d.promise;
	}

	var trainNewNetwork = function() {
		var d = when.defer();
		fs.readFile('input.json', {encoding: 'utf8'}, function(err, raw) {
			if(err) {
				console.error("Couldn't read input.json",err);
				d.reject(err);
			}
			else {
				var netData = JSON.parse(raw);
				console.log("input.json read successfully.  Training...");
				var trainingResults = net.train(netData.bills, {
					iterations: 50000,
					log: true,
					logPeriod: 5000
				});
				console.log("NN trained:", trainingResults);
				fs.writeFile('nn.json',JSON.stringify(net.toJSON()), function(err) {
					if(err) {
						console.error("Couldn't write to nn.json");
						d.reject(err);
					}
					else {
						console.log("nn.json created.");
						d.resolve();
					}
				});
			}
		})
		return d.promise;
	}

	loadNetwork().then(function(success) {
		callback();
	},
	function(err) {
		console.log("nn.json not found.  Creating new NN...");
		trainNewNetwork().then(
			function() {
				callback();
			},
			function(err){
				callback(err);
			});
	});
}