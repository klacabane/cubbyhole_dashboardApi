var mongoose = require('mongoose'),
    UserPlan = require('../models/UserPlan');

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

module.exports = mongoose.model('Plan', planSchema);