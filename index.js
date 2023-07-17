//========= initialize express app
const express = require("express");
const app = express();

//global middleware

app.use(express.json());
app.use(express.urlencoded({extended:true}));//to access url form encoded
app.use(express.static("upload"));

const cors = require('cors');
app.use(cors());//allow http requests local hosts(ربط بين الفرونت و الباك)


 
//require modules
const auth= require('./routes/auth');
const auctions= require('./routes/auctions');
const admin_controls= require('./routes/admin_controls');

//run the app

app.listen(4000,'localhost',()=>{
    console.log("server is running");
});

//api routes(end points)
app.use('/auth',auth);
app.use('/auctions',auctions);
app.use('/admin_controls',admin_controls);
