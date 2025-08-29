const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const users = {}; // userId -> { name, room, socketId }
const disconnectTimers = {}; // socketId -> timeout

io.on("connection", (socket) => {
  console.log("a user connected");

  // ルーム参加
  socket.on("joinRoom", (roomKey, userName, userId) => {
    // 再接続の場合、古いsocketIdのタイマーをクリア
    if (users[userId] && disconnectTimers[users[userId].socketId]) {
      clearTimeout(disconnectTimers[users[userId].socketId]);
      delete disconnectTimers[users[userId].socketId];
    }

    users[userId] = { name: userName, room: roomKey, socketId: socket.id };
    socket.join(roomKey);
    io.to(roomKey).emit("chatMessage", `${userName} が入室しました！`);
  });

  // メッセージ送信
  socket.on("sendMessage", (msg) => {
    const user = Object.values(users).find(u => u.socketId === socket.id);
    if (user) {
      io.to(user.room).emit("chatMessage", `${user.name}: ${msg}`);
    }
  });

  // 名前変更
  socket.on("changeName", (newName) => {
    const user = Object.values(users).find(u => u.socketId === socket.id);
    if (user) {
      const oldName = user.name;
      user.name = newName;
      io.to(user.room).emit("chatMessage", `${oldName} が ${newName} に名前を変更しました`);
    }
  });

  // 切断
  socket.on("disconnect", () => {
    const user = Object.values(users).find(u => u.socketId === socket.id);
    if (user) {
      // 1時間猶予して退出扱い
      disconnectTimers[socket.id] = setTimeout(() => {
        io.to(user.room).emit("chatMessage", `${user.name} が退出しました`);
        delete users[Object.keys(users).find(k => users[k].socketId === socket.id)];
        delete disconnectTimers[socket.id];
      }, 3600000); // 1時間
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});
