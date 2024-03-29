module.exports = {
    setHeaders: function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With, X-Cub-AuthToken, Content-Type");
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

        next();
    },
    parseLimitDate: function (req, res, next) {
        var limitDate = new Date();
        var monthParam = req.params['nMonth'];

        if (monthParam !== 'today') {
            var nMonth = parseInt(monthParam, 10) - 1;
            req.monthNb = nMonth >= 0 ? nMonth : 11;

            limitDate.setMonth(limitDate.getMonth() - req.monthNb);
            limitDate.setDate(1);
        }

        limitDate.setHours(0,0,0);

        req.limitDate = limitDate;

        next();
    }
};