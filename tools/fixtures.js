var async = require('async');

var utils = require('../tools/Utils');

var Plan = require('../models/Plan');
var User = require('../models/User');
var UserPlan = require('../models/UserPlan');

module.exports = {
    generate: function (nMonth, callback) {
        var that = this;
        var dates = this._getDates(nMonth);

        Plan.find({}, function (err, plans) {
            if (err) return callback(err);

            async.each(
                plans,
                function (plan, next) {
                    async.each(
                        dates,
                        function (date, done) {
                            var usersNb = Math.floor(Math.random() * 8) + 1;

                            that._generateUsers(plan, date, usersNb, done);
                        },
                        next);
                },
                callback);
        });
    },
    createUser: function (planName, regDate, done) {
        Plan.findOne({name: planName}, function (err, plan) {
            if (err) return done(err);

            var userPlan = new UserPlan({plan: plan._id, billingDate: regDate, isFree: plan.price === 0});

            var email = 'fixt-' + Date.now();
            var randomLocation = {'continent_code': utils.continents[Math.floor(Math.random() * 6)].iso};

            new User({
                email: email,
                password: 'hehhe',
                registrationDate: regDate,
                lastBillingDate: regDate,
                currentPlan: userPlan,
                location: randomLocation
            }).save(function (err, user) {
                    if (err) return done(err);

                    userPlan.user = user._id;
                    userPlan.usage.storage = Math.round(Math.random() * 100000000);
                    userPlan.usage.share = Math.round(Math.random() * 100000000);
                    userPlan.save(function (err) {
                        done(err, user);
                    });
                });
        });
    },
    _generateUsers: function (plan, regDate, nb, done) {
        var users = [],
            userPlans = [];
        for (var i = 0; i < nb; i++) {
            var userPlan = new UserPlan({
                plan: plan._id,
                billingDate: regDate,
                isFree: plan.price === 0,
                usage: {
                    storage: Math.round(Math.random() * 100000000),
                    share: Math.round(Math.random() * 100000000)
                }
            });

            var randomLocation = {'continent_code': utils.continents[Math.floor(Math.random() * 6)].iso};
            var email = 'fixt-' + new Date().getMilliseconds();
            var fixture = new User({
                email: email,
                password: 'hehhe',
                registrationDate: regDate,
                currentPlan: userPlan,
                location: randomLocation
            });
            users.push(fixture);

            userPlan.user = fixture._id;
            userPlans.push(userPlan);
        }

        async.each(
            users,
            function (user, next) {
                user.save(next);
            },
            function (err) {
                if (err) return done(err);

                async.each(
                    userPlans,
                    function (uplan, cb) {
                        uplan.save(cb);
                    }, done);
            });
    },
    _getDates: function (monthCount) {
        var dates = [],
            limitDate = new Date();

        limitDate.setDate(10);
        limitDate.setHours(24,0,0,0);

        for (var i = 0; i < monthCount; i++) {
            dates.push(new Date(limitDate.getFullYear(), limitDate.getMonth(), limitDate.getDate()));

            limitDate.setMonth(limitDate.getMonth() - 1);
        }

        return dates;
    }
};
