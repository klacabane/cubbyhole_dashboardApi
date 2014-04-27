var express = require('express');
var mongoose = require('mongoose');
var async = require('async');

var utils = require('../tools/Utils');
var mw = require('../tools/middlewares');

var User = require('../models/User'),
    Plan = require('../models/Plan'),
    UserPlan = require('../models/UserPlan');

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

                if (monthsData instanceof Array) {
                    monthsData.forEach(function (value, index) {
                        var toAdd = monthsData[index - 1] || userCount;
                        monthsData[index] = value + toAdd;
                    });
                }

                res.send(200, {
                    data: monthsData
                });
            });
        });
});

router.get('/location', function (req, res) {
    User.getUsersByLocation(function (err, results) {
        if (err) return res.send(500);

        res.send(200, {
            data: results
        });
    });
});

router.get('/delay', function (req, res) {
    UserPlan.getFreeToPayingDelays(function (err, results) {
        if (err) return res.send(500);

        res.send(200, {
            data: results
        });
    });
});

router.get('/:type/:nMonth?', mw.parseLimitDate, function (req, res) {
    var type = req.params['type'];

    Plan.getPlanTypeUsers(type, req.limitDate, req.monthNb, function (err, monthsData) {
        if (err) return res.send(500);

        res.send(200, {
            data: monthsData
        });
    });
});

module.exports = router;
