const mongoose = require("mongoose");
require("dotenv").config();
const { DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_URL } = process.env;

mongoose
    .connect(`${DB_URL}`)
    .then(() => {
        console.log("Connected to database successfully...");
    })
    .catch((err) => console.log(err));
