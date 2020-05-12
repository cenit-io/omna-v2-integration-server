module.exports = function (req, res) {
    const
        path = require('path'),
        config = require(path.join(process.cwd(), 'data', 'config'));

    res.render('pages/index', config);
};