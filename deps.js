const body = require('body-parser');
const irc = require("express")();
const session = require("express-session");
const http = require("http").createServer(irc);
const mongo = require("mongodb").MongoClient;

const creds = require("./deploy/credentials.json");
const url = creds.url;
const io = require("socket.io")(http);

irc.use(body.urlencoded({ extended: false }));
irc.use(body.json());
irc.use(session({secret: '秘密',
		 resave: false,
		 saveUninitialized: false
		})
       );

module.exports = {
    startServer: function(port) {
	http.listen(port, () => {
	    console.log("localhost:" + port);
	});
    },
    irc,
    mongo,
    url,
    io
};
