const connection = require("../db/dbConnection");
//const connection = require("../db/dbConnection");
const util = require("util");
const seller = async (req, res, next) => {
    const query = util.promisify(connection.query).bind(connection);
    const { token } = req.headers;
    const seller = await query("select * from users where token = ?", [token]);
    if (seller[0] && seller[0].type == "seller") {
        next();

    } else {
        res.status(403).json({
            msg: "you are not seller "
        });

    }
};

module.exports = seller;