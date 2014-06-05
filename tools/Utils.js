var async = require('async');

var Plan,
    UserPlan,
    User;

var Utils = {
    continents: [
        {iso: 'AF', name: 'africa', display_name: 'Africa'},
        {iso: 'AS', name: 'asia', display_name: 'Asia'},
        {iso: 'OC', name: 'australia', display_name: 'Australia'},
        {iso: 'EU', name: 'europe', display_name: 'Europe'},
        {iso: 'NA', name: 'north_america', display_name: 'North America'},
        {iso: 'SA', name: 'south_america', display_name: 'South America'}
    ],
    months: ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'],
    getMonthCount: function (data, date) {
        var count = 0;
        for (var i = 0, length = data.length; i < length; i++) {
            var monthData = data[i];
            if (monthData._id.year === date.year && monthData._id.month === date.month) {
                count = monthData.count;
                break;
            }
        }
        return count;
    },
    getMonthPercentage: function (data, date) {
        var res = {};
        for (var i = 0, length = data.length; i < length; i++) {
            var monthData = data[i];
            if (monthData._id.year === date.year && monthData._id.month === date.month) {
                res.storage = Math.round(
                    (this.bytesToMb(monthData.usedStorage) / monthData.totalStorage) * 100);
                res.share = Math.round(
                    (this.bytesToMb(monthData.usedShare) / monthData.totalShare) * 100);
                break;
            }
        }
        return res;
    },
    getMonthArray: function (limitDate, monthNb, data) {
        var months = [];
        for (var i = 0; i <= monthNb; i++) {
            var monthCount = this.getMonthCount(data,
                {
                    year: limitDate.getFullYear(),
                    month: limitDate.getMonth() + 1
                });
            months.push(monthCount);

            limitDate.setMonth(limitDate.getMonth() + 1);
        }

        return months;
    },
    getMonthPercentArrays: function (limitDate, monthNb, data) {
        var months = {
            storage: [],
            share: []
        };
        for (var i = 0; i <= monthNb; i++) {
            var monthData = this.getMonthPercentage(data,
                {
                    year: limitDate.getFullYear(),
                    month: limitDate.getMonth() + 1
                });
            months.storage.push(monthData.storage || 0);
            months.share.push(monthData.share || 0);

            limitDate.setMonth(limitDate.getMonth() + 1);
        }

        return months;
    },
    getContinentArray: function (data) {
        var continents = this.continents;

        var res = continents
            .map(function (continent) {
                var cObj = {name: continent.name, value: 0};

                for (var i = 0, len = data.length; i < len; i++) {
                    var cData = data[i];
                    if (cData._id.continent === continent.iso) {
                        cObj.value = cData.count;
                        break;
                    }
                }
                return cObj;
            });

        return res;
    },
    getEarliestBillingDate: function (plans) {
        if (plans.length === 1) return plans[0].billingDate;

        return plans.reduce(function (a, b) {
            return a.billingDate < b.billingDate
                ? a.billingDate
                : b.billingDate;
        });
    },
    getDelayInDays: function (from, to) {
        var timeDiff = Math.abs(to.getTime() - from.getTime());
        var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

        return diffDays;
    },
    getMostExpensivePlan: function (plans) {
        var highestPrice = 0,
            highestPlan;

        for (var i = 0, length = plans.length; i < length; i++) {
            var p = plans[i];
            if (p.price > highestPrice) {
                highestPrice = p.price;
                highestPlan = p._id;
            }
        }
        return highestPlan;
    },
    bytesToMb: function (bytes) {
        if (bytes == 0) return 0;
        return (bytes/1000000).toFixed(2);
    },
    getQueryResult: function (metrics, callback) {
        var queryLabel = [metrics[0].prop, metrics[1].prop, metrics[2].prop]
            .join('_');

        this.reportQueries[queryLabel](metrics, function (err, results) {
            var res = {data: results};
            if (metrics[2].prop === 'time')
                res.year = metrics[2].filter;

            callback(err, res);
        });
    },
    /**
     *
     *  Report Queries
     *
     */
    reportQueries: {
        'users_plan_location': function (metrics, done) {
            var userFilter = metrics[0].filter,
                planFilter = metrics[1].filter;

            var query = [
                {$match: {}},
                {$group: {_id: '$user'}}
            ];

            var result = {
                'AF': 0,
                'AS': 0,
                'OC': 0,
                'EU': 0,
                'NA': 0,
                'SA': 0
            };

            if (userFilter === 'new') {
                var date = new Date();
                date.setHours(0,0,0,0);

                query[0]['$match'].billingDate = {$gte: date};
            }

            if (planFilter === 'all paying')
                query[0]['$match'].isFree = false;
            else if (planFilter === 'all free')
                query[0]['$match'].isFree = true;
            else
                query[0]['$match'].plan = planFilter;

            UserPlan.aggregate(query, function (err, userIds) {
                if (err) return done(err);

                async.each(
                    userIds,
                    function (userId, next) {
                        User.findOne({_id: userId, location: {$exists: true}}, function (err, user) {
                            if (user && user.location) {
                                result[user.location.continent_code]++;
                            }
                            next(err);
                        });
                    },
                    function (err) {
                        if (err) return done(err);

                        var res = Utils.continents
                            .map(function (continent) {
                                return {
                                    name: continent.name,
                                    value: result[continent.iso]
                                };
                            });
                        done(null, res);
                    });
            });
        },
        'users_plan_time': function (metrics, done) {
            var userFilter = metrics[0].filter,
                planFilter = metrics[1].filter,
                yearFilter = metrics[2].filter;

            var date = new Date(yearFilter, 0, 1),
                planByType = (planFilter === 'all paying' || planFilter === 'all free');

            (function (callback) {
                if (planByType) {
                    var type = planFilter.split(' ')[1];
                    Plan.getPlanTypeUsers(type, date, 11, callback);
                } else {
                    Plan.findOne({_id: planFilter}, function (err, plan) {
                        if (err) return callback(err);

                        plan.getUsers(date, 11, callback);
                    });
                }
            })(function (err, monthsData) {
                if (err) return done(err);

                if (userFilter === 'all')
                    for (var i = 0, len = monthsData.length; i < len; i++) {
                        var prev = monthsData[i - 1];
                        if (prev) {
                            monthsData[i] += prev;
                        }
                    }

                for (var i = 0, result = [], months = Utils.months, len = monthsData.length; i < len; i++) {
                    result.push({
                        name: months[i],
                        value: monthsData[i]
                    });
                }

                done(null, result);
            });
        },
        'users_location_plan': function (metrics, done) {
            var userFilter = metrics[0].filter,
                locationFilter = metrics[1].filter;

            var query = {
                'location.continent_code': locationFilter
            };

            if (userFilter === 'new') {
                var date = new Date();
                date.setHours(0,0,0,0);

                query.lastBillingDate = {$gte: date};
            }

            Plan.getAllPlansHash(function (err, planHash) {
                if (err) return done(err);

                var plans = planHash;
                User.find(query)
                    .populate('currentPlan')
                    .exec(function (err, users) {
                        if (err) return done(err);

                        for (var i = 0, len = users.length; i < len; i++) {
                            var user = users[i];

                            plans[user.currentPlan.plan].value++;
                        }

                        var result = [];
                        for (var prop in plans) {
                            result.push(plans[prop]);
                        }

                        done(null, result);
                    });
            });
        },
        'users_location_time': function (metrics, done) {
            var userFilter = metrics[0].filter,
                locationFilter = metrics[1].filter,
                yearFilter = metrics[2].filter;

            var date = new Date(yearFilter, 0, 1);
            var query = {
                'location.continent_code': locationFilter,
                registrationDate: {$gte: date}
            };

            User.count({
                'location.continent_code': locationFilter,
                registrationDate: {$lt: date}
            }, function (err, userBaseCount) {
                if (err) return done(err);

                User.aggregate([
                    {$match: query},
                    {$group: {
                        _id: { year: {$year: '$registrationDate'}, month: {$month: '$registrationDate'}},
                        count: {$sum: 1}}
                    }],
                    function (err, results) {
                        if (err) return done(err);

                        var monthsData = Utils.getMonthArray(date, 11, results);

                        if (userFilter === 'all')
                            for (var i = 0, len = monthsData.length; i < len; i++) {
                                var prev = monthsData[i - 1];
                                if (typeof prev === 'undefined') {
                                    monthsData[i] += userBaseCount;
                                } else {
                                    monthsData[i] += prev;
                                }
                            }

                        for (var i = 0, result = [], months = Utils.months, len = monthsData.length; i < len; i++) {
                            result.push({
                                name: months[i],
                                value: monthsData[i]
                            });
                        }

                        done(null, result);
                    });
            });
        },
        'users_time_location': function (metrics, done) {
            var userFilter = metrics[0].filter,
                yearFilter = metrics[1].filter,
                date = new Date(yearFilter, 0, 1),
                limitDate = new Date(yearFilter + 1, 0, 1);

            var result = {
                'AF': 0,
                'AS': 0,
                'OC': 0,
                'EU': 0,
                'NA': 0,
                'SA': 0
            };


            async.each(
                Object.keys(result),
                function (cont, next) {
                    User.count({registrationDate: {$gte: date, $lt: limitDate}, 'location.continent_code': cont},
                        function (err, userCount) {
                            if (err) return next(err);

                            result[cont] = userCount;
                            if (userFilter === 'new') return next();

                            User.count({registrationDate: {$lt: date}, 'location.continent_code': cont},
                                function (err, userBaseCount) {
                                    if (err) return next(err);

                                    result[cont] += userBaseCount;
                                    next();
                                });
                        });
                },
                function (err) {
                    if (err) return done(err);

                    var res = Utils.continents
                        .map(function (continent) {
                            return {
                                name: continent.name,
                                value: result[continent.iso]
                            };
                        });
                    done(null, res);
                });
        },
        'users_time_plan': function (metrics, done) {
            var userFilter = metrics[0].filter,
                yearFilter = metrics[1].filter,
                date = new Date(yearFilter, 0, 1),
                limitDate = new Date(yearFilter + 1, 0, 1);

            Plan.getAllPlansHash(function (err, planHash) {
                if (err) return done(err);

                var plans = planHash;

                async.each(
                    Object.keys(plans),
                    function (planId, next) {
                        UserPlan.find({billingDate: {$gte: date, $lt: limitDate}, plan: planId})
                            .distinct('user')
                            .exec(function (err, data) {
                                if (err) return next(err);

                                plans[planId].value = data.length;

                                if (userFilter === 'new') return next();

                                UserPlan.find({billingDate: {$lt: date}, plan: planId})
                                    .distinct('user')
                                    .exec(function (err, prevData) {
                                        if (err) return next(err);

                                        plans[planId].value += prevData.length;
                                        next();
                                    });
                            });
                    },
                    function (err) {
                        if (err) return done(err);

                        var result = [];
                        for (var planKey in plans) {
                            if (plans.hasOwnProperty(planKey)) {
                                result.push(plans[planKey]);
                            }
                        }

                        done(null, result);
                    });
            });
        },
        'plans_plan_location': function (metrics, done) {
            var usageKey = (metrics[0].filter === 'storage')
                ? 'storage'
                : 'share';
            var planFilter = metrics[1].filter;

            var query = {},
                result = {
                    'AF': {used: 0, total: 0},
                    'AS': {used: 0, total: 0},
                    'OC': {used: 0, total: 0},
                    'EU': {used: 0, total: 0},
                    'NA': {used: 0, total: 0},
                    'SA': {used: 0, total: 0}
                };

            if (planFilter === 'all paying')
                query.price = {$gt: 0};
            else if (planFilter === 'all free')
                query.price = 0;
            else
                query._id = planFilter;

            Plan.find(query, function (err, plans) {
                if (err) return done(err);
                if (!plans.length) return done(new Error('No plan found'));

                async.each(
                    plans,
                    function (plan, next) {
                        UserPlan.find({active: true, plan: plan._id})
                            .populate('user')
                            .exec(function (err, userPlans) {
                                if (err) return next(err);

                                for (var key in result) {
                                    if (result.hasOwnProperty(key)) {
                                        var continentPlans = userPlans
                                            .filter(function (userPlan) {
                                                return userPlan.user && userPlan.user.location &&
                                                    userPlan.user.location.continent_code === key;
                                            });

                                        result[key].total = (usageKey === 'storage')
                                            ? (plan.storage * continentPlans.length)
                                            : (plan.sharedQuota * continentPlans.length);

                                        for (var i = 0, len = continentPlans.length; i < len; i++) {
                                            var continentPlan = continentPlans[i];
                                            result[key].used += Math.round(Utils.bytesToMb(continentPlan.usage[usageKey]));
                                        }
                                    }
                                }
                                next();
                            });
                    },
                    function (err) {
                        if (err) return done(err);

                        var res = Utils.continents
                            .map(function (continent) {
                                var contData = result[continent.iso];

                                return {
                                    name: continent.name,
                                    value: Math.round((contData.used / contData.total) * 100)
                                }
                            });
                        done(null, res);
                    });
            });
        },
        'plans_plan_time': function (metrics, done) {
            var usageKey = (metrics[0].filter === 'storage')
                ? 'storage'
                : 'share';
            var planFilter = metrics[1].filter,
                yearFilter = metrics[2].filter,
                date = new Date(yearFilter, 0, 1),
                limitDate = new Date(yearFilter + 1, 0, 1),
                query = {},
                res = [];

            if (planFilter === 'all paying')
                query.price = {$gt: 0};
            else if (planFilter === 'all free')
                query.price = 0;
            else
                query._id = planFilter;

            Plan.find(query, function (err, plans) {
                if (err) return done(err);

                async.each(
                    plans,
                    function (plan, next) {
                        UserPlan.aggregate([
                            { $match: {
                                billingDate: {$gte: date, $lt: limitDate},
                                plan: plan._id,
                                active: true
                            }},
                            { $group: {
                                _id: {year: {$year: '$billingDate'}, month: {$month: '$billingDate'}},
                                count: {$sum: 1},
                                total: {$sum: (usageKey === 'storage') ? plan.storage : plan.sharedQuota},
                                used: {$sum: (usageKey === 'storage') ? '$usage.storage' : '$usage.share'}}
                            }],
                            function (err, results) {
                                if (err) return next(err);

                                for (var i = 0, len = results.length; i < len; i++) {
                                    var monthData = results[i];
                                    if (typeof res[monthData._id.month] === 'undefined') {
                                        res[monthData._id.month] = monthData;
                                    } else {
                                        res[monthData._id.month].used += monthData.used;
                                        res[monthData._id.month].total += monthData.total;
                                    }
                                }
                                next();
                            });
                    },
                    function (err) {
                        if (err) return done(err);

                        var result = [];
                        for (var i = 0; i < 12; i++) {
                            result.push({
                                name: Utils.months[i],
                                value: (typeof res[i + 1] === 'undefined')
                                    ? 0
                                    : Math.round((Utils.bytesToMb(res[i + 1].used) / res[i + 1].total) * 100)
                            });
                        }

                        done(null, result);
                    });
            });
        },
        'plans_location_plan': function (metrics, done) {
            var usageKey = (metrics[0].filter === 'storage')
                ? 'storage'
                : 'share';
            var locationFilter = metrics[1].filter;

            Plan.getAllPlansHash(function (err, planHash) {
                if (err) return done(err);

                var plans = planHash;
                User.find({'location.continent_code': locationFilter})
                    .populate('currentPlan')
                    .exec(function (err, users) {
                        if (err) return done(err);

                        for (var i = 0, len = users.length; i < len; i++) {
                            var user = users[i],
                                plan = plans[user.currentPlan.plan];
                            plan.total += plan[usageKey];
                            plan.used += Math.round(Utils.bytesToMb(user.currentPlan.usage[usageKey]));
                        }

                        var result = [];
                        for (var planKey in plans) {
                            if (plans.hasOwnProperty(planKey)) {
                                result.push({
                                    name: plans[planKey].name,
                                    value: Math.round((plans[planKey].used / plans[planKey].total) * 100)
                                });
                            }
                        }

                        done(null, result);
                    });
            });
        },
        'plans_time_plan': function (metrics, done) {
            var usageKey = (metrics[0].filter === 'storage')
                ? 'storage'
                : 'share';
            var yearFilter = metrics[1].filter,
                date = new Date(yearFilter, 0, 1),
                limitDate = new Date(yearFilter + 1, 0, 1);

            Plan.getAllPlansHash(function (err, planHash) {
                if (err) return done(err);

                var plans = planHash;

                async.each(
                    Object.keys(plans),
                    function (planId, next) {
                        UserPlan.find({billingDate: {$gte: date, $lt: limitDate}, plan: planId})
                            .distinct('user')
                            .exec(function (err, data) {
                                if (err) return next(err);

                                var plan = plans[planId];
                                plan.total = (usageKey === 'storage')
                                    ? (plan.storage * data.length)
                                    : (plan.share * data.length);

                                for (var i = 0, len = data.length; i < len; i++) {
                                    plan.used += Math.round(Utils.bytesToMb(data[i].usage[usageKey]));
                                }
                                next();
                            });
                    },
                    function (err) {
                        if (err) return done(err);

                        var result = [];
                        for (var planKey in plans) {
                            if (plans.hasOwnProperty(planKey)) {
                                result.push({
                                    name: plans[planKey].name,
                                    value: Math.round((plans[planKey].used / plans[planKey].total) * 100)
                                });
                            }
                        }

                        done(null, result);
                    });
            });
        },
        'plans_time_location': function (metrics, done) {
            var usageKey = (metrics[0].filter === 'storage')
                ? 'storage'
                : 'share';
            var yearFilter = metrics[1].filter,
                date = new Date(yearFilter, 0, 1),
                limitDate = new Date(yearFilter + 1, 0, 1);

            var query = {},
                result = {
                    'AF': {used: 0, total: 0},
                    'AS': {used: 0, total: 0},
                    'OC': {used: 0, total: 0},
                    'EU': {used: 0, total: 0},
                    'NA': {used: 0, total: 0},
                    'SA': {used: 0, total: 0}
                };

            Plan.find(query, function (err, plans) {
                if (err) return done(err);
                if (!plans.length) return done(new Error('No plan found'));

                async.each(
                    plans,
                    function (plan, next) {
                        UserPlan.find({active: true, billingDate: {$gte: date, $lt: limitDate}, plan: plan._id})
                            .populate('user')
                            .exec(function (err, userPlans) {
                                if (err) return next(err);

                                for (var key in result) {
                                    if (result.hasOwnProperty(key)) {
                                        var continentPlans = userPlans
                                            .filter(function (userPlan) {
                                                return userPlan.user && userPlan.user.location &&
                                                    userPlan.user.location.continent_code === key;
                                            });

                                        result[key].total += (usageKey === 'storage')
                                            ? (plan.storage * continentPlans.length)
                                            : (plan.sharedQuota * continentPlans.length);

                                        for (var i = 0, len = continentPlans.length; i < len; i++) {
                                            var continentPlan = continentPlans[i];
                                            result[key].used += Math.round(Utils.bytesToMb(continentPlan.usage[usageKey]));
                                        }
                                    }
                                }
                                next();
                            });
                    },
                    function (err) {
                        if (err) return done(err);

                        var res = Utils.continents
                            .map(function (continent) {
                                var contData = result[continent.iso];
                                return {
                                    name: continent.name,
                                    value: Math.round((contData.used / contData.total) * 100)
                                }
                            });
                        done(null, res);
                    });
            });
        }
    }
};

module.exports = Utils;

Plan = require('../models/Plan');
UserPlan = require('../models/UserPlan');
User = require('../models/User');
