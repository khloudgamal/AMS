const connection = require("../db/dbConnection");
const util = require("util");

const bidder = async (req, res, next)=>
{
    const query = util.promisify(connection.query).bind(connection); // transform query mysql --> promise to use [await/async]
    const { token } = req.headers;
    
    const user = await query("select * from users where token =? ", [token] );
     if(user[0]&&user[0].type=="bidder"){
        next();
     } else{
        res.status(403).json({
            msg : "you are not authorized to access this route"
        })

     }
};
module.exports= bidder;