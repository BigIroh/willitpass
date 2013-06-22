var fs = require('fs');
var brain = require('brain');
var request = require('request');
var when = require('when');

var net = new brain.NeuralNetwork();
var netData = {};

var sunlight = require('sunlight-congress-api');
sunlight.init('9643597dc6fc44afb4bb32f8ee8caf75');

sponsorMap = {}

var processSponsor = function(sponsorId) {
	var deferred = when.defer()
	if(sponsorMap[sponsorId]) {
		deferred.resolve(sponsorMap[sponsorId])
	} else {
		sunlight
			.bills()
			.filter('history.enacted', 'true')
			.filter('sponsor_id', sponsorId)
			.fields()
			.call(function(data) {
				var succeeded = data.count;
				sunlight
					.bills()
					.filter('sponsor_id', sponsorId)
					.fields()
					.call(function(data) {
						deferred.resolve(sponsorMap[sponsorId] = succeeded/data.count)
					})
			})
	}
	return deferred.promise;
}



var transform = function(bill, callback) {
	processSponsor(bill.sponsor_id).then(function(ratio) {
		callback({
			cosponsor_count: bill.cosponsors_count/301,
			withdrawn_cosponsors_count: 0,
			sponsor_pass_ratio: ratio,
			has_popular_title: (bill.popular_title ? 1 : 0)
		})
		
	})
}

var willTheyPass = function(bills, callback) {
	var results = [];
	for (var i = bills.length - 1; i >= 0; i--) {
		var bill = bills[i];

		//convert bill into something usable in the NN
		transform(bill, function(billData) {
			var prediction = net.run(billData);
			results.push(prediction);
			if(results.length == bills.length) {
				callback(null, results)
			}
		});
	};
}

module.exports.predictUpcoming = function(callback) {
	var url = 'http://congress.api.sunlightfoundation.com/upcoming_bills?apikey=9643597dc6fc44afb4bb32f8ee8caf75';

	request(url, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			try {
				var bills = JSON.parse(body).results;
				willTheyPass(bills, callback)
			}
			catch(e) {
				callback(e);
			}
		}
		else {
			console.log(error)
			console.log(response.statusCode)
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