module.exports = {
    continents: [
        {iso: 'AF', name: 'africa', display_name: 'Africa'},
        {iso: 'AS', name: 'asia', display_name: 'Asia'},
        {iso: 'OC', name: 'australia', display_name: 'Australia'},
        {iso: 'EU', name: 'europe', display_name: 'Europe'},
        {iso: 'NA', name: 'north_america', display_name: 'North America'},
        {iso: 'SA', name: 'south_america', display_name: 'South America'}
    ],
    getMonthCount: function (data, date) {
        var count = 0;
        for (var i = 0, length = data.length; i < length; i++) {
            var monthData = data[i];
            if (monthData._id.year === date.year && monthData._id.month === date.month) {
                count = monthData.count;
                break;
            }
        }
        return count;
    },
    getMonthPercentage: function (data, date) {
        var res = {};
        for (var i = 0, length = data.length; i < length; i++) {
            var monthData = data[i];
            if (monthData._id.year === date.year && monthData._id.month === date.month) {
                res.storage = Math.round(
                    (this.bytesToMb(monthData.usedStorage) / monthData.totalStorage) * 100);
                res.share = Math.round(
                    (this.bytesToMb(monthData.usedShare) / monthData.totalShare) * 100);
                break;
            }
        }
        return res;
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
    getMonthPercentArrays: function (limitDate, monthNb, data) {
        var months = {
            storage: [],
            share: []
        };
        for (var i = 0; i <= monthNb; i++) {
            var monthData = this.getMonthPercentage(data,
                {
                    year: limitDate.getFullYear(),
                    month: limitDate.getMonth() + 1
                });
            months.storage.push(monthData.storage || 0);
            months.share.push(monthData.share || 0);

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
    },
    getMostExpensivePlan: function (plans) {
        var highestPrice = 0,
            highestPlan;

        for (var i = 0, length = plans.length; i < length; i++) {
            var p = plans[i];
            if (p.price > highestPrice) {
                highestPrice = p.price;
                highestPlan = p._id;
            }
        }
        return highestPlan;
    },
    bytesToMb: function (bytes) {
        if (bytes == 0) return 0;
        return (bytes/1000000).toFixed(2);
    }
};