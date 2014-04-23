module.exports = {
    parseLimitDate: function (req, res, next) {
        var limitDate = new Date();
        var nMonth = parseInt(req.params.nMonth, 10) - 1;
        req.monthNb = nMonth >= 0 ? nMonth : 11;

        limitDate.setMonth(limitDate.getMonth() - req.monthNb);
        limitDate.setDate(1);
        limitDate.setHours(24,0,0,0);

        req.limitDate = limitDate;

        next();
    }
};