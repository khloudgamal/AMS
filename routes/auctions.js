const router =require('express').Router();
const util = require("util");
const bidder = require("../middleware/bidder");
const { body, validationResult } = require("express-validator");
const seller = require('../middleware/seller');
const { query } = require("express");
const upload = require("../middleware/uploadImages");
const fs = require("fs");
const moment = require('moment');
const connection = require('../db/dbConnection');


//-------------------->bidders apis<-------------------

//list&search for auctions
router.get("",bidder, async(req, res)=>{
    const query = util.promisify(connection.query).bind(connection);

    let search = "";
  if (req.query.search) {
    // QUERY PARAMS
    search = `where name LIKE '%${req.query.search}%' or category LIKE '%${req.query.search}%' or description LIKE '%${req.query.search}%'`;
  }

    const auctions = await query(`select * from auctions ${search}`);
    auctions.map((auction )=>{
        auction.image="http://"+ "localhost:4000/"+ auction.image;
    });
    res.status(200).json(auctions);
   
});

//bid

router.post("/bid/:id",
  // Include bidder middleware if necessary
  body("officialprice")
    .isNumeric()
    .withMessage("Please enter a valid price"),
  async (req, res) => {
    const query = util.promisify(connection.query).bind(connection);
    const { token } = req.headers;
    const bidder_id = await query('select * from users where token = ?', [token]);
    const auctions  = await query('select * from auctions where id = ?', [req.params.id]);

    const startDate = (await query("SELECT start_date FROM auctions where id = ?", [req.params.id]))[0].start_date;
    const endDate = (await query("SELECT end_date FROM auctions where id = ?", [req.params.id]))[0].end_date;
    const now = new Date();       

    if (now > startDate && now < endDate) {
      if (req.body.officialprice > auctions[0].officialprice) {
        // await query(`UPDATE auctions SET officialprice = ? WHERE id = ?`, [req.body.officialprice, req.params.id]);
        await query(`UPDATE auctions SET officialprice = ? WHERE id = ?`, [req.body.officialprice, req.params.id]);
        const updatedAuction = await query(`SELECT officialprice FROM auctions WHERE id = ?`, [req.params.id]);
        res.json(updatedAuction[0].officialprice);
        await query(`INSERT INTO users_auctions (user_id, auctions_id, price) VALUES (?, ?, ?)`,
         [bidder_id[0].user_id, req.params.id, req.body.officialprice]);
         const insert = await query(`SELECT officialprice FROM auctions WHERE id = ?`, [req.params.id]);
         res.json(insert[0].officialprice);
      } else {
        res.status(400).json("Please enter a bigger price");
      }
    } else {
      res.status(404).json("This auction is not currently active");
    }
  }
);


 //00000000000000000000000000 



//view won auctions&history
// router.get("/view_wen/:id",bidder,async (req, res)=>{
//   const query = util.promisify(connection.query).bind(connection);
//   const own_auctions= await query("SELECT * FROM users JOIN users_auctions ON users.user_id = users_auctions.user_id JOIN auctions ON auctions.id = users_auctions.auctions_id where users_auctions.user_id = ? or users_auctions.user_id=auctions.id ",[req.params.id]);
//   const sellername = await query(`SELECT * FROM users JOIN users_auctions ON users.user_id = users_auctions.user_id JOIN auctions ON auctions.id = users_auctions.auctions_id WHERE users_auctions.auctions_id = ${own_auctions[0].auctions_id}`)
//   for (let j = 0; j < own_auctions.length; j++) {
//     if (own_auctions[j].price == own_auctions[j].officialprice) {
//       own_auctions[j]["winner"] = true;
//     }
// } 
//   res.json(sellername[0]);
// });


router.get("/view_wen/:id",bidder,async (req, res)=>{
    const query = util.promisify(connection.query).bind(connection);
    const own_auctions= await query("SELECT name,image,start_date,end_date,price,officialprice,user_name,phone_number,type FROM users JOIN users_auctions ON users.user_id = users_auctions.user_id JOIN auctions ON auctions.id = users_auctions.auctions_id where users_auctions.user_id = ?",[req.params.id]);

    for (let j = 0; j < own_auctions.length; j++) {
      if (own_auctions[j].price == own_auctions[j].officialprice) {
        own_auctions[j]["winner"] = true;
      }
  }
    res.json(own_auctions);
  });



//-------------------->sellers apis<-------------------

//SELLER VIEW HISTORY   
router.get("/view1/:id",/*seller,*/async (req, res) => {
  const query = util.promisify(connection.query).bind(connection);
  const auction_id= await query("select * from users_auctions where user_id = ?",[req.params.id]);
  const result = [];

    for (let i = 0; i < auction_id.length; i++) {
        const own_history = await query("SELECT * FROM users JOIN users_auctions ON users.user_id = users_auctions.user_id JOIN auctions ON auctions.id = users_auctions.auctions_id where users_auctions.auctions_id = ? ", auction_id[i].auctions_id)
        for (let j = 0; j < own_history.length; j++) {
            if (own_history[j].price == own_history[j].officialprice) {
                own_history[j]["winner"] = true;
                own_history[j]["thewinner"]=own_history[j].user_name;  
            }
        }
        result.push(own_history); 
    }
    res.json(result);
});


///view new auctions

router.get("/updateauctions/:id", async(req,res) =>{
    const query = util.promisify(connection.query).bind(connection);
  const auction_id= await query("select * from users_auctions where user_id = ?",[req.params.id]);
  const result = [];
  for (let i = 0; i < auction_id.length; i++) {
    const auctions = await query("SELECT * FROM auctions where id = ? ", auction_id[i].auctions_id);
     result.push(auctions);
}
        res.json(result);
}
);

//create Auction
router.post("/create", upload.single("image")
    , body("name").isString().withMessage("please enter a valid Auction").isLength({ min: 3 }).withMessage(" name should be at least 3 character")
    , body("description").isString().withMessage("please enter a valid description").isLength({ min: 2 }).withMessage(" name should be at least 2 character")
    , body("category").isString().withMessage("please enter a valid category").isLength({ min: 2 }).withMessage(" name should be at least 2 character")
    , body("start_date").custom(value => {
        const date = moment(value, "YYYY-MM-DD HH:mm:ss", true).toDate();
        if (!date || isNaN(date.getTime())) {
            throw new Error("Please enter a valid start date and time in the format YYYY-MM-DD HH:mm:ss");
        }
        return true;
    })
        .withMessage("Please enter a valid start date and time in the format YYYY-MM-DD HH:mm:ss")
    , body("end_date").custom(value => {
        const date = moment(value, "YYYY-MM-DD HH:mm:ss" , true).toDate(); 
        if (!date || isNaN(date.getTime())) {
            throw new Error("Please enter a valid start date and time in the format YYYY-MM-DD HH:mm:ss");
        }
        return true;
    })
        .withMessage("Please enter a valid start date and time in the format YYYY-MM-DD HH:mm:ss")
    , body("officialprice").isInt().withMessage("please enter valid officialprice ")
    , seller, async (req, res) => {
        try {
            //validation req 
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            //validation image
            if (!req.file) {
                return res.status(400).json({ errors: [{ msg: "image is require" }] })
            }
            //preper object Auction to save
            const Auction = {
                name: req.body.name,
                category: req.body.category,
                description: req.body.description,
                Image: req.file.filename,
                start_date: new Date(req.body.start_date),
                end_date: new Date(req.body.end_date),
                officialprice: req.body.officialprice
            };  
            //insert Auction into db
            const query = util.promisify(connection.query).bind(connection);
            await query("insert into auctions set ?  ", Auction);
            const Auction_id = await query("SELECT id FROM auctions ORDER BY id DESC LIMIT 1  ")
            const { token } = req.headers;
            const user_id = await query('select * from users where token = ?', [token])
            await query(`INSERT INTO users_auctions (user_id, auctions_id,price) VALUES (${user_id[0].user_id}, ${Auction_id[0].id},${req.body.officialprice})`);
            res.status(200).json({
                msg: "create successfully",
                //   msg: req.file, 
            });
        } catch (err) {
            res.status(500).json(err);
        }


    });

//update auction    
router.put("/:id" , seller,  upload.single("image"),
    body("name")
        .isString()
        .withMessage("please enter a valid Auction")
        .isLength({ min: 10 })
        .withMessage(" name should be at least 10 character")
      , body("description")
    .isString()
    .withMessage("please enter a valid description")
    .isLength({ min: 15 })
    .withMessage(" name should be at least 15 character")

    , body("category")
    .isString()
    .withMessage("please enter a valid category")
    .isLength({ min: 2 })
    .withMessage(" name should be at least 2 character")

    , body("start_date")
    .custom(value => {
        const date = moment(value, "YYYY-MM-DD HH:mm:ss", true).toDate();
        if (!date || isNaN(date.getTime())) {
            throw new Error("Please enter a valid start date and time in the format YYYY-MM-DD HH:mm:ss  ");
        }
        return true;
    })
        .withMessage("Please enter a valid start date and time in the format YYYY-MM-DD HH:mm:ss pk")

    , body("end_date")
    .custom(value => {
        const date = moment(value, "YYYY-MM-DD HH:mm:ss", true).toDate();
        if (!date || isNaN(date.getTime())) {
            throw new Error("Please enter a valid start date and time in the format YYYY-MM-DD HH:mm:ss ");
        }
        return true;
    })
        .withMessage("Please enter a valid start date and time in the format YYYY-MM-DD HH:mm:ss pk")
    , body("officialprice").isInt().withMessage("please enter valid officialprice ")
    , async (req, res) => {
        try {
            const query = util.promisify(connection.query).bind(connection);
            const { token } = req.headers;
            const user = await query('SELECT user_id FROM users WHERE token = ?', [token]);

            // check if the seller owns the auction being updated
            const auction = await query(
                "SELECT * FROM auctions join users_auctions on auctions.id=users_auctions.auctions_id join users on users_auctions.user_id=users.user_id WHERE auctions.id = ? AND users.user_id = ?",
                [req.params.id, user[0].user_id]
            );

            if (!auction[0]) {
                return res.status(404).json({ msg: "Auction not found or you are not the owner." })
            }

            // prepare object auction to save
            const auctionObj = {
                name: req.body.name,
                category: req.body.category,
                description: req.body.description,
                start_date: new Date(req.body.start_date),
                end_date: new Date(req.body.end_date),
                officialprice: req.body.officialprice
            }

            // set new image if provided
            if (req.file) {
                auctionObj.image = req.file.filename;
                // delete old image
                fs.unlinkSync("./upload/" + auction[0].image);
            }
       
            // update the auction
            await query("UPDATE auctions SET ? WHERE id = ?", [auctionObj, req.params.id]);

            // handle updating the official price (not sure what this code is doing exactly)
            if (req.body.officialprice != auction[0].price) {
                await query("UPDATE users_auctions SET price = ? WHERE user_id = ? AND auctions_id = ?", [req.body.officialprice, user[0].user_id, req.params.id]);
            }

            res.status(200).json({ msg: "updated successfully" });
        } catch (err) {
            res.status(500).json(err);
        }
    });

    
//delete Auction
router.delete("/:id", /*seller,*/ async (req, res) => {
    try {
        const query = util.promisify(connection.query).bind(connection);
        const { token } = req.headers;
        const user = await query('SELECT user_id FROM users WHERE token = ?', [token]);
        //check if Auction exist
        const Auction = await query("select * from auctions where id = ? ", [req.params.id,]);
        if (!Auction[0]) {
            res.status(404).json({ msg: "Auction not found !" })
        }


            // check if the seller owns the auction being updated
            const auction = await query(
              "SELECT * FROM auctions join users_auctions on auctions.id=users_auctions.auctions_id join users on users_auctions.user_id=users.user_id WHERE auctions.id = ? ",/*AND users.user_id = ?*/
              [req.params.id/*, user[0].user_id*/]
          );

          if (!auction[0]) {
              return res.status(404).json({ msg: "Auction not found or you are not the owner." })
          }
        // remove image
        fs.unlinkSync("./upload/" + auction[0].image);
        //delete query
        await query("delete from auctions where id = ?", [Auction[0].id]);
        

        res.status(200).json({
            msg: "deleted successfully",

        });
    } catch (err) {
        res.status(500).json(err);
    }


});  

module.exports=router;



    