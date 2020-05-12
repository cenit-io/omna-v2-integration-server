module.exports = function (request, response, params) {
    // CHECK PARAMETERS
    let valid = true;

    valid = valid && (typeof params.name === 'string');
    valid = valid && (typeof params.data === 'object');

    if (!valid) throw new Error('[400]-Invalid parameters');
    // END CHECK PARAMETERS

    let path = require('path'),
        action = path.join(process.cwd(), 'libs', 'actions', params.name)

    try {
        require(action)(params.data, (data) => response.json(data));
    } catch ( e ) {
        const util = require('util');
        throw new Error(util.format("[404]-The action '%s' is not yet support.", params.name));
    }
};