const Analytic = require("../models/Analytic");
const { RES_TYPES } = require("../utils/helper");

const processPageView = async (page) => {
    const pageDb = await Analytic.findOne({ page: page }).catch((err) =>
        console.log(err)
    );
    if (pageDb) {
        pageDb.numOfViews += 1;
        await pageDb.save();
        return RES_TYPES.SUCCESS;
    } else {
        const createdPage = await Analytic.create({ page: page });
        return RES_TYPES.CREATED;
    }
};

module.exports = {
    processPageView,
};
