var express = require('express');
var mongoose = require('mongoose');

var utils = require('../tools/Utils');
var mw = require('../tools/middlewares');

var User = require('../models/User');

var router = express.Router();

/**
 * GET
 */
router.get('/new/:nMonth?', mw.parseLimitDate, function(req, res) {
    User.getUsersByMonth(req.limitDate, req.monthNb, function (err, monthsData) {
        if (err) return res.send(500);

        res.send(200, {
            data: monthsData
        });
    });
});

router.get('/total/:nMonth?', mw.parseLimitDate, function (req, res) {
    User.count({registrationDate: {$lt: req.limitDate}})
        .exec(function (err, userCount) {
            if (err) return res.send(500);

            User.getUsersByMonth(req.limitDate, req.monthNb, function (err, monthsData) {
                if (err) return res.send(500);

                monthsData.forEach(function (value, index) {
                    var toAdd = monthsData[index - 1] || userCount;
                    monthsData[index] = value + toAdd;
                });

                res.send(200, {
                    data: monthsData
                });
            });
        });
});

module.exports = router;
