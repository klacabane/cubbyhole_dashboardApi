var express = require('express');
var router = express.Router();
var utils = require('../tools/Utils');

/** GET */
router.get('/', function(req, res) {
  res.render('index');
});

router.get('/location', function (req, res) {
    var results = utils.continents
        .map(function (continent) {
            return continent.display_name;
        });

    res.send(200, {
        data: results
    });
});

module.exports = router;
