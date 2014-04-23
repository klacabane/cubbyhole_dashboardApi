var express = require('express');
var mongoose = require('mongoose');
var async = require('async');

var utils = require('../tools/Utils');
var mw = require('../tools/middlewares');

var User = require('../models/User'),
    Plan = require('../models/Plan');

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

router.get('/plans', function (req, res) {
    Plan.find({}, function (err, plans) {
        if (err) return res.send(500);

        var results = [
            {name: "Free", users: 0, plans: []},
            {name: "Paying", users: 0, plans: []}
        ];

        async.each(
            plans,
            function (plan, callback) {
                plan.getUsers(function (err, userCount) {
                    if (err) return callback(err);

                    var planData = {name: plan.name, users: userCount};
                    var planType = plan.price > 0 ? results[1] : results[0];

                    planType.plans.push(planData);
                    planType.users += planData.users;

                    callback();
                });
            },
            function (err) {
                if (err) return res.send(500);

                res.send(200, {
                    data: results
                });
        });
    });
});

module.exports = router;
