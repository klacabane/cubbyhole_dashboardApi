module.exports = {
    getMonthCount: function (data, d) {
        var count = 0;
        for (var i = 0, length = data.length; i < length; i++) {
            var monthData = data[i];
            if (monthData._id.year === d.year && monthData._id.month === d.month) {
                count = monthData.count;
                break;
            }
        }

        return count;
    },
    getMonthArray: function (limitDate, monthNb, data) {
        var months = [];
        for (var i = 0; i <= monthNb; i++) {
            var monthCount = this.getMonthCount(data,
                {
                    year: limitDate.getFullYear(),
                    month: limitDate.getMonth() + 1
                });
            months.push(monthCount);

            limitDate.setMonth(limitDate.getMonth() + 1);
        }

        return months;
    }

};