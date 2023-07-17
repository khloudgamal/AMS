const router =require('express').Router();
const connection =require("../db/dbConnection");
const { body, validationResult}=require('express-validator');
const util = require("util");
const bcrypt=require("bcrypt");
const crypto = require("crypto");


//login
router.post("/login",
    body("email").isEmail().withMessage("please enter valid email !"),
    body("password").isLength({ min: 8, max: 12 }).withMessage("please password should be from 8 to 12 character !"),
    async (req, res) => {
        try {
            //validation req 
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            //email exist
            const query = util.promisify(connection.query).bind(connection);//transform query mysql->promise to use await/async
            const checkemailexist = await query("select * from users where email = ?", [req.body.email]);
            if (checkemailexist.length == 0) {
                res.status(400).json({ errors: [{ "msq": "email or pass not found" }] });
            }
            
            // const checkPassword = req.body.password == checkemailexist[0].password;
            const checkPassword = await bcrypt.compare(
                req.body.password,
                checkemailexist[0].password);

            if (checkPassword&&checkemailexist[0].type=="bidder") {
                delete checkemailexist[0].password;

                res.status(200).json(checkemailexist[0]);
            } 
            else if(checkPassword&&checkemailexist[0].type=="seller") {
                delete checkemailexist[0].password;

                res.status(200).json(checkemailexist[0]);
            } 
            else if(checkemailexist[0].type==="admin"){
                res.json(checkemailexist[0])
            }
            else {
                res.status(404).json({
                    errors: [
                        {
                            msg: "email or password not found !",
                        },
                    ],
                });
            }
        }
        //$2b$10$RRokkmE
        // 123456789

        catch (err) {
            res.status(500).json({ err: err });
        }
    });

//registration
router.post
("/register",
body("email")
.isEmail()
.withMessage('please enter a valid email'),

body("user_name")
.isString()
.withMessage('please enter a valid user name')
.isLength({min: 10, max:20})
.withMessage("name should be between 10-20 character"),


body("password")
.isLength({min: 8, max:12})
.withMessage('password should be between 8-12 character'),

body("phone")
.isMobilePhone()
.isLength({min:11,max:13})
.withMessage('please enter a valid phone number'),

async function (req, res) {
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
                password: await bcrypt.hash(req.body.password, 10),
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



module.exports=router;
