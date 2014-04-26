var mongoose = require('mongoose'),
    utils = require('../tools/Utils');

var userSchema = new mongoose.Schema({
    email: {type: String, lowercase: true, trim: true},
    password: String,
    registrationDate: { type: Date, default: Date.now },
    currentPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'UserPlan' },
    verified: {type: Boolean, default: false},
    isAdmin: Boolean,
    isAllowed: {type: Boolean, default: true}
});


userSchema.statics.getUsersByMonth = function (limitDate, monthNb, done) {
    this.aggregate([
        { $match: {registrationDate: {$gte: limitDate}}},
        { $group: {
            _id: { year: {$year: '$registrationDate'}, month: {$month: '$registrationDate'}},
            count: {$sum: 1}}
        }],
        function (err, results) {
            if (err) return done(err);

            var months = utils.getMonthArray(limitDate, monthNb, results);

            done(null, months);
        });
};

module.exports = mongoose.model('User', userSchema);