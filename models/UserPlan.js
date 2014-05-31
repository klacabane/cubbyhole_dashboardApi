var mongoose = require('mongoose'),
    async = require('async'),
    Plan,
    utils;

var userPlanSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan'},
    billingDate: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
    usage: {
        storage: {type: Number, default: 0},
        share: {type: Number, default: 0},         // kb
        bandwidth: {
            upload: {type: Number, default: 0},    // kb/s
            download: {type: Number, default: 0}   // kb/s
        }
    },
    isFree: Boolean
});

userPlanSchema.statics.getYears = function (done) {
    this.aggregate([
        { $group: {
            _id: {$year: '$billingDate'}}
        }],
        function (err, results) {
            if (err) return done(err);

            var res = results.map(function (yearObj) {
                return yearObj._id;
            });

            done(null, res);
        });
};

userPlanSchema.statics.getFreeToPayingDelays = function (done) {
    var that = this;

    var res = [
        {
            name: 'Directly',
            value: 0
        },
        {
            name: '1 wk',
            value: 0
        },
        {
            name: '2-3 wks',
            value: 0
        },
        {
            name: '1-3 mos',
            value: 0
        },
        {
            name: '4+ mos',
            value: 0
        }];

    this.aggregate([
        {$match: {isFree: false}},
        {$group: {_id: '$user'}}],
        function (err, results) {
            if (err) return done(err);

            async.each(
                results,
                function (userData, next) {
                    that.model('User')
                        .findOne({_id: userData._id}, function (err, user) {
                            if (err) return next(err);

                            user.getFreeToPayingDelay(function (err, days) {
                                if (err) return next(err);

                                if (days === 0)
                                    ++res[0].value;
                                else if (days <= 7)
                                    ++res[1].value;
                                else if (days <= 21)
                                    ++res[2].value;
                                else if (days <= 90)
                                    ++res[3].value;
                                else
                                    ++res[4].value;

                                next();
                            });
                        });
                },
            function (err) {
                done(err, res);
            });
        });
};

userPlanSchema.statics.getPlansUsage = function (limitDate, monthNb, done) {
    var self = this;
    Plan.find({}, function (err, plans) {
        if (err) return done(err);

        var mostExpensivePlan = utils.getMostExpensivePlan(plans);

        var plansFn = plans.map(function (plan) {
            return function (next) {
                self.aggregate([
                    { $match: {
                        billingDate: {$gte: limitDate},
                        plan: plan._id
                    }},
                    { $group: {
                        _id: {year: {$year: '$billingDate'}, month: {$month: '$billingDate'}},
                        count: {$sum: 1},
                        totalStorage: {$sum: plan.storage},
                        totalShare: {$sum: plan.sharedQuota},
                        usedStorage: {$sum: '$usage.storage'},
                        usedShare: {$sum: '$usage.share'}}
                    }],
                    function (err, results) {
                        if (err) return next(err);

                        var usageData = utils.getMonthPercentArrays(
                            new Date(limitDate.getFullYear(), limitDate.getMonth(), limitDate.getDate()),
                            monthNb,
                            results);

                        var res = {
                            name: plan.name,
                            isFree: plan.price === 0,
                            isMostExpensive: plan._id === mostExpensivePlan,
                            storageUsage: usageData.storage,
                            sharedQuotaUsage: usageData.share
                        };

                        next(null, res);
                    });
            };
        });

        async.parallel(plansFn, done);
    });
};

module.exports = mongoose.model('UserPlan', userPlanSchema);

Plan = require('../models/Plan');
utils = require('../tools/Utils');