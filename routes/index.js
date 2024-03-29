var express = require('express');
var router = express.Router();
var utils = require('../tools/Utils');
var fs = require('fs');

var User = require('../models/User'),
    Plan = require('../models/Plan');

/** GET */
router.get('/', function(req, res) {
  res.render('index');
});

router.get('/documentation', function (req, res) {
    fs.readFile('./routes/endpoints.json', 'utf-8', function (err, endpoints) {
        if (err) return res.send(500);

        res.send(200, JSON.parse(endpoints));
    });
});

router.get('/location', function (req, res) {
    var result = {};
    for (var i = 0, continents = utils.continents, len = continents.length; i < len; i++) {
        var continent = continents[i];
        result[continent.iso] = continent.display_name;
    }

    res.send(200, {
        data: result
    });
});

router.post('/dynamic', function (req, res) {
    var metrics = [
        req.body['metric1'],
        req.body['metric2'],
        req.body['metric3']
    ];

    utils.getQueryResult(metrics, function (err, result) {
        if (err) return res.send(500);

        res.send(200, result);
    });
});

module.exports = router;
