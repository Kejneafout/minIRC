const deps = require("./deps.js");

module.exports = {
    mesg: function(request, response) {

	if (!request.session.username || !request.session.current || request.body.msg === "") {
	    response.send();
	    return ;
	}
	else if ((request.body.msg).startsWith("/help")) {
	    deps.io.emit("chatodesu", "/nick: Change username");
	    deps.io.emit("chatodesu", "/list: List channels");
	    deps.io.emit("chatodesu", "/create #channel: Create channel, must be alphanum and start with #");
	    deps.io.emit("chatodesu", "/delete #channel: Delete channel, must be alphanum and start with #");
	    deps.io.emit("chatodesu", "/join #channel: Join channel, must be alphanumeric and start with #");
	    deps.io.emit("chatodesu", "/quit #channel: Quit channel, must be alphanumeric and start with #");
	    deps.io.emit("chatodesu", "/users #channel: List users in channel, alphanumer and start with #");
	    deps.io.emit("chatodesu", "/priv: Show PMs you received");
	    deps.io.emit("chatodesu", "/msg @user message: Send PM to @user");
	    deps.io.emit("chatodesu", "/show @user|#channel: Show messages in specific chat");
	    deps.io.emit("chatodesu", "/off: Disconnect");
	    deps.io.emit("chatodesu", "/clear: Clear chat");
	    // deps.io.emit("chatodesu", "/purge: Clear database");
	}
	else if ((request.body.msg).startsWith("/nick")) {

	    var split = (request.body.msg).split(" ");
	    if (/^[a-z0-9]+$/i.test(split[1])) {
		var oldu = request.session.username;
		var newu = "@" + split[1];

		deps.mongo.connect(deps.url, {useUnifiedTopology: true}, async function(error, client) {

		    if (error)
			return ;
		    const ircdata = client.db("ircdata").collection("users");
		    await ircdata.updateOne({username: oldu}, {$set: {username: newu}}, function(error, docs) {
			if (error)
			    return ;
		    });
		    client.close();
		});
		deps.io.emit("chatodesu", oldu + " changed username to " + newu);
		request.session.username = newu;
	    }
	    response.send();
	}
	else if ((request.body.msg).startsWith("/list")) {

	    deps.mongo.connect(deps.url, {useUnifiedTopology: true}, async function(error, client) {

		if (error)
		    return ;
		const ircdata = client.db("ircdata").collection("channels");
		await ircdata.find().toArray(function(error, docs) {

		    if (error)
			return ;
		    var chans = [];
    		    docs.forEach((doc) => {
			chans.push(doc.name);
		    });
		    deps.io.emit("SERVMSG" + request.session.username,
				 "Channels: " + chans.join(" "));
		});
		client.close();
	    });
	    response.send();
	}
	else if ((request.body.msg).startsWith("/create")) {

	    var split = (request.body.msg).split(" ");
	    if (/^#[a-z0-9]+$/i.test(split[1])) {

		var channel = split[1];
		if (channel === "#welcome")
		    return ;
		deps.mongo.connect(deps.url, {useUnifiedTopology: true}, async function(error, client) {

		    if (error)
			return ;
		    const ircdata = client.db("ircdata").collection("channels");
		    await ircdata.insertOne({name: channel, members: [request.session.username]});
    		    client.close();
		});
		request.session.current = channel;
		request.session.save();
	    }
	    response.send();
	}
	else if ((request.body.msg).startsWith("/delete")) {

	    var split = (request.body.msg).split(" ");
	    if (/^#[a-z0-9]+$/i.test(split[1])) {

		var channel = split[1];
		if (channel === "#welcome")
		    return ;
		deps.mongo.connect(deps.url, {useUnifiedTopology: true}, async function(error, client) {

		    if (error)
			return ;
		    const ircdata = client.db("ircdata");
		    await ircdata.collection("chats").deleteMany({recipient: channel});
		    await ircdata.collection("channels").deleteMany({name: channel});
		    client.close();
		});
		if (channel === request.session.current) {
		    request.session.current = "#welcome";
		    request.session.save();
		}
	    }
	    response.send();
	}
	else if ((request.body.msg).startsWith("/join")) {

	    var split = (request.body.msg).split(" ");
    	    if (/^#[a-z0-9]+$/i.test(split[1])) {

    		var channel = split[1];
    		if (channel === request.session.current || channel === "#welcome")
    		    return ;
		deps.mongo.connect(deps.url, {useUnifiedTopology: true}, async function(error, client) {

		    if (error)
			return ;
		    const ircdata = client.db("ircdata").collection("channels");
		    await ircdata.updateOne({name: channel}, {$addToSet: {members: request.session.username}});
		    client.close();
		});
		request.session.current = channel;
		request.session.save();
	    }
	    response.send();
	}
	else if ((request.body.msg).startsWith("/quit")) {

    	    var split = (request.body.msg).split(" ");
    	    if (/^#[a-z0-9]+$/i.test(split[1])) {

		var channel = split[1];
    		if (channel === "#welcome")
    		    return ;
		deps.mongo.connect(deps.url, {useUnifiedTopology: true}, async function(error, client) {

		    if (error)
			return ;
		    const ircdata = client.db("ircdata").collection("channels");
		    await ircdata.updateOne({name: channel}, {$pullAll: {members: [request.session.username]}});
		    client.close();
		});
		if (channel === request.session.current) {
		    request.session.current = "#welcome";
		    request.session.save();
		}
	    }
	    response.send();
	}
	else if ((request.body.msg).startsWith("/users")) {

	    if (/^#[a-z0-9]+$/i.test(request.session.current)) {

		deps.mongo.connect(deps.url, {useUnifiedTopology: true}, async function(error, client) {

		    if (error)
			return ;
		    var channel = request.session.current;
		    const ircdata = client.db("ircdata").collection("channels");
		    await ircdata.find({name: channel}).toArray(function(error, docs) {
			deps.io.emit("SERVMSG" + request.session.username,
				     "Users in " + request.session.current + ": " + (docs[0].members).join(" "));
		    });
		    client.close();
		});
	    }
	    response.send();
	}
	else if ((request.body.msg).startsWith("/priv")) {

	    deps.mongo.connect(deps.url, {useUnifiedTopology: true}, async function(error, client) {

		if (error)
		    return ;
		const ircdata = client.db("ircdata").collection("chats");
		await ircdata.find({recipient: {$all: [request.session.username]}}).toArray(function(error, docs) {

		    if (error)
			return ;
		    var privs = [];
		    var privsJSON = [];
    		    docs.forEach((doc) => {
			if (doc.recipient[0] !== request.session.username
			    && privs.indexOf(doc.recipient[0]) === -1) {
			    privs.push(doc.recipient[0]);
			    privsJSON.push({name: doc.recipient[0]});
			}
			else if (doc.recipient[1] !== request.session.username
				 && privs.indexOf(doc.recipient[1]) === -1) {
			    privs.push(doc.recipient[1]);
			    privsJSON.push({name: doc.recipient[1]});
			}
		    });
		    deps.io.emit("chatodesu", "Private chats: " + privs.join(" "));
		    response.json(privsJSON);
		});
		client.close();
	    });
	}
	else if ((request.body.msg).startsWith("/msg")) {

	    var split = (request.body.msg).split(" ");
	    if (/^@[a-z0-9]+$/i.test(split[1])) {

		var recipee = split[1];
		var content = split.splice(2).join(" ");
		var timestamp = Date.now() / 1000 | 0;
		deps.mongo.connect(deps.url, {useUnifiedTopology: true}, async function(error, client) {

		    if (error)
			return ;
		    const ircdata = client.db("ircdata").collection("chats");
		    var chatJSON = {recipient: [recipee, request.session.username],
				    sender: request.session.username,
				    message: content,
				    timestamp: timestamp
				   };
		    await ircdata.insertOne(chatJSON, function(error, docs) {
			if (error)
			    return ;
		    });
    		    client.close();
		});
	    }
	    response.send();
	}
	else if ((request.body.msg).startsWith("/show")) {

    	    var split = (request.body.msg).split(" ");
    	    if (/^@[a-z0-9]+$/i.test(split[1])) {

		deps.mongo.connect(deps.url, {useUnifiedTopology: true}, async function(error, client) {
    
		    if (error)
			return ;
		    var sendJSON = {recipient: [request.session.username, split[1]]};
		    var recvJSON = {recipient: [split[1], request.session.username]};
		    const ircdata = client.db("ircdata").collection("chats");
		    await ircdata.find({$or: [sendJSON, recvJSON]}).sort({timestamp: 1}).toArray(function(error, docs) {

			if (error)
			    return ;
			response.send(docs);
		    });
    		    client.close();
		});
		request.session.current = [split[1], request.session.username];
		request.session.save();
    	    }
	    else if (/^#[a-z0-9]+$/i.test(split[1])) {

		deps.mongo.connect(deps.url, {useUnifiedTopology: true}, async function(error, client) {

		    if (error)
			return ;
		    const ircdata = client.db("ircdata").collection("chats");
		    await ircdata.find({recipient: split[1]}).sort({timestamp: 1}).toArray(function(error, docs) {

			if (error)
			    return ;
			response.send(docs);
		    });
    		    client.close();
		});
		request.session.current = split[1];
		request.session.save();
	    }
	}
	else if ((request.body.msg).startsWith("/off")) {

	    deps.mongo.connect(deps.url, {useUnifiedTopology: true}, async function(error, client) {

		if (error)
		    return ;
		const ircdata = client.db("ircdata");
		await ircdata.collection("users").deleteMany({username: request.session.username});
		await ircdata.collection("channels").updateOne({name: "#welcome"}, {$pullAll: {members: [request.session.username]}});
		request.session.destroy();
    		client.close();
	    });
	    response.send();
	}
	// else if ((request.body.msg).startsWith("/purge")) {

    	//     deps.mongo.connect(deps.url, {useUnifiedTopology: true}, async function(error, client) {

    	// 	const ircdata = client.db("ircdata");
    	// 	await ircdata.collection("channels").deleteMany({});
    	// 	await ircdata.collection("channels").insertOne({name: "#welcome", members: []});
    	// 	await ircdata.collection("chats").deleteMany({});
    	// 	await ircdata.collection("users").deleteMany({});
    	// 	request.session.destroy();
    	// 	client.close();
    	//     });
	//     deps.io.emit("chatodesu", "Purge initiated, please refresh the page");
	//     response.send();
	// }
	else {
	    var timestamp = Date.now() / 1000 | 0;
	    deps.mongo.connect(deps.url, {useUnifiedTopology: true}, async function(error, client) {

		if (error)
		    return ;
		var insertJSON = {recipient: request.session.current,
				  sender: request.session.username,
				  message: request.body.msg,
				  timestamp: timestamp
				 };
		const ircdata = client.db("ircdata").collection("chats");
		await ircdata.insertOne(insertJSON);
		deps.io.emit("chatodesu", insertJSON);
    		client.close();
	    });
	    response.send();
	}
    }
}
