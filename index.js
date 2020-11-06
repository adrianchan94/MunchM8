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

app.get('/main/:username', checkNotAuthenticated, (req, res) => {
    const uName = req.params.username
    res.render('index', { uName });
})

app.get('/', checkNotAuthenticated, (req, res) => {
    res.render('index');
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

    res.redirect("/login");
}

app.get('/secondary/:name', checkNotAuthenticated, (req, res) => {

    const uName = req.params.name;
    console.log(uName)

    let query = db.select('*').from('users').where("username", uName);

    query
        .then((rows) => {


            let info = rows[0]

            console.log(info.about_me)
            console.log(info)

            res.render('calendar', {
                layout: 'secondary',
                uName,
                info
            })
        })
        .catch((err) => {
            throw err;
        })
});

//socket.io chat

app.get('/chat/:name', (req, res) => {
    const uName = req.params.name;

    res.render('chat', { layout: 'secondary' });
});

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
        }).then(()=>{
            let query = db.select('*').from('users').where("username", uName);

           return query
                .then((rows) => {
        
        
                    let info = rows[0]
                    console.log(info)
        
        
                    console.log(profileInterests);
                    console.log(profileAboutMe);
                    console.log(coverPhotoURL);
        
                    res.render('calendar', {
                        layout: 'secondary',
                        uName,
                        info
                    })
                })
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
app.get('/places', checkAuthenticated, (req, res) => {
    res.render('googleMaps', {layout: 'placesSearch '})
});

// Confirmation
app.get('/', checkAuthenticated, (req, res) => {
    res.render('')
});

server.listen(3000, () => {
    console.log("Server is running on port 3000");
})


