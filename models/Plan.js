var mongoose = require('mongoose');
var async = require('async');
var UserPlan = require('../models/UserPlan');
var Utils = require('../tools/Utils');

var planSchema = new mongoose.Schema({
    name : String,
    price : Number,
    duration : Number,
    storage : Number,
    sharedQuota : Number,
    isMutable: {type: Boolean, default: true}
});

planSchema.methods.getUsers = function (limitDate, monthNb, done) {
    if (typeof limitDate === 'function') {
        done = limitDate;

        this.model('UserPlan')
            .count({plan: this._id, active: true})
            .exec(done);
    } else {
        this.model('UserPlan').aggregate([
            { $match: {
                billingDate: {$gte: limitDate},
                plan: this._id
            }},
            { $group: {
                _id: {year: {$year: '$billingDate'}, month: {$month: '$billingDate'}},
                count: {$sum: 1}}
            }],
            function (err, results) {
                if (err) return done(err);

                var res;
                if (typeof monthNb === 'number') {
                    res = Utils.getMonthArray(
                        new Date(limitDate.getFullYear(), limitDate.getMonth(), limitDate.getDate()),
                        monthNb,
                        results);
                } else {
                    res = (results[0]) ? results[0].count : 0;
                }

                done(null, res);
            });
    }
};

planSchema.statics.getPlanTypeUsers = function (type, limitDate, monthNb, done) {
    var that = this;
    var query = (type === 'free')
        ? {price: 0}
        : {price: {$gt: 0}};

    this.find(query, function (err, plans) {
        if (err) return done(err);

        plans.forEach(function (plan, index) { plans[index] = plan._id; });

        that.model('UserPlan').aggregate([
            { $match: {
                active: true,
                billingDate: {$gte: limitDate},
                plan: {$in: plans}
            }},
            { $group: {
                _id: { year: {$year: '$billingDate'}, month: {$month: '$billingDate'}},
                count: {$sum: 1}}
            }],
            function (err, results) {
                if (err) return done(err);

                var res = (typeof monthNb === 'number')
                    ? Utils.getMonthArray(limitDate, monthNb, results)
                    : (results[0]) ? results[0].count : 0;


                done(null, res);
            });
    });
};

planSchema.statics.getPlansDistribution = function (limitDate, monthNb, done) {
    this.find({}, function (err, plans) {
        if (err) return done(err);

        var results = [];

        async.each(
            plans,
            function (plan, callback) {
                plan.getUsers(limitDate, monthNb, function (err, months) {
                    var planData = {
                        name: plan.name,
                        isFree: plan.price === 0,
                        data: months
                    };
                    results.push(planData);

                    callback(err);
                });
            },
            function (err) {
                done(err, results);
            });
    });
};

module.exports = mongoose.model('Plan', planSchema);