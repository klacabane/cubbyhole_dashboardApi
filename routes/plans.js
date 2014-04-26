var express = require('express');
var mongoose = require('mongoose');
var async = require('async');

var mw = require('../tools/middlewares');

var User = require('../models/User'),
    Plan = require('../models/Plan'),
    UserPlan = require('../models/UserPlan');

var router = express.Router();

router.get('/users', function (req, res) {
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

router.get('/years', function (req, res) {
    UserPlan.getYears(function (err, results) {
        if (err) return res.send(500);

        res.send(200, {
            data: results
        });
    });
});

router.get('/distribution/:nMonth?', mw.parseLimitDate, function (req, res) {
    Plan.getPlansDistribution(req.limitDate, req.monthNb, function (err, results) {
        if (err) return res.send(500);

        res.send(200, {
            data: results
        });
    });
});

module.exports = router;
