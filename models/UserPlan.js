var mongoose = require('mongoose'),
    async = require('async'),
    Plan = require('../models/Plan');

var userPlanSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan'},
    billingDate: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
    usage: {
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

module.exports = mongoose.model('UserPlan', userPlanSchema);