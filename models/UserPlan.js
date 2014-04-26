var mongoose = require('mongoose'),
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
    }
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

module.exports = mongoose.model('UserPlan', userPlanSchema);