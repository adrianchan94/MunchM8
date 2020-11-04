
require('dotenv').config();

const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const db = require('knex')({
    client: 'postgresql',
    connection: {
        database: process.env.DB_NAME,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD
    }
});

function initialize(passport) {

    const authenticateUser = (username, password, done) => {

    let query = db.select('*').from('users').where("username", username);

        query
            .then((rows) => {

                if (rows.length > 0) {
                    const user = rows[0];

                    bcrypt.compare (password, user.password, (err, isMatch) => {
                        if (err) {
                            throw err;
                        }

                        if (isMatch) {
                            return done(null, user);
                        } else {
                            return done(null, false, { message: "Password is not correct" })
                        }
                    });
                } else {
                    console.log('username register')
                    return done(null, false, { message: "Username is not registered" })
                }
            })
            .catch((error) => {
                throw error;
            })
    }  

    passport.use(
            new LocalStrategy({
                usernameField: 'username',
                passwordField: 'password'  
            },
                authenticateUser
            )
        );

        passport.serializeUser((user, done) => done(null, user.id))

        passport.deserializeUser((id, done) => {

        let query = db.select('*').from('users').where("id", id);

            query
                .then((row) => {
                    return done(null, row[0])
                })
                .catch((error) => {
                    throw error;
                })
        })
 
}

module.exports = initialize;