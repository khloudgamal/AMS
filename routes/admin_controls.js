const router =require('express').Router();
const connection =require("../db/dbConnection");
//const authorized = require("../middleware/authorize");
const admin = require("../middleware/admin");
const { body, validationResult } = require("express-validator");
//const upload = require("../middleware/uploadImages");
const util = require("util"); // helper
//const fs = require("fs"); // file system
const crypto = require("crypto");
const { Router } = require('express');
const bcrypt=require("bcrypt");



// CREATE ACCOUNT [ADMIN]
router.post(
    admin,
    body("user_name")
      .isString()
      .withMessage("please enter a valid name")
      .isLength({ min: 10 })
      .withMessage("name should be at lease 10 characters"),
  
    body("email")
      .isEmail()
      .withMessage("please enter a valid email "),

      body("password")
.isLength({min: 8, max:12})
.withMessage('password should be between 8-12 character'),

body("phone")
.isMobilePhone()
.isLength({min:11,max:13})
.withMessage('please enter a valid phone number'),
async (req, res) => {
    try {
        //1-validation request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const query = util.promisify(connection.query).bind(connection);
        const checkEmailExists= await query(
            "select * from users where email = ?",
            [req.body.email]
            );

            if(checkEmailExists.length>0){
                res.status(400).json({
                    errors:[
                        {
                            "msg":"email already exists !",
                        }
                    ]
                })
            }

            const userData = {
                user_name: req.body.user_name,
                email:req.body.email,
                password:req.body.password, 
                phone_number:req.body.phone,
                token:crypto.randomBytes(16).toString("hex"),
                type: req.body.type
                
            };

           await query("insert into users set ?",userData);
           delete userData.password;
           res.status(200).json(userData);
        
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ err: err });
    }
});
    
// DELETE ACCOUNT [ADMIN]
router.delete(
    "/:user_id", // params
    admin,
    async (req, res) => {
      try {
        // 1- CHECK IF USER EXISTS OR NOT
        const query = util.promisify(connection.query).bind(connection);
        const user = await query("select * from users where user_id = ?", [
          req.params.user_id,
        ]);
        if (!user[0]) {
          res.status(404).json({ msg: "user not found !" });
        }
        // 2- REMOVE usere
      // fs.unlinkSync("./upload/" + user[0].); // delete old image
        await query("delete from users where user_id = ?", [user[0].user_id]);
        res.status(200).json({
          msg: "user delete successfully",
        });
      } catch (err) {
        res.status(500).json(err);
      }
    }
  );

  
//VIEW TRANSACTIONS RESULT
router.get(""/*,admin*/,async (req,res)=>{
    const query = util.promisify(connection.query).bind(connection);
    const transactions= await query ("SELECT * FROM users JOIN users_auctions ON users.user_id = users_auctions.user_id JOIN auctions ON auctions.id = users_auctions.auctions_id");
    const filteredTransactions = transactions.map(transaction => {
      // Delete the 'password' and 'id & token' properties from the transaction object
      delete transaction.password;
      delete transaction.id;
      delete transaction.token;

      for (let j = 0; j < transactions.length; j++) {
        if (transactions[j].price == transactions[j].officialprice) {
          transactions[j]["winner"] = true;
        }
    }
    
      // Return the modified transaction object
      return transaction;
    });
    res.json(filteredTransactions);
  });

  
//UPDATE USER ACCOUNT
router.put("/:id"
/*,admin*/
,body("user_name")
.isString()
.withMessage("please enter a valid name")
.isLength({ min: 10 })
.withMessage("name should be at lease 10 characters"),

body("email")
.isEmail()
.withMessage("please enter a valid email "),

body("password")
.isLength({min: 8, max:12})
.withMessage('password should be between 8-12 character'),

body("status")
.isInt()
.withMessage('status should be 1 or 0'),

body("type")
.isString()
.withMessage('should be string'),

body("phone_number")
.isMobilePhone()
.isLength({min:11,max:13})
.withMessage('please enter a valid phone number'), async (req, res)=>{
  try {
    //1-validation request
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //     return res.status(400).json({ errors: errors.array() });
    // }
    const query = util.promisify(connection.query).bind(connection);
    const UserId= await query(
      "select * from users where user_id = ?",
      [req.params.id])

      if(UserId.length>0){
        const checkEmailExists= await query(
          "select * from users where email = ?",
          [req.body.email]
          );
  
      const userData = {
        user_name: req.body.user_name, 
        email:req.body.email,
        password: await bcrypt.hash(req.body.password, 10),
        phone_number:req.body.phone_number,
        type: req.body.type,
        status:req.body.status
      };
      
      const sql = "UPDATE users SET user_name = ?, email = ?, password = ?,status = ?, phone_number = ?, type = ? WHERE user_id = ?";
      const values = [userData.user_name, userData.email, userData.password,userData.status,userData.phone_number, userData.type, req.params.id];
      
      await query(sql, values);
         //delete userData.password;
         res.status(200).json(userData);
      }else{
        res.status(404).json("user not found!");
      } 
}
catch (err) {
    console.log(err);
    res.status(500).json({ err: err });
}

})


//retriene all users 
router.get('/users', async (req, res) => {
  try {
    const query = util.promisify(connection.query).bind(connection);
    const users = await query('SELECT * FROM users');
    res.json(users);
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err });
  }}
) 

module.exports=router;
