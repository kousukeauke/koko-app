const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

let users = {};
let disconnectTimers = {};

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ name, room }) => {
    users[socket.id] = { name, room };
    socket.join(room);

    io.to(room).emit("chatMessage", `${name} が入室しました`);
  });

  socket.on("chatMessage", (msg) => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit("chatMessage", `${user.name}: ${msg}`);
    }
  });

  socket.on("changeName", (newName) => {
    const user = users[socket.id];
    if (user) {
      const oldName = user.name;
      user.name = newName;
      io.to(user.room).emit("chatMessage", `${oldName} が ${newName} に名前を変更しました`);
    }
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      // 1時間猶予
      disconnectTimers[socket.id] = setTimeout(() => {
        io.to(user.room).emit("chatMessage", `${user.name} が退出しました`);
        delete users[socket.id];
        delete disconnectTimers[socket.id];
      }, 3600000);
    }
  });

  socket.on("reconnectUser", () => {
    const user = users[socket.id];
    if (user && disconnectTimers[socket.id]) {
      clearTimeout(disconnectTimers[socket.id]);
      delete disconnectTimers[socket.id];
      io.to(user.room).emit("chatMessage", `${user.name} が再接続しました`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
