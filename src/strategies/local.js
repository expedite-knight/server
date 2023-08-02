const passport = require("passport");
const { Strategy } = require("passport-local");
const User = require("../models/User");
const { comparePassword } = require("../utils/helper");

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        //if a user record gets deleted it after they have signed in, they will
        //crash the server if they use the same session id and call an endpoint
        if (!user) throw new Error("User not found");
        done(null, user);
    } catch (err) {
        console.log(err);
        done(err, null);
    }
});

passport.use(
    new Strategy(
        {
            usernameField: "email",
        },
        async (email, password, done) => {
            try {
                if (!email || !password) {
                    throw new Error("Missing Credentials");
                }
                const userDB = await User.findOne({ email });
                console.log(userDB);
                if (!userDB) throw new Error("User not found");
                if (comparePassword(password, userDB.password)) {
                    console.log("Authenticated Successfully!");
                    done(null, userDB);
                } else {
                    console.log("Failed to Authenticate");
                    done(null, null);
                }
            } catch (err) {
                console.log(err);
                done(err, null);
            }
        }
    )
);
