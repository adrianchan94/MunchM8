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

const initializePassport = require("./passportConfig")
initializePassport(passport);


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
                        password: hashedPassword
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

app.get('/chat/:name/:id', (req, res) => {
    const uName = req.params.name;

    const roomId = req.params.id;

    db.from('pending_tables')
    .innerJoin('pending_tables_guests', 'pending_tables.id', 'pending_tables_guests.pending_tables_id')
    .then((data) => {

        let filter = data.filter((rowfilter) => {
            return (rowfilter.pending_tables_id == roomId)
        })[0];

        console.log(filter)

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

        res.render('chat', { layout: 'secondary', filter, uName, roomId, guest_1: g1,
         guest_2: g2, guest_3: g3, guest_4: g4, guest_5: g5});
    })

});

app.post('/chat/confirm/:username', (req, res) => {

    const uName = req.params.name;

    const {username, room} = req.body;

    let query = db.select('*').from("pending_tables_guests")

    query
    .then((data) => {

        // let filter = data.filter((rowfilter) => {
        //     return (rowfilter.guest_1 == username || rowfilter.guest_2 == username || rowfilter.guest_3 == username|| 
        //         rowfilter.guest_4 == username || rowfilter.guest_5 == username || rowfilter.hostname == username)
        // })
        // if (filter.length > 0) {
        //     req.flash("already_joined", "You have already joined this room")
        //     res.redirect("back")

        let filter = data.filter((rowfilter) => {
            return (rowfilter.pending_tables_id == room)
        })[0];
     
        if (filter.guest_1 == username || filter.guest_2 == username || filter.guest_3 == username|| 
        filter.guest_4 == username || filter.guest_5 == username || filter.hostname == username){
            req.flash("already_joined", "You have already joined this room")
            res.redirect("back")

         } else if(filter.guest_1 == null){
                db("pending_tables_guests")
                .where("pending_tables_id", "=", room)
                .update({
                    guest_1: username
                })
                .then(
                    res.redirect("back")
                )
            } else if (filter.guest_2 == null){
                db("pending_tables_guests")
                .where("pending_tables_id", "=", room)
                .update({
                    guest_2: username
                })
                .then(
                    res.redirect("back")
                )
            } else if (filter.guest_3 == null){
                db("pending_tables_guests")
                .where("pending_tables_id", "=", room)
                .update({
                    guest_3: username
                })
                .then(
                    res.redirect("back")
                )
            } else if (filter.guest_4 == null){
                db("pending_tables_guests")
                .where("pending_tables_id", "=", room)
                .update({
                    guest_4: username
                })
                .then(
                    res.redirect("back")
                )
            } else if (filter.guest_5 == null){
                db("pending_tables_guests")
                .where("pending_tables_id", "=", room)
                .update({
                    guest_5: username
                })
                .then(
                    res.redirect("back")
                )
            } else {
                req.flash("full_room", "Sorry, this room is now full.")
                res.redirect(`/places/${uName}`)
            }

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

    let dt = dateTime.replace("T"," ")


    db("pending_tables")
        .insert({
            host_name: hostName,
            restaurant_name: restName,
            restaurant_address: restAddress,
            date_and_time: dt,
            preferred_language: prefLanguage,
            number_of_guests: current_guests,
            max_number_guests: max_guests,
            description: tableDesc
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
                res.redirect(`/places/${uName}`)
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
                res.redirect(`/places/${uName}`)
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
                    res.redirect(`/places/${uName}`)
                    });
                break;
    
                case 5: 

                db("pending_tables_guests")
                    .insert({
                        pending_tables_id: table_id,
                        host_name: hostName
                    }).then((rows) => {
                    req.flash('table_created', "Table has been created")
                    res.redirect(`/places/${uName}`)
                    });
                break;
            }
            
        })
        .catch((err) => {
            throw err;
        })
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

app.get('/find-a-table', (req, res) => {
    res.render('find-a-table', { layout: 'secondary' });
})

// Search places
app.get('/places/:name', (req, res) => {
    const uName = req.params.name;

    let query = db.select('*').from('users').where("username", uName);

    query
        .then((rows) => {
            let name = rows[0].name;

            let table = [];

            db.select("*")
                .from("pending_tables")
                .then((data) => {
                    for (let i = 0; i < data.length; i++) {
                        data[i].uName = uName
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

server.listen(3000, () => {
    console.log("Server is running on port 3000");
})

