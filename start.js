const deps = require("./deps.js");
const user = require("./user.js");
const send = require("./send.js");

deps.irc.get("/", (request, response) => {
    if (request.session.username)
	response.sendFile(__dirname + "/html/chat.html");
    else
    	response.sendFile(__dirname + "/html/username.html");
});

deps.irc.route("/user")
    .post(user.name);

deps.irc.route("/send")
    .post(send.mesg);

deps.startServer(41337);
