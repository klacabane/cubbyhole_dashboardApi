var async = require('async');
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

                            that._generateUsers(plan._id, date, usersNb, done);
                        },
                        next);
                },
                callback);
        });
    },
    _generateUsers: function (plan, regDate, nb, done) {
        var users = [],
            userPlans = [];
        for (var i = 0; i < nb; i++) {
            var userPlan = new UserPlan({plan: plan, billingDate: regDate});
            userPlans.push(userPlan);

            var email = 'fixt-' + new Date().getMilliseconds();
            users.push(
                new User({
                    email: email,
                    password: 'hehhe',
                    registrationDate: regDate,
                    currentPlan: userPlan
                })
            );
        }

        async.each(users, function (user, next) {
                user.save(next);
            },
            function (err) {
                if (err) return done(err);

                async.each(userPlans, function (uplan, cb) {
                    uplan.save(cb);
                }, done);
            });
    },
    _getDates: function (monthCount) {
        var dates = [],
            nMonth = monthCount - 1,
            limitDate = new Date();

        limitDate.setMonth(limitDate.getMonth() - nMonth);
        limitDate.setDate(10);
        limitDate.setHours(24,0,0,0);

        for (var i = 0; i <= nMonth; i++) {
            dates.push(new Date(limitDate.getFullYear(), limitDate.getMonth(), limitDate.getDate()));

            limitDate.setMonth(limitDate.getMonth() + 1);
        }

        return dates;
    }
};
