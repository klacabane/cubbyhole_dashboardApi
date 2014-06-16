cubbyhole_dashboardApi
======================

# Install

Git bash on the projet folder

	npm install

# Getting started

The main API must be running!

Please, follow the steps to get started with the main API.
Then,

Git bash on the projet folder

	node app.js

	
# Adding Fixtures

Open bin/www and uncomment lines 12 to 28:

	    /*
	    var today = new Date();
	    var past = new Date(2013, 1, 14);
	    fixtures.createUser('Free', past, function (err, user) {
	        if (err) return console.log(err);
	
	        user.updatePlan('Pro', today, function (err) {
	            console.log(err);
	        });
	    });
	    */
	
	    /*
	    fixtures.generate(12, function (err) {
	        if (err) return console.log(err);
	
	        console.log('Fixtures added');
	    });
	    */

Launch the dashboard API (see Getting Started above)

Stop the dashboard API.


Re-open bin/wwwand comment lines 12 to 28.

Re-launch the dashboard API. Fixtures are added.

# Changing IP Addresses

Open config.js & replace line 3

	address: "mongodb://localhost/Cubbyhole"
