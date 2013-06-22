var sunlight = require('sunlight-congress-api');
var when = require('when');


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

var results = [];


var maxCosponsors = 1;
var maxWithdrawn = 1;
var enact = function(pass, callback) {
	var bills = sunlight
		.bills()
		.filter('history.enacted', pass)
		.fields('cosponsors_count', 'withdrawn_cosponsors_count', 'popular_title', 'sponsor_id');
	
	var fail = function(data) {
		console.log(data)
	}

	var success = function(data) {
		var go = function(i) {
			var bill = data.results[i];
			if(bill) {
				maxCosponsors = (maxCosponsors > bill.cosponsors_count ? maxCosponsors : bill.cosponsors_count);
				maxWithdrawn = (maxWithdrawn > bill.withdrawn_cosponsors_count ? maxWithdrawn : bill.withdrawn_cosponsors_count);
				processSponsor(bill.sponsor_id).then(function(ratio) {
					bill.ratio = ratio;
					bill.pass = pass;
					results.push(bill);
					go(i+1)
				})
			} else {
				if(data.page.page < 5)
					bills.next(success, fail)
				else
					callback();
			}
		}
		go(0)
	}

	bills.call(success, fail)
}

enact(true, function() {
	console.log('fetch true complete')
	enact(false, function() {
		console.log('fetch false complete')
		console.log('maxCosponsors:', maxCosponsors)
		console.log('maxWithdrawn:', maxWithdrawn)
		console.log(results.map(function(bill) {
			return {
				input: {
					cosponsor_count: bill.cosponsors_count/maxCosponsors,
					withdrawn_cosponsors_count: bill.withdrawn_cosponsors_count/maxWithdrawn,
					sponsor_pass_ratio: bill.ratio,
					has_popular_title: (bill.popular_title ? 1 : 0)
				},
				output: {
					pass: (bill.pass ? 1 : 0)
				}
			}
		}))
	})
})
