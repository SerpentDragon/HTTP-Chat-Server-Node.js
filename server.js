const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

server.listen({ port: 3000, host: '0.0.0.0', });

var clients = new Map();
var logfile = "/logs/logfile.log";

app.use((req, res, next) => {
	const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
	const data = date + " " + req.ip + " " + req.method + " " + req.url + "\n";
	
	fs.appendFile(__dirname + logfile, data, (error) => {
		if (error) console.log("Cannot write log!");
	}); 
	
	next();
});

app.get("/", (req, res) => {

	var nickname = req.query.nickname ?? null;
	var checkClient = clients.has(nickname);

	if (checkClient && clients.get(nickname) == null || (!checkClient && nickname)) {
		res.sendFile(__dirname + "/public/chat.html");
		clients.set(nickname, null);
	}
	else {
		res.status(200).sendFile(__dirname + "/public/index.html");
	}
});

io.sockets.on("connection", (socket) => {

	socket.emit("send nickname");

	socket.on("receive nickname", (nickname) => {
		if (clients.has(nickname) && !clients.get(nickname)) {
			clients.set(nickname, socket);
			socket.nickname = nickname;
			io.sockets.emit("join message", (nickname));
		}
	});
	
        socket.on("disconnect", (data) => {
		var nickname = socket.nickname;
		var newSocket = clients.get(nickname);

		if (newSocket && newSocket.id == socket.id) {
			setTimeout(() => {
				clients.delete(nickname);
				io.sockets.emit("log out", nickname);
			}, 60000);
		}
        });

	socket.on("validate nickname", (nick) => {
		var checkNickname = clients.has(nick);
		var checkSocket = clients.get(nick);

		if (checkNickname && checkSocket) {
			nickname = "";
			socket.emit("wrong nickname");
		}
		else {
			clients.set(nick, null);
			socket.nickname = nick;
		}
	});


	socket.on("send message", (data) => {
		io.sockets.emit("receive message", data);
	});
});
