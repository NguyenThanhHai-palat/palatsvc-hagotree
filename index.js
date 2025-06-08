
require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { MongoClient } = require("mongodb");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
let db;

// Connect MongoDB
async function connectMongo() {
  try {
    await client.connect();
    db = client.db("palatdb");
    console.log("✅ Đã kết nối MongoDB");
  } catch (err) {
    console.error("❌ Kết nối MongoDB thất bại:", err);
  }
}
connectMongo();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json({ limit: "25mb" }));

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// === ROUTES ===

// GET
app.get("/", (req, res) => {
  res.status(200).json({ message: "SERVER HAGOTREE (MongoDB version)" });
});

app.get("/get-posts", async (req, res) => {
  try {
    const posts = await db.collection("posts").find().toArray();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi đọc dữ liệu bài viết." });
  }
});

// POST: Upload bài viết
app.post("/upload-post", async (req, res) => {
  const { title, content, image } = req.body;

  const post = {
    title,
    content,
    image: image || "",
    createdAt: new Date().toISOString(),
  };

  try {
    await db.collection("posts").insertOne(post);
    res.status(201).send("Đăng bài thành công.");
  } catch (err) {
    res.status(500).json({ error: "Lỗi đăng bài." });
  }
});

// POST: Đặt hàng
app.post("/dat-hang", async (req, res) => {
  try {
    await db.collection("don-hang").insertOne(req.body);
    res.send({ message: "Đơn hàng đã được lưu" });
  } catch (err) {
    res.status(500).send("Lỗi lưu đơn hàng");
  }
});

// POST: Lấy đơn hàng theo email
app.post("/get-don-hang", async (req, res) => {
  const { email } = req.body;
  try {
    const result = await db.collection("don-hang").find({
      $or: [{ email }, { registerEmail: email }]
    }).toArray();

    if (result.length === 0) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).send("Lỗi truy vấn đơn hàng");
  }
});

// POST: Đăng ký
app.post("/dang-ky", async (req, res) => {
  try {
    await db.collection("users").insertOne(req.body);
    res.status(201).send();
  } catch (err) {
    res.status(500).send("Lỗi đăng ký");
  }
});

// POST: Đăng nhập
app.post("/dang-nhap", async (req, res) => {
  const { loginEmail, loginPassword } = req.body;
  try {
    const user = await db.collection("users").findOne({
      registerEmail: loginEmail,
      registerPassword: loginPassword
    });
    if (user) return res.status(201).json({ message: "Đăng nhập thành công!" });
    res.status(401).json({ message: "Sai email hoặc mật khẩu" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi đăng nhập" });
  }
});

// POST: Gửi feedback
app.post("/feedback", async (req, res) => {
  try {
    await db.collection("feedback").insertOne(req.body);
    res.status(201).send();
  } catch (err) {
    res.status(500).send("Lỗi gửi feedback");
  }
});

// POST: Gửi liên hệ
app.post("/lien-he", async (req, res) => {
  try {
    await db.collection("lien-he").insertOne(req.body);
    res.status(201).send();
  } catch (err) {
    res.status(500).send("Lỗi gửi liên hệ");
  }
});

// POST: Xác nhận đơn hàng
app.post("/xac-nhan-don", async (req, res) => {
  const { MaGiaoDich } = req.body;
  try {
    const result = await db.collection("don-hang").updateOne(
      { MaGiaoDich },
      { $set: { Ttdon: "Đã xác nhận, chờ đóng gói và vận chuyển" } }
    );
    if (result.modifiedCount === 0) return res.status(404).send("Không tìm thấy đơn hàng");
    res.status(201).send();
  } catch (err) {
    res.status(500).send("Lỗi cập nhật đơn hàng");
  }
});
app.post("/huy-don", async (req, res) => {
  const { MaGiaoDich } = req.body;
  try {
    const result = await db.collection("don-hang").updateOne(
      { MaGiaoDich },
      { $set: { Ttdon: "Đã bị hủy" } }
    );
    if (result.modifiedCount === 0) return res.status(404).send("Không tìm thấy đơn hàng");
    res.status(201).send();
  } catch (err) {
    res.status(500).send("Lỗi hủy đơn hàng");
  }
});

// POST: Xác nhận đơn xong
app.post("/xac-nhan-don-xong", async (req, res) => {
  const { MaGiaoDich } = req.body;
  try {
    const result = await db.collection("don-hang").updateOne(
      { MaGiaoDich },
      { $set: { Ttdon: "Hoàn thành đơn" } }
    );
    if (result.modifiedCount === 0) return res.status(404).send("Không tìm thấy đơn hàng");
    res.status(201).send();
  } catch (err) {
    res.status(500).send("Lỗi xác nhận đơn hàng");
  }
});

// POST: Lấy thông tin người dùng
app.post("/get-user", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await db.collection("users").findOne({ registerEmail: email });
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng." });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Lỗi truy vấn người dùng." });
  }
});

// POST: Đăng nhập admin
app.post("/admin", async (req, res) => {
  const { loginEmail, loginPassword } = req.body;
  try {
    const admin = await db.collection("admin").findOne({
      registerEmail: loginEmail,
      registerPassword: loginPassword
    });
    if (admin) return res.status(202).json({ message: "Đăng nhập thành công!" });
    res.status(401).json({ message: "Sai email hoặc mật khẩu" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi đăng nhập admin" });
  }
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
