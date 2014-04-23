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
     }
};