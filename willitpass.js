var fs = require('fs');
var brain = require('brain');
var request = require('request');
var when = require('when');

var net = new brain.NeuralNetwork();

module.exports.willItPass = function(id) {
	//look up bill by id on sunlight
	
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
		return d;
	}

	var trainNewNetwork = function() {
		var d = when.defer();
		fs.readFile('input.json', {encoding: 'utf8'}, function(err, raw) {
			if(err) {
				console.error("Couldn't read input.json",err);
				d.reject(err);
			}
			else {
				var data = JSON.parse(raw);
				console.log("input.json read successfully.  Training...");
				var trainingResults = net.train(data, {
					iterations: 20000,
					log: true,
					logPeriod: 1000
				});
				console.log("NN trained:", trainingResults);
				fs.writeFile('nn.json',net.toJSON(), function(err) {
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
		return d;
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