var mongoose = require('mongoose'),
    UserPlan = require('../models/UserPlan'),
    utils = require('../tools/Utils');

var planSchema = new mongoose.Schema({
    name : String,
    price : Number,
    duration : Number,
    storage : Number,
    sharedQuota : Number,
    isMutable: {type: Boolean, default: true}
});

planSchema.methods.getUsers = function (done) {
    this.model('UserPlan')
        .count({plan: this._id, active: true})
        .exec(done);
};

planSchema.statics.getPlanTypeUsers = function (type, limitDate, monthNb, done) {
    var query = type === 'free'
        ? {price: 0}
        : {price: {$gt: 0}};

    this.find(query, function (err, plans) {
        if (err) return done(err);

        plans.forEach(function (plan, index) { plans[index] = plan._id; });

        UserPlan.aggregate([
            { $match: {
                billingDate: {$gte: limitDate},
                plan: {$in: plans}
            }},
            { $group: {
                _id: { year: {$year: '$billingDate'}, month: {$month: '$billingDate'}},
                count: {$sum: 1}}
            }],
            function (err, results) {
                if (err) return done(err);

                var months = utils.getMonthArray(limitDate, monthNb, results);

                done(null, months);
            });
    });
};

module.exports = mongoose.model('Plan', planSchema);