require('dotenv').config();

const http = require("http");
const express = require('express');
const app = express();
const hbs = require('express-handlebars');
const session = require('express-session');
const path = require("path");
const flash = require('express-flash');
const passport = require('passport');
const bodyParser = require('body-parser');
const socketio = require("socket.io");
const server = http.createServer(app);
const io = socketio(server);
const formatMessage = require('./utils/messages');
const schedule = require('node-schedule');

let nowaday = new Date().toISOString().slice(0, 10).replace(/-/gi, "")

const nodemailer = require("nodemailer");

const initializePassport = require("./passportConfig")
initializePassport(passport);

app.use(express.json())


const bcrypt = require('bcrypt');
const db = require('knex')({
    client: 'postgresql',
    connection: {
        database: process.env.DB_NAME,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD
    }
});

const {
    userJoin,
    getCurrentUser,
    userLeave,
    getRoomUsers,
} = require("./utils/users");
const { RSA_NO_PADDING } = require('constants');
const { now } = require('moment');

// Body Parser Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'))
const botName = "ChatCord Bot";

app.engine('handlebars', hbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.get('/', checkNotAuthenticated, (req, res) => {
    res.redirect('/login')
})

app.get('/main/:username', checkNotAuthenticated, (req, res) => {
    const uName = req.params.username
    res.render('index', { uName });
})

app.get('/login', checkAuthenticated, (req, res) => {
    res.render('login');
})

let user = [];

app.post('/login', passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true
}), (req, res) => {

    const { username, password } = req.body;

    array = [];
    array.push(username);

    console.log("something");

    res.redirect(`/main/${username}`)
})

app.get('/logout', (req, res) => {
    req.logOut();
    req.flash('success_msg', 'Successfully logged out');
    res.redirect('/login');

})

//register page and form validation

app.get('/register', checkAuthenticated, (req, res) => {
    res.render('register');
})

app.post('/register', async (req, res) => {
    let { name, username, email, password, password2 } = req.body;

    let errors = [];

    if (!name || !email || !username || !email || !password || !password2) {
        errors.push({ message: "Please enter all fields" })
    }

    if (password.length < 6) {
        errors.push({ message: "Password should be at least 6 characters long" })
    }

    if (password !== password2) {
        errors.push({ message: "Passwords Should Match" })
    }

    if (errors.length > 0) {
        console.log(errors)

        res.render('register', {
            error: true,
            errors
        })
    } else {

        let hashedPassword = await bcrypt.hash(password, 10)
        console.log(hashedPassword);

        let query = db.select('*').from('users').where("username", username);

        query.then((rows) => {

            if (rows.length > 0) {
                errors.push({ message: "username already registered" });
                res.render('register', { error: true, errors })
            } else {
                db("users")
                    .insert({
                        name: name,
                        username: username,
                        email: email,
                        password: hashedPassword,
                        rating: 0,
                        get_rated: 0
                    })
                    .then((row) => {
                        req.flash("success", "Registration Successful. Please Login")
                        res.redirect('/login')
                    })
            }
        }).catch((error) => {
            throw error;
        })
    }
})

//functions to check if user is authenticated - if not, user will be redirected to login/main page

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        let authUser = user[0];

        console.log(authUser)

        return res.redirect(`/main/${authUser}`);
    }
    next();
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('login_msg', 'Please login to continue');
    res.redirect("/login");
}

app.get('/secondary/:name', checkNotAuthenticated, (req, res) => {

    const uName = req.params.name;
    console.log(uName)

    let query = db.select('*').from('users').where("username", uName);

    query
        .then((rows) => {
            let info = rows[0]

            const { cover_photo_URL, about_me, interests } = info

            if (!cover_photo_URL) {

                console.log("missing info")

                res.render('calendar', {
                    layout: 'secondary',
                    uName,
                    info,
                    missingURL: true
                })
            } else if (!about_me) {

                res.render('calendar', {
                    layout: 'secondary',
                    uName,
                    info,
                    missing_about_me: true
                })

            } else if (!interests) {
                res.render('calendar', {
                    layout: 'secondary',
                    uName,
                    info,
                    missing_interests: true
                })
            } else {

                console.log(info.about_me)
                console.log(info)

                res.render('calendar', {
                    layout: 'secondary',
                    uName,
                    info
                })

            }
        })
        .catch((err) => {
            throw err;
        })
});

app.get('/secondary', checkNotAuthenticated, (req, res) => {
    res.flash()
})

//socket.io chat

app.get('/chat/:name/:realName/:id', (req, res) => {
    const uName = req.params.name;
    const realName = req.params.realName
    const roomId = req.params.id;

    db.from('pending_tables')
        .innerJoin('pending_tables_guests', 'pending_tables.id', 'pending_tables_guests.pending_tables_id')
        .then((data) => {

            let filter = data.filter((rowfilter) => {
                return (rowfilter.pending_tables_id == roomId)
            })[0];


            let g1 = true;
            let g2 = true;
            let g3 = true;
            let g4 = true;
            let g5 = true;

            if (filter.guest_1 == null) {
                g1 = false;
            };

            if (filter.guest_2 == null || filter.guest_2 == "not_available") {
                g2 = false;
            };

            if (filter.guest_3 == null || filter.guest_3 == "not_available") {
                g3 = false;
            };

            if (filter.guest_4 == null || filter.guest_4 == "not_available") {
                g4 = false;
            };

            if (filter.guest_5 == null || filter.guest_5 == "not_available") {
                g5 = false;
            };

            res.render('chat', {
                layout: 'secondary', filter, uName, realName, roomId, guest_1: g1,
                guest_2: g2, guest_3: g3, guest_4: g4, guest_5: g5
            });
        })

});

app.post('/chat/exit/:name', (req, res) => {

    const uName = req.params.name;
    const { username, room } = req.body;

    db("pending_tables_guests")
        .select('*')
        .where("pending_tables_id", room)
        .then((data) => {

            let users = data[0]

            db("pending_tables")
                .select("*")
                .where("id", room)
                .then((data) => {
                    if (data[0].table_confirmed == true) {
                        req.flash("table_confirmed_byHost", "The hosted has already confirmed this table.")
                        res.redirect("back")
                    } else {

                        if (username == users.guest_1) {
                            db("pending_tables_guests")
                                .select("*")
                                .where("pending_tables_id", room)
                                .update({
                                    guest_1: null
                                })
                                .then(
                                    db("pending_tables")
                                        .select("*")
                                        .where("id", room)
                                        .then((data) => {
                                            let newNumber = users.number_of_guests - 1;

                                            db("pending_tables")
                                                .select("*")
                                                .where("id", room)
                                                .update({
                                                    number_of_guests: newNumber
                                                })
                                                .then(
                                                    res.redirect(`/places/${uName}`)
                                                )
                                        })
                                )
                        } else if (username == users.guest_2) {
                            db("pending_tables_guests")
                                .select("*")
                                .where("pending_tables_id", room)
                                .update({
                                    guest_2: null
                                })
                                .then(
                                    db("pending_tables")
                                        .select("*")
                                        .where("id", room)
                                        .then((data) => {
                                            let newNumber = users.number_of_guests - 1;

                                            db("pending_tables")
                                                .select("*")
                                                .where("id", room)
                                                .update({
                                                    number_of_guests: newNumber
                                                })
                                                .then(
                                                    res.redirect(`/places/${uName}`)
                                                )
                                        })
                                )
                        } else if (username == users.guest_3) {
                            db("pending_tables_guests")
                                .select("*")
                                .where("pending_tables_id", room)
                                .update({
                                    guest_3: null
                                })
                                .then(
                                    db("pending_tables")
                                        .select("*")
                                        .where("id", room)
                                        .then((data) => {
                                            let newNumber = users.number_of_guests - 1;

                                            db("pending_tables")
                                                .select("*")
                                                .where("id", room)
                                                .update({
                                                    number_of_guests: newNumber
                                                })
                                                .then(
                                                    res.redirect(`/places/${uName}`)
                                                )
                                        })
                                )
                        } else if (username == users.guest_4) {
                            db("pending_tables_guests")
                                .select("*")
                                .where("pending_tables_id", room)
                                .update({
                                    guest_4: null
                                })
                                .then(
                                    db("pending_tables")
                                        .select("*")
                                        .where("id", room)
                                        .then((data) => {
                                            let newNumber = users.number_of_guests - 1;

                                            db("pending_tables")
                                                .select("*")
                                                .where("id", room)
                                                .update({
                                                    number_of_guests: newNumber
                                                })
                                                .then(
                                                    res.redirect(`/places/${uName}`)
                                                )
                                        })
                                )
                        } else if (username == users.guest_5) {
                            db("pending_tables_guests")
                                .select("*")
                                .where("pending_tables_id", room)
                                .update({
                                    guest_5: null
                                })
                                .then(
                                    db("pending_tables")
                                        .select("*")
                                        .where("id", room)
                                        .then((data) => {
                                            let newNumber = users.number_of_guests - 1;

                                            db("pending_tables")
                                                .select("*")
                                                .where("id", room)
                                                .update({
                                                    number_of_guests: newNumber
                                                })
                                                .then(
                                                    res.redirect(`/places/${uName}`)
                                                )
                                        })
                                )
                        } else {
                            req.flash("not_in_room", "You have not joined this room yet")
                            res.redirect(`/places/${uName}`)
                        }
                    }
                })
        })
})
app.post('/chat/confirm/:username', (req, res) => {

    const uName = req.params.name;

    const { username, room } = req.body;

    let query = db.select('*').from("pending_tables_guests")

    query
        .then((data) => {
            let query = data;

            db("pending_tables")
                .select("*")
                .where("id", room)
                .then((data) => {
                    if (data[0].table_confirmed == true) {
                        req.flash("table_full", "Sorry, this table is closed.")
                        res.redirect(`/places/${uName}`)
                    } else {

                        let filter = query.filter((rowfilter) => {
                            return (rowfilter.pending_tables_id == room)
                        })[0];

                        if (filter.guest_1 == username || filter.guest_2 == username || filter.guest_3 == username ||
                            filter.guest_4 == username || filter.guest_5 == username || filter.host_name == username) {
                            req.flash("already_joined", "You have already joined this room")
                            res.redirect("back")

                        } else if (filter.guest_1 == null) {
                            db("pending_tables_guests")
                                .where("pending_tables_id", "=", room)
                                .update({
                                    guest_1: username
                                })
                                .then(
                                    db("pending_tables")
                                        .where("id", "=", room)
                                        .then((data) => {
                                            let x = data[0].number_of_guests + 1;

                                            console.log(x)

                                            db("pending_tables")
                                                .where("id", "=", room)
                                                .update({
                                                    number_of_guests: x
                                                }).then(
                                                    res.redirect("back")
                                                )
                                        })
                                )
                        } else if (filter.guest_2 == null) {
                            db("pending_tables_guests")
                                .where("pending_tables_id", "=", room)
                                .update({
                                    guest_2: username
                                })
                                .then(
                                    db("pending_tables")
                                        .where("id", "=", room)
                                        .then((data) => {
                                            let x = data[0].number_of_guests + 1;

                                            console.log(x)

                                            db("pending_tables")
                                                .where("id", "=", room)
                                                .update({
                                                    number_of_guests: x
                                                }).then(
                                                    res.redirect("back")
                                                )
                                        })
                                )
                        } else if (filter.guest_3 == null) {
                            db("pending_tables_guests")
                                .where("pending_tables_id", "=", room)
                                .update({
                                    guest_3: username
                                })
                                .then(
                                    db("pending_tables")
                                        .where("id", "=", room)
                                        .then((data) => {
                                            let x = data[0].number_of_guests + 1;

                                            console.log(x)

                                            db("pending_tables")
                                                .where("id", "=", room)
                                                .update({
                                                    number_of_guests: x
                                                }).then(
                                                    res.redirect("back")
                                                )
                                        })
                                )
                        } else if (filter.guest_4 == null) {
                            db("pending_tables_guests")
                                .where("pending_tables_id", "=", room)
                                .update({
                                    guest_4: username
                                })
                                .then(
                                    db("pending_tables")
                                        .where("id", "=", room)
                                        .then((data) => {
                                            let x = data[0].number_of_guests + 1;

                                            console.log(x)

                                            db("pending_tables")
                                                .where("id", "=", room)
                                                .update({
                                                    number_of_guests: x
                                                }).then(
                                                    res.redirect("back")
                                                )
                                        })
                                )
                        } else if (filter.guest_5 == null) {
                            db("pending_tables_guests")
                                .where("pending_tables_id", "=", room)
                                .update({
                                    guest_5: username
                                })
                                .then(
                                    db("pending_tables")
                                        .where("id", "=", room)
                                        .then((data) => {
                                            let x = data[0].number_of_guests + 1;

                                            console.log(x)

                                            db("pending_tables")
                                                .where("id", "=", room)
                                                .update({
                                                    number_of_guests: x
                                                }).then(
                                                    res.redirect("back")
                                                )
                                        })
                                )
                        } else {
                            req.flash("full_room", "Sorry, this room is now full.")
                            res.redirect(`/places/${uName}`)
                        }


                    }
                })

        })

})

io.on("connection", (socket) => {
    socket.on("joinRoom", ({ username, room }) => {
        const user = userJoin(socket.id, username, room);


        socket.join(user.room);

        // Welcome current user
        socket.emit("message", formatMessage(botName, "Welcome to ChatCord!"));

        // Broadcast when a user connects
        socket.broadcast
            .to(user.room)
            .emit(
                "message",
                formatMessage(botName, `${user.username} has joined the chat`)
            );

        // Send users and room info
        io.to(user.room).emit("roomUsers", {
            room: user.room,
            users: getRoomUsers(user.room),
        });
    });

    // Listen for chatMessage
    socket.on("chatMessage", (msg) => {
        const user = getCurrentUser(socket.id);

        io.to(user.room).emit("message", formatMessage(user.username, msg));
    });

    // Runs when client disconnects
    socket.on("disconnect", () => {
        const user = userLeave(socket.id);

        if (user) {
            io.to(user.room).emit(
                "message",
                formatMessage(botName, `${user.username} has left the chat`)
            );

            // Send users and room info
            io.to(user.room).emit("roomUsers", {
                room: user.room,
                users: getRoomUsers(user.room),
            });
        }
    });
});

//edit profile 

app.post("/editProfile/:name", (req, res) => {
    const uName = req.params.name;

    const { profileInterests, profileAboutMe, coverPhotoURL } = req.body;

    return db("users")
        .where("username", "=", uName)
        .update({
            about_me: profileAboutMe,
            interests: profileInterests,
            cover_photo_URL: coverPhotoURL
        }).then(() => {
            let query = db.select('*').from('users').where("username", uName);

            return query
                .then((rows) => {

                    let info = rows[0]

                    if (!info.cover_photo_URL) {

                    }

                    res.render('calendar', {
                        layout: 'secondary',
                        uName,
                        info
                    })
                })
        })



})

//creating tables 
app.post("/create_table/:name", (req, res) => {
    const uName = req.params.name;

    const { hostName, restName, restAddress, max_guests, prefLanguage, current_guests, dateTime, tableDesc } = req.body;

    let dt = dateTime.replace("T", " ")


    date1 = dateTime.substr(0, 10).replace(/-/gi, "")

    if (nowaday - date1 > 0) {
        req.flash("expired_date", "Please select the correct date")
        res.redirect("back")
    } else {

        db("pending_tables")
            .insert({
                host_name: hostName,
                restaurant_name: restName,
                restaurant_address: restAddress,
                date_and_time: dt,
                preferred_language: prefLanguage,
                number_of_guests: current_guests,
                max_number_guests: max_guests,
                description: tableDesc,
                table_confirmed: false
            })
            .returning('*')
            .then((data) => {
                let table_id = data[0].id

                let max_guests = data[0].max_number_guests

                switch (max_guests) {
                    case 2:

                        db("pending_tables_guests")
                            .insert({
                                pending_tables_id: table_id,
                                host_name: hostName,
                                guest_3: "not_available",
                                guest_4: "not_available",
                                guest_5: "not_available"
                            }).then((rows) => {
                                req.flash('table_created', "Table has been created")
                                res.redirect(`/my_tables/${uName}`)
                            });
                        break;

                    case 3:

                        db("pending_tables_guests")
                            .insert({
                                pending_tables_id: table_id,
                                host_name: hostName,
                                guest_4: "not_available",
                                guest_5: "not_available"
                            }).then((rows) => {
                                req.flash('table_created', "Table has been created")
                                res.redirect(`/my_tables/${uName}`)
                            });
                        break;

                    case 4:

                        db("pending_tables_guests")
                            .insert({
                                pending_tables_id: table_id,
                                host_name: hostName,
                                guest_5: "not_available"
                            }).then((rows) => {
                                req.flash('table_created', "Table has been created")
                                res.redirect(`/my_tables/${uName}`)
                            });
                        break;

                    case 5:

                        db("pending_tables_guests")
                            .insert({
                                pending_tables_id: table_id,
                                host_name: hostName
                            }).then((rows) => {
                                req.flash('table_created', "Table has been created")
                                res.redirect(`/my_tables/${uName}`)
                            });
                        break;
                }

            })
            .catch((err) => {
                throw err;
            })


    }

})

//confirm table


app.post("/confirm_table/:name/:room", async (req, res) => {
    let uName = req.params.name;

    let roomId = req.params.room;

    let nameArray = [];

    let emailArray = [];

    await db.from('pending_tables_guests')
        .where("pending_tables_id", roomId)
        .then(async (data) => {
            let info = data[0]


            if (info.guest_1 !== null && info.guest_1 !== "not_available") {
                nameArray.push(info.guest_1)
            }

            if (info.guest_2 !== null && info.guest_2 !== "not_available") {
                nameArray.push(info.guest_2)
            }

            if (info.guest_3 !== null && info.guest_3 !== "not_available") {
                nameArray.push(info.guest_3)
            }

            if (info.guest_4 !== null && info.guest_4 !== "not_available") {
                nameArray.push(info.guest_4)
            }

            if (info.guest_5 !== null && info.guest_5 !== "not_available") {
                nameArray.push(info.guest_5)
            }

            for (let i = 0; i < nameArray.length; i++) {
                await db('users')
                    .select('*')
                    .where("name", nameArray[i])
                    .then((data) => {
                        emailArray.push(data[0].email)
                    })
            }

        })


    let tagArray = [];

    // Query each username for send the individual link

    await db("pending_tables")
        .select('*')
        .where('id', roomId)
        .then((data) => {

            console.log(data)

            let info = data[0]

            let dt = info.date_and_time.toString().replace('T', ' ')

            console.log(nameArray)

            for (let i = 0; i < nameArray.length; i++) {

                let tags = `
            <p>You have a new Confirmation</p>
            <h3>Complete Details</h3>
            <ul>  
                <li>Host Name: ${info.host_name}</li>
                <li>Scheduled time: ${dt}</li>
                <li>Restaurant Name: ${info.restaurant_name}</li>
                <li>Address: ${info.restaurant_address}</li>
            </ul>
            <p>Look forward to seeing you there!</p>
            <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
                <td>
                    <table cellspacing="0" cellpadding="0">
                    <tr>
                        <td style="border-radius: 2px;" bgcolor="#ED2939">
                            <a href="http://127.0.0.1:3000/review-rating/${nameArray[i]}/${roomId}" 
                            target="_blank" 
                            style="padding: 8px 12px; 
                            border: 1px solid #ED2939; 
                            border-radius: 2px; 
                            font-family: Helvetica, Arial, sans-serif; 
                            font-size: 14px; color: #ffffff; 
                            text-decoration: none; 
                            font-weight: bold; 
                            display: inline-block;">
                            Request a Review
                            </a>
                        </td>
                    </tr>
                    </table>
                </td>
            </tr>
            </table>
            <h3>Thank You.</h3>`

                tagArray.push(tags)

            }
        })


    console.log(tagArray);

    // let eachTag = await output()

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP,
        port: process.env.PORT,
        secure: false,
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
        },
    });

    console.log(emailArray[1])

    let mailOptions1 = {
        from: `${process.env.EMAIL}`,
        to: `${emailArray[0]}`,
        subject: "👻  MuchM8 Confirmation 👻 ",
        text: "✔ Hello, ",
        html: tagArray[0]
    };

    let mailOptions2 = {
        from: `${process.env.EMAIL}`,
        to: `${emailArray[1]}`,
        subject: "👻  MuchM8 Confirmation 👻 ",
        text: "✔ Hello, ",
        html: tagArray[1]
    };

    let mailOptions3 = {
        from: `${process.env.EMAIL}`,
        to: `${emailArray[2]}`,
        subject: "👻  MuchM8 Confirmation 👻 ",
        text: "✔ Hello, ",
        html: tagArray[2]
    };

    let mailOptions4 = {
        from: `${process.env.EMAIL}`,
        to: `${emailArray[3]}`,
        subject: "👻  MuchM8 Confirmation 👻 ",
        text: "✔ Hello, ",
        html: tagArray[3]
    };

    let mailOptions5 = {
        from: `${process.env.EMAIL}`,
        to: `${emailArray[4]}`,
        subject: "👻  MuchM8 Confirmation 👻 ",
        text: "✔ Hello, ",
        html: tagArray[4]
    };


    transporter.sendMail(mailOptions1, (error, info) => {
        if (error) {
            return console.log(error);
        };
        console.log('Message sent: %s', info.messageId);
    });

    transporter.sendMail(mailOptions2, (error, info) => {
        if (error) {
            return console.log(error);
        };
        console.log('Message sent: %s', info.messageId);
    });

    transporter.sendMail(mailOptions3, (error, info) => {
        if (error) {
            return console.log(error);
        };
        console.log('Message sent: %s', info.messageId);
    });

    transporter.sendMail(mailOptions4, (error, info) => {
        if (error) {
            return console.log(error);
        };
        console.log('Message sent: %s', info.messageId);
    });

    transporter.sendMail(mailOptions5, (error, info) => {
        if (error) {
            return console.log(error);
        };
        console.log('Message sent: %s', info.messageId);
    });

    await db("pending_tables")
        .select("*")
        .where("id", roomId)
        .update({
            table_confirmed: true
        })
        .then(
        )
    res.redirect("back")
})



//calendar

app.get("/uCalendar", function (req, res) {
    const uName = req.params.name;
    db.select("*")
        .from("event")
        .then((data) => {
            res.send(data)
        });
});

app.post("/newEvent/:name", (req, res) => {
    const uName = req.params.name;
    const { title, date } = req.body;

    db("event")
        .insert({
            title: title,
            start: date,
            editor: uName,
        })
        .then(res.redirect(`/secondary/${uName}`));

});

//update 
app.post("/updateEvent/:name/", async (req, res) => {
    const uName = req.params.name;
    const { id, title, date } = req.body;
    db("event")
        .where("id", "=", id)
        .update({
            title: title,
            start: date,
        })
        .then(res.redirect(`/secondary/${uName}`));
});

//delete

app.post("/deleteEvent/:name/", async (req, res) => {
    const uName = req.params.name;
    const { id, title, date } = req.body;
    db("event")
        .where("id", "=", id)
        .del()
        .then(res.redirect(`/secondary/${uName}`));
});

//Find my tables

app.get('/my_tables/:name', (req, res) => {
    const uName = req.params.name;

    console.log(uName)

    let hostData;
    let joinData;

    let query = db.select('*').from('users').where("username", uName);

    query
        .then((rows) => {
            let name = rows[0].name;

            db.select('*')
                .from("pending_tables").where("host_name", name)
                .then((data) => {

                    for (let i = 0; i < data.length; i++) {
                        data[i].uName = uName
                        data[i].realName = name
                    }

                    hostData = data;

                    db.from('pending_tables')
                        .innerJoin('pending_tables_guests', 'pending_tables.id', 'pending_tables_guests.pending_tables_id')

                        .where(function () {
                            this.where('guest_1', name).orWhere('guest_2', name).orWhere('guest_3', name)
                                .orWhere('guest_4', name).orWhere('guest_5', name)
                        }).then((data) => {
                            console.log(data)

                            for (let i = 0; i < data.length; i++) {
                                data[i].uName = uName
                                data[i].realName = name
                            }

                            joinData = data;

                            res.render('my_tables', { layout: 'secondary', uName, name, hostData, joinData });
                        })
                })

        })
        .catch((err) => {
            throw err;
        })
})

//star ratings post rq

app.post("/rate/:name", (req, res) => {

    const name = req.params.name;

    const { rate, time } = req.body;


    db('users').where('name', name).then((data) => {
        let x = data[0].rating + rate;
        let y = data[0].get_rated + time;
        db("users")
            .where("name", "=", name)
            .update({
                rating: x,
                get_rated: y,
            }).then(console.log("GG"))
    })

})


app.get("/getRate/:name", function (req, res) {

    const uName = req.params.name;

    db.select("*")
        .from("users")
        .where("username", uName)
        .then((data) => {
            res.send(data)
        });
});

// Search places
app.get('/places/:name', (req, res) => {

    const uName = req.params.name;

    let query = db.select('*').from('users').where("username", uName);

    query
        .then((rows) => {
            let name = rows[0].name;

            let table = [];
            let del = [];

            db.select("*")
                .from("pending_tables")
                .then((data) => {
                    for (let i = 0; i < data.length; i++) {

                        if (data[i].max_number_guests === data[i].number_of_guests || data[i].table_confirmed == true) {
                            del.push(i)
                        } else {
                            data[i].uName = uName
                            data[i].realName = name
                        }
                    }

                    for (let i = 0; i < del.length; i++) {
                        data.splice(del[i], 1)
                    }

                    table = data

                    res.render('googleMaps', {
                        layout: 'placesSearch', uName, name, table
                    })
                });
        })
        .catch((err) => {
            throw err;
        })

});


// Review & Rating
app.get("/review-rating/:name/:id", async (req, res) => {

    const uName = req.params.name;

    const roomId = req.params.id;

    await db.from('pending_tables')
        .innerJoin('pending_tables_guests', 'pending_tables.id', 'pending_tables_guests.pending_tables_id')
        .where("pending_tables.id", roomId)
        .then((data) => {
            let variable = data[0]

            let h = true; 

            let g1 = true;
            let g2 = true;
            let g3 = true;
            let g4 = true;
            let g5 = true;


            if (variable.host_name === uName) {
                h = false;
            };

            if (variable.guest_1 == null || variable.guest_1 == uName) {
                g1 = false;
            };

            if (variable.guest_2 == null || variable.guest_2 == "not_available" || variable.guest_2 == uName) {
                g2 = false;
            };

            if (variable.guest_3 == null || variable.guest_3 == "not_available" || variable.guest_3 == uName) {
                g3 = false;
            };

            if (variable.guest_4 == null || variable.guest_4 == "not_available"|| variable.guest_4 == uName) {
                g4 = false;
            };

            if (variable.guest_5 == null || variable.guest_5 == "not_available"|| variable.guest_5 == uName) {
                g5 = false;
            };

            res.render("rating", {
                layout: "secondary", uName, roomId, variable, guest_1: g1,
                guest_2: g2, guest_3: g3, guest_4: g4, guest_5: g5, host: h
            });
        })
});

server.listen(3000, () => {
    console.log("Server is running on port 3000");
})

let j = schedule.scheduleJob('00 00 9 * * 0-6', function () {

    let array = [];

    let dateTime;


    db.select("*")
        .from("pending_tables")
        .then((data) => {

            for (let i = 0; i < data.length; i++) {
                dateTime = (data[i].date_and_time).substr(0, 10).replace(/-/gi, "")

                if (nowaday - dateTime > 0) {

                    db("pending_tables_guests")
                        .where("pending_tables_id", "=", data[i].id)
                        .del()
                        .then(
                            db("pending_tables")
                                .where("id", "=", data[i].id)
                                .del()
                                .then(
                                )
                        )
                }
            }

            console.log(array);
        })
});