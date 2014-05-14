module.exports = {
    continents: [
        {iso: 'AF', name: 'africa', display_name: 'Africa'},
        {iso: 'AS', name: 'asia', display_name: 'Asia'},
        {iso: 'OC', name: 'australia', display_name: 'Australia'},
        {iso: 'EU', name: 'europe', display_name: 'Europe'},
        {iso: 'NA', name: 'north_america', display_name: 'North America'},
        {iso: 'SA', name: 'south_america', display_name: 'South America'}
    ],
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
    },
    getContinentArray: function (data) {
        var continents = this.continents;

        var res = continents
            .map(function (continent) {
                var cObj = {name: continent.name, value: 0};

                for (var i = 0, length = data.length; i < length; i++) {
                    var cData = data[i];
                    if (cData._id.continent === continent.iso) {
                        cObj.value = cData.count;
                        break;
                    }
                }
                return cObj;
            });

        return res;
    },
    getEarliestBillingDate: function (plans) {
        if (plans.length === 1) return plans[0].billingDate;

        return plans.reduce(function (a, b) {
            return a.billingDate < b.billingDate
                ? a.billingDate
                : b.billingDate;
        });
    },
    getDelayInDays: function (from, to) {
        var timeDiff = Math.abs(to.getTime() - from.getTime());
        var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

        return diffDays;
    }
};