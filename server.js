const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const iconv = require("iconv-lite");
const bodyParser = require("body-parser");
const app = express();
const port = 3000;
const otps = {}; // email -> { code, expires }
const axios = require('axios');
const xlsx = require("xlsx");
const nodemailer = require("nodemailer");
const atob = (base64) => Buffer.from(base64, 'base64').toString('binary');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "public", "image");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}${ext}`;
    cb(null, filename);
  },
});
const storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = path.join(__dirname, "dataupload"); 
    cb(null, dest); 
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Tên file sẽ giữ nguyên
  },
});
const uploadDir = path.join(__dirname, "baiviet");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage3 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Tên file = timestamp
  },
});
const upload3 = multer({ storage: storage3 });
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.originalUrl}`);
  next();
});
const upload2 = multer({ storage: storage2 });
const dataFilePath = path.join("./public/data.json");
app.use(express.json({ limit: '25mb' }));
const upload = multer({ storage: storage });
const uploadFields = upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "detailImages", maxCount: 10 },
]);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.get("/image/:name", (req, res) => {
  const fileName = req.params.name;
  const filePath = path.join(__dirname, "public", "image", fileName);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).send("Ảnh không tồn tại!");
    }
    res.sendFile(filePath);
  });
});
app.post("/upload-questions", upload2.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const workbook = xlsx.readFile(req.file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  let data = {};

  rows.forEach(row => {
    const made = row["made"];
    if (!data[made]) data[made] = [];
    data[made].push({
      question: row["question"],
      options: [row["A"], row["B"], row["C"], row["D"]],
      answer: row["answer"] 
    });
  });

  fs.writeFileSync(path.join(__dirname, "private", "questions.json"), JSON.stringify(data, null, 2));
  res.json({ success: true, codes: Object.keys(data) });
});

app.get("/get-de-game/:made", (req, res) => {
  const file = path.join(__dirname, "private", "questions.json");
  if (!fs.existsSync(file)) return res.status(404).json({ error: "No questions" });
  const data = JSON.parse(fs.readFileSync(file));
  const made = req.params.made;
  if (!data[made]) return res.status(404).json({ error: "Invalid made" });
  res.json(data[made].map(q => ({
    question: q.question,
    options: q.options
  })));
});

app.post("/checkvar-gamecauhoi", (req, res) => {
  const { made, answers } = req.body;
  const file = path.join(__dirname, "private", "questions.json");
  if (!fs.existsSync(file)) return res.status(404).json({ error: "No questions" });
  const data = JSON.parse(fs.readFileSync(file));
  const questions = data[made];
  if (!questions) return res.status(400).json({ error: "Invalid made" });

  let score = 0;
  questions.forEach((q, i) => {
    if (q.answer === q.options[answers[i]]) score++;
  });

  res.json({ score, total: questions.length });
});
app.get("/", (req, res) => {
  res.status(201).json({ message: "SERVER - HAGOTREE - PALAT SERVICE  -  v:1.1" });
});
app.get("/dh", (req, res) => {
  res.sendFile(__dirname + "/public/don-hang.json");
});
app.get("/fb", (req, res) => {
  res.sendFile(__dirname + "/public/feedback.json");
});
app.get("/lh", (req, res) => {
  res.sendFile(__dirname + "/public/lien-he.json");
});
app.get("/sp/12", (req, res) => {
  res.sendFile(__dirname + "/public/sp.json");
});

app.get("/voucher", (req, res) => {
 res.sendFile(__dirname + "/public/voucher.json");
});

app.post("/update-point", (req, res) => {
  const { email, gameId, newPoint } = req.body;

  if (!email || !gameId || newPoint === undefined) {
    return res.status(400).json({ error: "failed" });
  }

  let data = {};
  if (fs.existsSync(path.join(__dirname, "private", "listpointplayer.json"))) {
    data = JSON.parse(fs.readFileSync(path.join(__dirname, "private", "listpointplayer.json")));
  }

  if (!data[email]) {
    data[email] = {};
  }

  data[email][gameId] = newPoint;

  fs.writeFileSync(path.join(__dirname, "private", "listpointplayer.json"), JSON.stringify(data, null, 2));

  return res.json({ success: true, data: data[email] });
});
app.get("/points/:email", (req, res) => {
  const email = req.params.email;

  let data = {};
  if (fs.existsSync(path.join(__dirname, "private", "listpointplayer.json"))) {
    data = JSON.parse(fs.readFileSync(path.join(__dirname, "private", "listpointplayer.json")));
  }

  return res.json({ email, points: data[email] || {} });
});

app.get('/xem-thanh-toan', async (req, res) => {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;

    if (ip.startsWith("::ffff:")) {
        ip = ip.replace("::ffff:", "");
    }
    if (ip === "::1") {
        ip = "YOUR_PUBLIC_IP"; // thay bằng IP thật để test
    } 

    const userAgent = req.headers['user-agent'];

    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        const data = response.data;

        console.log(`--- Người truy cập mới ---`);
        console.log(`IP: ${ip}`);
        console.log(`Country: ${data.country}`);
        console.log(`City: ${data.city}`);
        console.log(`ISP: ${data.isp}`);
        console.log(`Lat/Lon: ${data.lat}, ${data.lon}`);
        console.log(`Timezone: ${data.timezone}`);
        console.log(`User-Agent: ${userAgent}`);
        console.log('---------------------------');

        res.send(`
            <h2>Không truy cập được</h2>`);
    } catch (error) {
        console.error('Lỗi lấy thông tin IP:', error);
    }
});
  
app.post("/voucher", (req, res) => {
  const voucherData = req.body;
  const filePath = path.join(__dirname, "public", "voucher.json");
  // Đọc file hiện tại
  let existing = [];
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    try {
      existing = JSON.parse(content);
    } catch (err) {
      console.error("Không đọc được JSON:", err);
    }
  }

  // Thêm voucher mới
  existing.push({
    ...voucherData,
    id: Date.now()
  });

  // Ghi vào file
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), "utf-8");

  res.json({ success: true, message: "Voucher Da Tao Thanh Cong" });
});


app.post("/use-voucher", (req, res) => {
  const { voucherCode } = req.body;

  if (!voucherCode) {
    return res.status(400).json({ success: false, message: "Thiếu mã voucher." });
  }

  const jsonPath = path.join(__dirname, "public", "voucher.json");

  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu." });
  }

  const data = fs.readFileSync(jsonPath, "utf8");
  let vouchers = [];

  try {
    vouchers = JSON.parse(data);
  } catch (err) {
    return res.status(500).json({ success: false, message: "Lỗi dữ liệu." });
  }

  const voucher = vouchers.find(v => v.voucherCode === voucherCode);

  if (!voucher) {
    return res.status(404).json({ success: false, message: "Mã không tồn tại." });
  }

  const now = new Date();
  const dateFrom = new Date(voucher.dateFrom);
  const dateTo = new Date(voucher.dateTo);

  if (now < dateFrom) {
    return res.status(400).json({ success: false, message: "Chưa đến thời gian áp dụng." });
  }

  if (now > dateTo) {
    return res.status(400).json({ success: false, message: "Voucher đã hết hạn." });
  }

  return res.json({ success: true, voucher });
});


async function sendOTPEmail(toEmail, otp) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "ngthhai1207@gmail.com",
      pass: "zzkxptpnmqfaidzb",
    },
  });

  let info = await transporter.sendMail({
    from: '"Hago Tree" <noreply@hagotree.site>',
    to: toEmail,
    subject: "Xác nhận email - HagoTree",

    html: `<div style="max-width:400px;margin:0 auto;padding:20px;background:#ffffff;border-radius:8px;font-family:Arial,sans-serif;text-align:center;border:1px solid #e0e0e0;">
  <img src="https://hagotree.site/IMG/logo%202.png" width="100px">
  <h1 style="font-size:20px;color:#222;margin-bottom:10px;">Mã xác nhận</h1>
  <p style="font-size:14px;color:#555;margin-bottom:16px;">Đây là mã của bạn:</p>
  <div style="font-size:24px;font-weight:bold;letter-spacing:4px;background:#f2f7f3;color:#222;padding:16px 0;border-radius:6px;margin-bottom:16px;">
    ${otp}
  </div>
  <p style="font-size:12px;color:#d32f2f;margin-bottom:16px;"><strong>Không chia sẻ cho bất kỳ ai kể cả nhân viên Hago Tree.</strong></p>
  <p style="font-size:12px;color:#888;">Gửi từ: <b>noreply@hagotree.site</b></p>
</div>`,});

  console.log("Email sent: %s", info.messageId);
}


function storeOTP(email, otp) {
  otps[email] = {
    code: otp,
    expires: Date.now() + 5 * 60 * 1000 
  };
}
function verifyOTP(email, inputOtp) {
  const record = otps[email];
  if (!record) return false;
  if (Date.now() > record.expires) return false;
  return record.code === inputOtp;
}
function generateOTP(length = 8) {
  let digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const otp = generateOTP();
  storeOTP(email, otp);
  await sendOTPEmail(email, otp);
  res.status(200).json({ success: true, message: "OTP sent!" });

});

app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (verifyOTP(email, otp)) {
    res.status(200).json({ success: true, message: "OTP verified!" });

  } else {
   res.status(400).json({ success: false, message: "Invalid or expired OTP." });
  }
});



app.post("/used-voucher", (req, res) => {
  const { voucherCode } = req.body;
  console.log(voucherCode);

  if (!voucherCode) {
    return res.status(400).json({ success: false, message: "Thiếu mã voucher." });
  }

  const jsonPath = path.join(__dirname, "public", "voucher.json");

  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ success: false, message: "Không tìm thấy file dữ liệu." });
  }

  let vouchers;
  try {
    const raw = fs.readFileSync(jsonPath, "utf8");
    vouchers = JSON.parse(raw);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Lỗi đọc file." });
  }

  const index = vouchers.findIndex(v => v.voucherCode === voucherCode);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Voucher không tồn tại." });
  }

  const voucher = vouchers[index];

  // Xử lý số
  let use = parseInt(voucher.use || 0);
  let maxUsed = parseInt(voucher.maxUsed || 0);

  console.log( use, "/", maxUsed);

  if (use >= maxUsed) {
    return res.status(400).json({ success: false, message: "Voucher đã hết lượt sử dụng." });
  }

  use++;
  vouchers[index].use = use;

  console.log(use);

  fs.writeFile(jsonPath, JSON.stringify(vouchers, null, 2), (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Không thể ghi file." });
    }

    console.log("📁 Đã ghi thành công file voucher.json");
    return res.status(201).json({ success: true, voucher: vouchers[index] });
  });
});

app.post("/del-voucher", (req, res) => {
  const { voucherCode } = req.body;
  console.log(req.body)
  if (!voucherCode) {
    return res.status(400).send("Thiếu mã voucher.");
  }

  const jsonPath = path.join(__dirname, "public", "voucher.json");

   fs.readFile(jsonPath, "utf8", (err, data) => {
    if (err) {
      console.error("Lỗi đọc file:", err);
      return res.status(500).send("Lỗi đọc dữ liệu đơn hàng.");
    }

    let orders;
    try {
      orders = JSON.parse(data);
    } catch (e) {
      console.error("Lỗi parse JSON:", e);
      return res.status(500).send("Lỗi dữ liệu đơn hàng.");
    }

    const originalLength = orders.length;
    orders = orders.filter(order => order.voucherCode !== voucherCode);

    if (orders.length === originalLength) {
      return res.status(404).send("Không tìm thấy đơn hàng cần xóa.");
    }

    fs.writeFile(jsonPath, JSON.stringify(orders, null, 2), (err) => {
      if (err) {
        console.error("Lỗi ghi file:", err);
        return res.status(500).send("Lỗi ghi file sau khi xóa.");
      }

      return res.status(201).send("Đơn hàng đã được xóa.");
    });
  });
});

//post sản phẩm
app.use(express.static("data"));

app.post("/save", (req, res) => {
  const data = req.body;
  let existingData = [];

  try {
    existingData = JSON.parse(fs.readFileSync(dataFilePath, "utf8")) || [];
  } catch (error) {
    console.error("Error reading existing data:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while reading data." });
  }

  existingData.push(data);

  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(existingData));
    res.json({ message: "Data saved successfully!" });
  } catch (error) {
    console.error("Error writing data:", error);
    res.status(500).json({ error: "An error occurred while saving data." });
  }
});
app.post('/updatesp', (req, res) => {
  const { index, product } = req.body;

  if (typeof index !== 'number' || typeof product !== 'object') {
    return res.status(400).send('Thiếu hoặc sai dữ liệu.');
  }

  const filePath = path.join(__dirname, 'public', 'sp.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Không đọc được dữ liệu.');

    let products = [];
    try {
      products = JSON.parse(data);
    } catch (e) {
      return res.status(500).send('Lỗi dữ liệu JSON.');
    }

    if (!products[index]) {
      return res.status(404).send('Không tìm thấy sản phẩm để cập nhật.');
    }

    const updated = {
      ...products[index], 
      ...product          
    };

    products[index] = updated;

    fs.writeFile(filePath, JSON.stringify(products, null, 2), err => {
      if (err) return res.status(500).send('Không ghi được dữ liệu.');
      res.status(200).send('Đã cập nhật sản phẩm.');
    });
  });
});

app.post("/update-user", (req, res) => {
  const updateData = req.body;

  if (!updateData.registerEmail) {
    return res.status(400).json({ success: false, message: "Thiếu email để xác định người dùng" });
  }

  const filePath = path.join(
    __dirname,
    "public",
    "danh-sach-khach-hang-dang-ky.json"
  );

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Lỗi đọc file:", err);
      return res.status(500).json({ success: false, message: "Lỗi đọc file người dùng" });
    }

    let users = [];
    try {
      users = JSON.parse(data);
    } catch (parseErr) {
      console.error("Lỗi parse JSON:", parseErr);
      return res.status(500).json({ success: false, message: "Lỗi định dạng dữ liệu" });
    }
    const index = users.findIndex(u => u.registerEmail === updateData.registerEmail);
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    }
    users[index].registerName = updateData.registerName || users[index].registerName;
    users[index].sdt = updateData.sdt || users[index].sdt;
    users[index].address = updateData.address || users[index].address;
    if (updateData.registerPassword) {
      users[index].registerPassword = updateData.registerPassword;
      users[index].registerPasswordConfirm = updateData.registerPassword;
    }

    // Ghi lại file
    fs.writeFile(filePath, JSON.stringify(users, null, 2), (writeErr) => {
      if (writeErr) {
        console.error("Lỗi ghi file:", writeErr);
        return res.status(500).json({ success: false, message: "Không thể cập nhật dữ liệu" });
      }

      res.json({ success: true, message: "Cập nhật thành công" });
    });
  });
});
app.get("/get-posts", (req, res) => {
  const jsonPath = path.join(__dirname, "public", "upload-content.json");

  fs.readFile(jsonPath, "utf8", (err, data) => {
    if (err) {
      console.error("Lỗi đọc file:", err);
      return res.status(500).json({ error: "Không đọc được bài viết." });
    }

    try {
      const posts = JSON.parse(data);
      res.json(posts);
    } catch (parseErr) {
      console.error("Lỗi parse JSON:", parseErr);
      res.status(500).json({ error: "Dữ liệu bị lỗi." });
    }
  });
});
app.post("/upload-post", uploadFields, (req, res) => {
  const { title, cost, content, tag } = req.body;

  const mainImageFile = req.files["mainImage"]?.[0];
  const detailImageFiles = req.files["detailImages"] || [];
  const detailImagePaths = detailImageFiles.map((f) => `/image/${f.filename}`);
  const imageFilename = mainImageFile ? `/image/${mainImageFile.filename}` : "";
  const jsonPath = path.join(__dirname, "public", "sp.json");
  let posts = [];

  if (fs.existsSync(jsonPath)) {
    try {
      const jsonContent = fs.readFileSync(jsonPath, "utf8");
      posts = JSON.parse(jsonContent);
    } catch (err) {
      console.error("Lỗi đọc JSON:", err);
    }
  }

  const newId = `sp_${new Date().toISOString().replace(/[-:.TZ]/g, '')}`;

  const post = {
    id: newId,
    title,
    content,
    cost,
    image: imageFilename,
    detailImages: detailImageFiles.map((f) => `/image/${f.filename}`),
    tag_product: tag,
    createdAt: new Date().toISOString(),
  };

  posts.push(post);
  fs.writeFileSync(jsonPath, JSON.stringify(posts, null, 2));

  res.status(201).send("Đăng bài thành công.");
});

app.post("/feedback", express.json({ limit: "10mb" }), (req, res) => {
  const { star,idsp,product,feedback,email,image } = req.body;
  let imageFilename = "";
  if (image && image.startsWith("data:image")) {
    const matches = image.match(/^data:(image\/.+);base64,(.+)$/);
    if (matches) {
      const ext = matches[1].split("/")[1];
      const data = matches[2];
      imageFilename = `${Date.now()}.${ext}`;
      const imagePath = path.join(__dirname, "public", "image", imageFilename);
      fs.writeFileSync(imagePath, Buffer.from(data, "base64"));
    }
  }
   const feedbackdata1 = {
    star,
    idsp,
    product,
   feedback,
    email,
    image: imageFilename ? `/image/${imageFilename}` : "",
    createdAt: new Date().toISOString(),
  };

  const filePath = path.join(__dirname, "public", "feedback.json");
  let json = [];
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf8");
    try {
      json = JSON.parse(content);
    } catch (err) {
      console.error("Lỗi đọc JSON:", err);
    }
  }
  json.push(feedbackdata1);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
  res.status(201).send("Đăng bài thành công.");

});



app.post("/dat-hang", (req, res) => {
  const formData = req.body;
  console.log("Received Form Data:", formData);

  const filePath = path.join(__dirname, "public", "don-hang.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      console.error("Error reading file:", err);
      return res.status(500).send("Error reading file");
    }

    let json = [];
    if (data) {
      try {
        json = JSON.parse(data);
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        return res.status(500).send("Error parsing JSON");
      }
    }
    json.push(formData);
    fs.writeFile(filePath, JSON.stringify(json, null, 2), (writeError) => {
      if (writeError) {
        console.error("Error writing file:", writeError);
        return res.status(500).send("Error writing file");
      }
      console.log("Form data saved to wait.json");
      res.send({ message: "Form data received and saved" });
    });
  });
});
app.post("/upload-html", upload3.single("htmlfile"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Không có file nào được upload" });
  if (!req.body.title) return res.status(400).json({ error: "Thiếu title" });

  const fileName = req.file.filename;
  const title = req.body.title;
  const descript = req.body.descript;
  const listPath = path.join(__dirname, "listbaiviet.json");
  const createdAt = new Date().toISOString();
  let list = [];
  if (fs.existsSync(listPath)) {
    list = JSON.parse(fs.readFileSync(listPath, "utf-8"));
  }

  list.push({ title, descript, file: fileName,createdAt });

  fs.writeFileSync(listPath, JSON.stringify(list, null, 2));

  res.json({ message: "Upload thành công", file: fileName, title });
});
app.get("/baiviet-load", (req, res) => {
  res.sendFile(__dirname + "/listbaiviet.json");
});

app.get("/list-baiviet-all", (req, res) => {
  const listPath = path.join(__dirname, "listbaiviet.json");
  const uploadDir = path.join(__dirname, "baiviet");

  if (!fs.existsSync(listPath)) {
    return res.json([]);
  }

  const list = JSON.parse(fs.readFileSync(listPath, "utf-8"));
  const result = [];

  list.forEach(item => {
    const filePath = path.join(uploadDir, item.file);
    let content = "";

    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, "utf-8");
    }

    result.push({
      title: item.title,
      descript: item.descript,
      content: content,
      filename: item.file,
      createdAt: item.createdAt
    });
  });

  res.json(result);
});


app.get("/baiviet/:id", (req, res) => {
  const id = req.params.id;
  const listPath = path.join(__dirname, "listbaiviet.json");
  const uploadDir = path.join(__dirname, "baiviet");

  if (!fs.existsSync(listPath)) {
    return res.status(404).send("Không tìm thấy danh sách bài viết");
  }

  const list = JSON.parse(fs.readFileSync(listPath, "utf-8"));
  const post = list.find(item => item.file === id);

  if (!post) {
    return res.status(404).send("Không tìm thấy bài viết");
  }

  const filePath = path.join(uploadDir, post.file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File bài viết không tồn tại");
  }

  res.sendFile(filePath);
});
app.delete("/delete-baiviet/:filename", (req, res) => {
  const fileName = req.params.filename;
  const filePath = path.join(uploadDir, fileName);
  const listPath = path.join(__dirname, "listbaiviet.json");

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File không tồn tại" });
  }
  fs.unlinkSync(filePath);
  let list = [];
  if (fs.existsSync(listPath)) {
    list = JSON.parse(fs.readFileSync(listPath, "utf-8"));
    list = list.filter(item => item.file !== fileName);
    fs.writeFileSync(listPath, JSON.stringify(list, null, 2));
  }

  res.json({ message: "Xóa thành công", file: fileName });
});

app.post("/get-don-hang", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Thiếu email trong request." });
  }

  console.log("Request body:", req.body);

  const filePath = path.join(__dirname, "public", "don-hang.json");

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err || !data) {
      return res.status(500).json({ message: "Không thể đọc dữ liệu người dùng." });
    }

    let users;
    try {
      users = JSON.parse(data);
    } catch (parseErr) {
      return res.status(500).json({ message: "Lỗi phân tích dữ liệu người dùng." });
    }

    // Lấy tất cả đơn hàng của email đó
    const donHangList = users.filter(
      (u) => u.email === email || u.registerEmail === email
    );

    if (donHangList.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng của bạn." });
    }

    return res.status(200).json(donHangList); // trả về danh sách đơn hàng
  });
});

app.post("/s2", (req, res) => {
  const { version } = req.body;
  const filePath = path.join(
    __dirname,
    "public",
    "danh-sach-khach-hang-dang-ky.json"
  );
  if (version !== "krcl-180210812368012841098769010238172") {
    return res.status(403).json({ message: "Sai mã version" });
  }
  fs.readFile(filePath, "utf-8", (err, data) => {
    if (err) return res.status(500).json({ message: "Không đọc được file người dùng" });

    try {
      const json = JSON.parse(data);
      res.json(json);
    } catch (e) {
      res.status(500).json({ message: "Lỗi khi parse JSON người dùng" });
    }
  });
});


app.post("/get-user", (req, res) => {
  let { krlx } = req.body;
  if (!krlx) {
    return res.status(400).json({ message: "Thiếu email trong request." });
  }
  const binaryString = atob(krlx);
  const buffer = Uint8Array.from(binaryString, char => char.charCodeAt(0));
  const email = new TextDecoder().decode(buffer);


  const filePath = path.join(
    __dirname,
    "public",
    "danh-sach-khach-hang-dang-ky.json"
  );

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err || !data) {
      return res
        .status(500)
        .json({ message: "Không thể đọc dữ liệu người dùng." });
    }

    let users;
    try {
      users = JSON.parse(data);
    } catch (parseErr) {
      return res
        .status(500)
        .json({ message: "Lỗi phân tích dữ liệu người dùng." });
    }

    const user = users.find((u) => u.registerEmail === email);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    return res.status(200).json(user);
  });
});

app.post("/dang-ky", (req, res) => {
  const formData = req.body;
  console.log("Received Form Data:", formData);
  formData.createdAt = new Date().toISOString();

  const filePath = path.join(
    __dirname,
    "public",
    "danh-sach-khach-hang-dang-ky.json"
  );

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      console.error("Error reading file:", err);
      return res.status(500).send("Error reading file");
    }

    let json = [];
    if (data) {
      try {
        json = JSON.parse(data);
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        return res.status(500).send("Error parsing JSON");
      }
    }

    json.push(formData);

    fs.writeFile(filePath, JSON.stringify(json, null, 2), (writeError) => {
      if (writeError) {
        console.error("Error writing file:", writeError);
        return res.status(500).send("Error writing file");
      }
      res.status(201).send("Đăng ký thành công");
    });
  });
});

app.post("/lien-he", (req, res) => {
  const formData = req.body;
  console.log("Received Form Data:", formData);

  const filePath = path.join(__dirname, "public", "lien-he.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      console.error("Error reading file:", err);
      return res.status(500).send("Error reading file");
    }

    let json = [];
    if (data) {
      try {
        json = JSON.parse(data);
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        return res.status(500).send("Error parsing JSON");
      }
    }
    json.push(formData);
    fs.writeFile(filePath, JSON.stringify(json, null, 2), (writeError) => {
      if (writeError) {
        console.error("Error writing file:", writeError);
        return res.status(500).send("Error writing file");
      }
      res.status(201).send();
    });
  });
});

app.post("/payment", (req, res) => {
  const formData = req.body;
  console.log("Received Form Data:", formData);

  const filePath = path.join(__dirname, "public", "don-hang.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      console.error("Error reading file:", err);
      return res.status(500).send("Error reading file");
    }

    let json = [];
    if (data) {
      try {
        json = JSON.parse(data);
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        return res.status(500).send("Error parsing JSON");
      }
    }
    json.push(formData);
    fs.writeFile(filePath, JSON.stringify(json, null, 2), (writeError) => {
      if (writeError) {
        console.error("Error writing file:", writeError);
        return res.status(500).send("Error writing file");
      }
      res.status(201).send();
    });
  });
});

app.post("/xac-nhan-don-xong", (req, res) => {
  const { MaGiaoDich } = req.body;
  if (!MaGiaoDich) {
    return res.status(400).send("Thiếu mã giao dịch.");
  }

  const jsonPath = path.join(__dirname, "public", "don-hang.json");

  fs.readFile(jsonPath, "utf8", (err, data) => {
    if (err) {
      console.error("Lỗi đọc file:", err);
      return res.status(500).send("Lỗi đọc dữ liệu đơn hàng.");
    }

    let orders = [];
    try {
      orders = JSON.parse(data);
    } catch (e) {
      console.error("Lỗi parse JSON:", e);
      return res.status(500).send("Lỗi dữ liệu đơn hàng.");
    }
    const found = orders.find(order => order.MaGiaoDich === MaGiaoDich);
    if (!found) {
      return res.status(404).send("Không tìm thấy đơn hàng.");
    }

    found.Ttdon = "Hoàn thành đơn";
    
    fs.writeFile(jsonPath, JSON.stringify(orders, null, 2), (err) => {
      if (err) {
        console.error("Lỗi ghi file:", err);
        return res.status(500).send("Lỗi cập nhật đơn hàng.");
      }

      return res.status(201);
    });
  });
});
app.post("/thoi-gian-giao", (req, res) => {
  const { thoiGianGiao,maGiaoDich } = req.body;
  console.log(req.body)
  if (!maGiaoDich || !thoiGianGiao) {
    return res.status(400).json({ message: "Thiếu mã giao dịch hoặc thời gian giao." });
  }

  const jsonPath = path.join(__dirname, "public", "don-hang.json");

  fs.readFile(jsonPath, "utf8", (err, data) => {
    if (err) {
      console.error("Lỗi đọc file:", err);
      return res.status(500).json({ message: "Lỗi đọc dữ liệu đơn hàng." });
    }

    let orders = [];
    try {
      orders = JSON.parse(data);
    } catch (e) {
      console.error("Lỗi parse JSON:", e);
      return res.status(500).json({ message: "Lỗi dữ liệu đơn hàng." });
    }

    const found = orders.find(order => order.MaGiaoDich === maGiaoDich);
    if (!found) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }

    // ✅ Gán thời gian nhận hàng
    found.TimeNhanHang = thoiGianGiao;

    fs.writeFile(jsonPath, JSON.stringify(orders, null, 2), (err) => {
      if (err) {
        console.error("Lỗi ghi file:", err);
        return res.status(500).json({ message: "Lỗi cập nhật đơn hàng." });
      }

      return res.status(201).json({ message: "Cập nhật thời gian nhận hàng thành công." });
    });
  });
});


app.post("/xoa-don", (req, res) => {
  const { MaGiaoDich } = req.body;
  if (!MaGiaoDich) {
    return res.status(400).send("Thiếu mã giao dịch.");
  }

  const jsonPath = path.join(__dirname, "public", "don-hang.json");

  fs.readFile(jsonPath, "utf8", (err, data) => {
    if (err) {
      console.error("Lỗi đọc file:", err);
      return res.status(500).send("Lỗi đọc dữ liệu đơn hàng.");
    }

    let orders;
    try {
      orders = JSON.parse(data);
    } catch (e) {
      console.error("Lỗi parse JSON:", e);
      return res.status(500).send("Lỗi dữ liệu đơn hàng.");
    }

    const originalLength = orders.length;
    orders = orders.filter(order => order.MaGiaoDich !== MaGiaoDich);

    if (orders.length === originalLength) {
      return res.status(404).send("Không tìm thấy đơn hàng cần xóa.");
    }

    fs.writeFile(jsonPath, JSON.stringify(orders, null, 2), (err) => {
      if (err) {
        console.error("Lỗi ghi file:", err);
        return res.status(500).send("Lỗi ghi file sau khi xóa.");
      }

      return res.status(201).send("Đơn hàng đã được xóa.");
    });
  });
});

app.post('/delsp-pr1', (req, res) => {
  const { index } = req.body;

  if (typeof index !== 'number') {
    return res.status(400).send('Thiếu index hoặc sai kiểu.');
  }

  const filePath = path.join(__dirname, 'public', 'sp.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Không đọc được dữ liệu.');

    let products = [];
    try {
      products = JSON.parse(data);
    } catch (e) {
      return res.status(500).send('Lỗi dữ liệu JSON.');
    }

    if (!products[index]) {
      return res.status(404).send('Không tìm thấy sản phẩm để xóa.');
    }

    products.splice(index, 1); 

    fs.writeFile(filePath, JSON.stringify(products, null, 2), err => {
      if (err) return res.status(500).send('Không ghi được dữ liệu sau khi xóa.');
      res.status(200).send('Đã xóa sản phẩm.');
    });
  });
});

app.post("/huy-don", (req, res) => {
  const { MaGiaoDich } = req.body;
  if (!MaGiaoDich) {
    return res.status(400).send("Thiếu mã giao dịch.");
  }

  const jsonPath = path.join(__dirname, "public", "don-hang.json");

  fs.readFile(jsonPath, "utf8", (err, data) => {
    if (err) {
      console.error("Lỗi đọc file:", err);
      return res.status(500).send("Lỗi đọc dữ liệu đơn hàng.");
    }

    let orders = [];
    try {
      orders = JSON.parse(data);
    } catch (e) {
      console.error("Lỗi parse JSON:", e);
      return res.status(500).send("Lỗi dữ liệu đơn hàng.");
    }
    const found = orders.find(order => order.MaGiaoDich === MaGiaoDich);
    if (!found) {
      return res.status(404).send("Không tìm thấy đơn hàng.");
    }

    found.Ttdon = "Đã bị hủy";
    
    fs.writeFile(jsonPath, JSON.stringify(orders, null, 2), (err) => {
      if (err) {
        console.error("Lỗi ghi file:", err);
        return res.status(500).send("Lỗi cập nhật đơn hàng.");
      }

      return res.status(201);
    });
  });
});
app.post("/xac-nhan-don", (req, res) => {
  const { MaGiaoDich } = req.body;
  console.log(MaGiaoDich);

  if (!MaGiaoDich) {
    return res.status(400).send("Thiếu mã giao dịch.");
  }

  const jsonPath = path.join(__dirname, "public", "don-hang.json");

  fs.readFile(jsonPath, "utf8", (err, data) => {
    if (err) {
      console.error("Lỗi đọc file:", err);
      return res.status(500).send("Lỗi đọc dữ liệu đơn hàng.");
    }

    let orders = [];
    try {
      orders = JSON.parse(data);
    } catch (e) {
      console.error("Lỗi parse JSON:", e);
      return res.status(500).send("Lỗi dữ liệu đơn hàng.");
    }
    const found = orders.find(order => order.MaGiaoDich === MaGiaoDich);
    if (!found) {
      return res.status(404).send("Không tìm thấy đơn hàng.");
    }

    found.Ttdon = "Đã xác nhận, chờ đóng gói và vận chuyển";
    
    fs.writeFile(jsonPath, JSON.stringify(orders, null, 2), (err) => {
      if (err) {
        console.error("Lỗi ghi file:", err);
        return res.status(500).send("Lỗi cập nhật đơn hàng.");
      }

      return res.status(201);
    });
  });
});
app.post("/dang-nhap", (req, res) => {
  const formData = req.body;
  const { loginEmail, loginPassword } = req.body;
  console.log("Received Form Data:", formData, loginEmail, loginPassword);
  const filePath = path.join(
    __dirname,
    "public",
    "danh-sach-khach-hang-dang-ky.json"
  );
  fs.readFile(filePath, "utf-8", (err, data) => {
    if (err) return res.status(500).json({ error: "Lỗi đọc file dữ liệu" });

    let users;
    try {
      users = JSON.parse(data);
    } catch (parseErr) {
      return res.status(500).json({ error: "Lỗi phân tích JSON" });
    }

    const user = users.find(
      (u) =>
        u.registerEmail === loginEmail && u.registerPassword === loginPassword
    );

    if (user) {
      return res.status(201).json({ error: "OK" });;
      console.error("Logining");
    } else {
      return res.status(401).json({ message: "Sai email hoặc mật khẩu" });
    }
  });
});

app.post("/admin", (req, res) => {
  const formData = req.body;
  const { loginEmail, loginPassword } = req.body;
  console.log("Received Form Data:", formData, loginEmail, loginPassword);
  const filePath = path.join(
    __dirname,
    "public",
    "admnin.json"
  );
  fs.readFile(filePath, "utf-8", (err, data) => {
    if (err) return res.status(500).json({ error: "Lỗi đọc file dữ liệu" });

    let users;
    try {
      users = JSON.parse(data);
    } catch (parseErr) {
      return res.status(500).json({ error: "Lỗi phân tích JSON" });
    }

    const user = users.find(
      (u) =>
        u.registerEmail === loginEmail && u.registerPassword === loginPassword
    );

    if (user) {
      return res.status(202).json({ message: "Đăng nhập thành công!" });
      console.error("Logining");
    } else {
      return res.status(401).json({ message: "Sai email hoặc mật khẩu" });
    }
  });
});
app.post("/lg-60/Post", express.json(), (req, res) => {
  const { email, password } = req.body;

  if (email && password) {
    const filePath = path.join(__dirname, "private", "user.json");

    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading file:", err);
        res.status(500).send("Internal Server Error");
        return;
      }

      try {
        const users = JSON.parse(data);

        const emailInput = email.trim().toLowerCase();
        const matchedEmail = Object.keys(users).find(
          key => key.trim().toLowerCase() === emailInput
        );
        console.log("Login user:", email);
        if (matchedEmail && users[matchedEmail].password === password) {
          res.status(200).send("OK");
        } else if (matchedEmail) {
          res.status(200).send("NO");
        } else {
          res.status(200).send("NO EMAIL");
        }

      } catch (parseErr) {
        console.error("Error parsing JSON:", parseErr);
        res.status(500).send("Internal Server Error");
      }
    });
  } else {
    res.status(400).send("Bad Request");
  }
});
app.post("/key-start/Post", express.json(), (req, res) => {
  const { key } = req.body;

 
        if (key=="8955pltapp432") {
          res.status(200).send(`OK`);
        } else {
          res.status(200).send("Error: Key is incorrect");
        }


});
app.get("/list-get", (req, res) => {res.sendFile(__dirname + "/private/musicupload.json");});
app.post("/lg-60-cgpass/Post", express.json(), (req, res) => {
  const { email } = req.body;

  if (email) {
    const filePath = path.join(__dirname, "private", "user.json");

    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading file:", err);
        res.status(500).send("Internal Server Error");
        return;
      }

      try {
        const users = JSON.parse(data);

        if (users[email]) {
          res.status(200).send(`${users[email].password}`);
        } else {
          res.status(200).send("UnEmail");
        }
      } catch (parseErr) {
        console.error("Error parsing JSON:", parseErr);
        res.status(500).send("Internal Server Error");
      }
    });
  } else {
    res.status(400).send("ERRORFROMSERVER-400");
  }
});
app.post("/sgu-60/Post", express.json(), (req, res) => {
  const { email, password } = req.body;

  if (email && password) {
    const filePath = path.join(__dirname, "private", "user.json");

    fs.readFile(filePath, "utf8", (err, data) => {
      if (err && err.code !== "ENOENT") {
        console.error("Error reading file:", err);
        res.status(500).send("Internal Server Error");
        return;
      }

      let jsonData = {};
      if (data) {
        try {
          jsonData = JSON.parse(data);
        } catch (parseErr) {
          console.error("Error parsing JSON:", parseErr);
          res.status(500).send("Internal Server Error");
          return;
        }
      }

      if (jsonData[email]) {
        res.status(200).send("SAME");
      } else {
        jsonData[email] = { password };

        fs.writeFile(
          filePath,
          JSON.stringify(jsonData, null, 4),
          (writeErr) => {
            if (writeErr) {
              console.error("Error writing to file:", writeErr);
              res.status(500).send("Internal Server Error");
            } else {
              console.log("Updated user.json:", jsonData);
              res.status(200).send("OK");
            }
          }
        );
      }
    });
  } else {
    res.status(400).send("Bad Request");
  }
});


function decodeMimeWord(encoded) {
  const match = encoded.match(/=\?(.+?)\?(B|Q)\?(.+?)\?=/i);
  if (!match) return encoded;

  const charset = match[1];
  const encoding = match[2].toUpperCase();
  const text = match[3];

  if (encoding === "B") {
    const buffer = Buffer.from(text, "base64");
    return iconv.decode(buffer, charset); // Dùng iconv để decode chính xác
  }

  if (encoding === "Q") {
    const decoded = text.replace(/_/g, " ").replace(/=([A-Fa-f0-9]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
    return iconv.decode(Buffer.from(decoded, "binary"), charset);
  }

  return encoded;
}


// Route nhận file mp3
app.post("/uploadmusic-byte/Post", upload2.single("mp3up"), (req, res, next) => {
  const file = req.file;
  console.log("📦 req.body:", req.body);

  if (!file) {
    return res.status(400).send("❌ Không nhận được file");
  }

  // Parse JSON kèm theo
  const jsonString = req.body["application/json"];
  let jsonObj;

  try {
    jsonObj = JSON.parse(jsonString);
  } catch (e) {
    return res.status(400).send("❌ Lỗi JSON đầu vào");
  }

  const rawName = jsonObj.name;
  if (!rawName) {
    return res.status(400).send("❌ Thiếu tên file trong JSON");
  }

  // ✅ Decode MIME nếu cần và lọc tên an toàn
  const decodedName = decodeMimeWord(rawName);
  let namex = rawName;
const match = rawName.match(/=\?(.+?)\?(B|Q)\?(.+?)\?=/i);

if (match) {
  try {
    namex = decodeMimeWord(rawName);
  } catch (e) {
    console.error("❌ Lỗi khi decode MIME:", e);
    return res.status(400).send("Tên file không hợp lệ");
  }
}
 // loại ký tự cấm
  console.log("🎧 Tên file sau decode:", namex);

  // 🔥 multer lưu file tạm với tên random → cần rename lại
  const currentPath = path.join(file.destination, file.filename);
namex = namex.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();

  const finalPath = path.join(file.destination, namex);

  fs.rename(currentPath, finalPath, (err) => {
    if (err) {
      console.error("❌ Lỗi đổi tên file:", err);
      return res.status(500).send("Lỗi đổi tên file");
    }

    console.log("✅ File đã được đổi tên:", finalPath);

    const directoryPath = path.join(__dirname, "dataupload");

    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        console.error("❌ Lỗi đọc thư mục:", err);
        return res.status(500).send("Lỗi đọc thư mục");
      }

      const mp3Files = files.filter((file) => path.extname(file) === ".mp3");
      fs.writeFile("music.json", JSON.stringify(mp3Files), (err) => {
        if (err) {
          console.error("❌ Lỗi ghi music.json:", err);
          return res.status(500).send("Lỗi ghi danh sách nhạc");
        }

        console.log("✅ Danh sách nhạc đã được cập nhật.");
        res.status(200).send("OK");
      });
    });
  });
});


app.post("/uploadmusic-user/Post", express.json(), (req, res) => {
  const { name, user, rev } = req.body;
  console.log(req.body);
  const filePath = path.join(__dirname, "private", "musicupload.json");

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      console.error(err);
      return res.status(500).send("Error reading file");
    }

    let users = [];
    if (data) {
      try {
        users = JSON.parse(data);
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr);
      }
    }
    users.push({
      name,
      user,
      rev,
      timestamp: Date.now() 
    });

    fs.writeFile(filePath, JSON.stringify(users, null, 2), (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error writing file");
      }
      res.status(200).send("OK");
    });
  });
});

app.get("/music-get/:name", (req, res) => {
  const name = req.params.name;
  const mp3Path = path.join(__dirname, "dataupload", name);
  const jsonPath = path.join(__dirname, "private", "musicupload.json");

  if (!fs.existsSync(mp3Path)) {
    return res.status(404).send("File not found");
  }

  fs.readFile(jsonPath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading metadata:", err);
      return res.status(500).send("Internal server error");
    }

    let uploads = [];
    if (data) {
      try {
        uploads = JSON.parse(data);
      } catch (e) {
        return res.status(500).send("Corrupted metadata file");
      }
    }

    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;

    const fileMeta = uploads.find(u => u.name === name);

    if (!fileMeta) {
      return res.status(404).send("Metadata not found");
    }

    if (now - fileMeta.timestamp > threeDays) {
      // Xóa file và metadata
      fs.unlink(mp3Path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });

      uploads = uploads.filter(u => u.name !== name);
      fs.writeFile(jsonPath, JSON.stringify(uploads, null, 2), (err) => {
        if (err) console.error("Error updating metadata:", err);
      });

      return res.status(410).send("File expired and deleted");
    }
    res.sendFile(mp3Path);
  });
});


app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
