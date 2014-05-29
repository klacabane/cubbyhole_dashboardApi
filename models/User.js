var mongoose = require('mongoose'),
    async = require('async'),
    utils = require('../tools/Utils');

var UserPlan = require('../models/UserPlan'),
    Plan = require('../models/Plan');

var userSchema = new mongoose.Schema({
    email: {type: String, lowercase: true, trim: true},
    password: String,
    registrationDate: { type: Date, default: Date.now },
    currentPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'UserPlan' },
    verified: {type: Boolean, default: false},
    isAdmin: Boolean,
    isAllowed: {type: Boolean, default: true},
    location: mongoose.Schema.Types.Mixed
});

userSchema.methods.updatePlan = function (planName, billingDate, callback) {
    var that = this;

    async.parallel({
        newPlan: function (next) {
            Plan.findOne({name: planName}, function (err, plan) {
                if (err) return next(err);

                UserPlan.create({user: that._id, plan: plan._id, billingDate: billingDate, isFree: plan.price === 0}, next);
            });
        },
        oldPlan: function (next) {
            UserPlan.findByIdAndUpdate(that.currentPlan, {active: false}, next);
        }
    }, function (err, results) {
        if (err) return callback(err);

        that.currentPlan = results.newPlan._id;
        that.save(callback);
    });
};

userSchema.methods.getFreeToPayingDelay = function (done) {
    var that = this;

    this.model('UserPlan')
        .find({user: this._id, isFree: false}, function (err, plans) {
            if (err) return done(err);

            var billingDate = utils.getEarliestBillingDate(plans);
            done(null,
                utils.getDelayInDays(that.registrationDate, billingDate));
        });
};

userSchema.statics.getUsersByMonth = function (limitDate, monthNb, done) {
    this.aggregate([
        { $match: {registrationDate: {$gte: limitDate}}},
        { $group: {
            _id: { year: {$year: '$registrationDate'}, month: {$month: '$registrationDate'}},
            count: {$sum: 1}}
        }],
        function (err, results) {
            if (err) return done(err);


            var res = (typeof monthNb === 'number')
                ? utils.getMonthArray(limitDate, monthNb, results)
                : (results[0]) ? results[0].count : 0;

            done(null, res);
        });
};

userSchema.statics.getUsersByLocation = function (done) {
    this.aggregate([
        {$match: {'location': {$exists: true}}},
        { $group: {
            _id: {continent: '$location.continent_code'},
            count: {$sum: 1}}
        }],
        function (err, results) {
            done(err, utils.getContinentArray(results));
        });
};

module.exports = mongoose.model('User', userSchema);