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
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const atob = (base64) => Buffer.from(base64, 'base64').toString('binary');
const SECRET = "krlc4541ab469930";

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

  
const storageSVC = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = path.join(__dirname, "upload_service"); 
    cb(null, dest); 
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); 
  }
});

const uploadservice = multer({ storage: storageSVC });

const DATA_FILE_SERVICE_UPLOAD = path.join("./data_upload_service.json");



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
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header(
  "Access-Control-Allow-Headers",
  "Origin, X-Requested-With, Content-Type, Accept, Authorization"
);
  next();
});


app.post("/service/2/namhaclub/register", async (req, res) => {
  const {name,classes,yearstudy, email, password } = req.body;
  if (!email || !password) {
  return res.status(400).json({ message: "Thiếu dữ liệu" });
  }
  const iduser = (Date.now() + Math.floor(Math.random() * 1000)) % 1000000;
  const filePathx = path.join(
    __dirname,
    "public",
    "namhaclub2.json"
  );
  let users = [];
    if (fs.existsSync(filePathx)) {
      users = JSON.parse(fs.readFileSync(filePathx));
    }
  const exist = users.find(u => u.email === email);
  if (exist) {
    return res.status(400).json({ message: "Email đã tồn tại" });
  }
  const hashed = await bcrypt.hash(password, 10);

  const newUser = {
    id: iduser,
    name,
    classes,
    yearstudy,
    email,
    password: hashed
  };
  users.push(newUser);
  fs.writeFileSync(filePathx, JSON.stringify(users, null, 2));
  res.json({ message: "OK" });
});

app.post("/service/2/namhaclub/login", async (req, res) => {
  const { email, password } = req.body;
  const filePathx = path.join(
    __dirname,
    "public",
    "namhaclub2.json"
  );
  let users = JSON.parse(fs.readFileSync(filePathx));

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(400).json({ message: "Sai email" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Sai mật khẩu" });
  }

  const token = jwt.sign({ id: user.id }, SECRET, {
    expiresIn: "14d"
  });

  res.json({ token });
});


app.get("/service/2/namhaclub", (req, res) => {
  const filePathx = path.join(
    __dirname,
    "public",
    "namhaclub2.json"
  );
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "Chưa đăng nhập" });
  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    const users = JSON.parse(fs.readFileSync(filePathx));
    const user = users.find(u => u.id === decoded.id);

    res.json({ name: user.name,id: user.id, email: user.email, class: user.classes, year_study: user.yearstudy });
  } catch (err) {
    res.status(401).json({ message: "Token has expired." });
  }
});


app.post("/palatstore/login", (req, res) => {
  const formData = req.body;
  const {useremail} = req.body
  const {pass} = req.body
  console.log("Received Palat Store:", formData);
  const filePath = path.join(
    __dirname,
    "public",
    "palatstoreuser.json"
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
        u.useremail === useremail && u.pass === pass
    );

    if (user) {
      return res.status(201).json({ error: "OK" });;
    } else {
      return res.status(401).json({ message: "Sai email hoặc mật khẩu" });
    }
  });
});
app.post("/palatstore/register", (req, res) => {
  const formData = req.body;
  console.log("Received Palat Store:", formData);
  formData.createdAt = new Date().toISOString();
  const filePath = path.join(
    __dirname,
    "public",
    "palatstoreuser.json"
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
function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}
app.get("/voucher-gameevent", (req, res) => {
  const all = JSON.parse(fs.readFileSync(__dirname + "/public/voucher.json"));
  const gameevent = all.filter(v => v.voucherName === "GAMEEVENT");
  res.json(gameevent);
});


app.post("/dat-hang-tx12a2", (req, res) => {
  const formData = req.body;
  console.log("Received Form Data:", formData);

  const filePath = path.join(__dirname, "public", "checkout12a2.json");
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
      return res.status(200).send("Form data received and saved");
    });
  });
});
app.post('/getidticket2a2', (req, res) => {
  const { id_show } = req.body;

  if (!id_show) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu id_show'
    });
  }

  const filePath = path.join(__dirname, 'public', 'checkout12a2.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Không đọc được dữ liệu'
      });
    }

    const records = JSON.parse(data);

    const result = records.find(
      item =>
        item.id_show === id_show &&
        item.name &&
        item.email
    );

    if (!result) {
      return res.json({
        success: false,
        message: 'Không tìm thấy dữ liệu cho id_show này'
      });
    }

    return res.json({
      success: true,
      data: result
    });
  });
});


app.post("/upload-questions", upload2.single("file"), (req, res) => {
  const workbook = xlsx.readFile(req.file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  let data = {};

  rows.forEach((row) => {
    const made = row["MaDe"] ? String(row["MaDe"]).trim() : "default";

    if (!data[made]) data[made] = [];
    const allOptions = shuffle([
      { text: row["answer"], correct: true },
      { text: row["Đáp án nhiễu 1"], correct: false },
      { text: row["Đáp án nhiễu 2"], correct: false },
      { text: row["Đáp án nhiễu 3"], correct: false }
    ]);

    data[made].push({
      question: row["question"],
      options: allOptions
    });
  });

  fs.writeFileSync(
    path.join(__dirname, "private", "questions.json"),
    JSON.stringify(data, null, 2),
    "utf-8"
  );

  res.json({ success: true, codes: Object.keys(data) });
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


app.post("/uploadmusic-byte/Post", upload2.single("mp3up"), (req, res, next) => {
  const file = req.file;
  console.log("📦 req.body:", req.body);

  if (!file) {
    return res.status(400).send("❌ Không nhận được file");
  }


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

  console.log("🎧 Tên file sau decode:", namex);


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

app.post("/palat-payment/sepayhook", (req, res) => {
  const formData = req.body;
  console.log("Received Form Data:", formData);
  formData.createdAt = new Date().toISOString();

  const filePath = path.join(
    __dirname,
    "public",
    "payment.json"
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
      res.status(201).send("OK");
    });
  });
});
app.get("/checkpayment", (req, res) => {
  const code = req.query.code;
  const amount = parseInt(req.query.amount);

  if (!code || !amount) {
    return res.status(201).json({
      success: false,
      message: "Thiếu mã giao dịch hoặc số tiền"
    });
  }

  const filePath = path.join(__dirname, "public", "payment.json");

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res.status(201).json({
        success: false,
        message: "Không đọc được dữ liệu"
      });
    }

    let json = [];
    try {
      json = JSON.parse(data);
    } catch (e) {
      return res.status(201).json({
        success: false,
        message: "Lỗi JSON"
      });
    }

    // 🔎 tìm giao dịch
    const found = json.find(item => {
      const text = (item.content || "") + " " + (item.description || "");
      return text.includes(code);
    });

    if (!found) {
      return res.status(201).json({
        success: false,
        message: "Chưa tìm thấy giao dịch"
      });
    }
    if (parseInt(found.transferAmount) === amount) {
      return res.status(200).json({
        success: true,
        message: "Thanh toán thành công",
        data: {
          code: code,
          amount: amount,
          bank: found.gateway,
          time: found.transactionDate
        }
      });
    } else {
      return res.status(201).json({
        success: false,
        message: "Sai số tiền",
        expected: amount,
        actual: found.transferAmount
      });
    }
  });
});
app.get("/palat-payment/khachhang", (req, res) => {
  const keyword = req.query.code;
  const filePath = path.join(__dirname, "public", "payment.json");

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res.send("<h2>Lỗi đọc file</h2>");
    }

    let json = [];
    try {
      json = JSON.parse(data);
    } catch (e) {
      return res.send("<h2>Lỗi JSON</h2>");
    }
    let filtered = json.filter(item => {
      const text = (item.content || "") + " " + (item.description || "");
      return text.includes(keyword);
    });

    filtered.sort((a, b) => {
      return new Date(b.transactionDate) - new Date(a.transactionDate);
    });

    let rows = filtered.map(item => `
      <tr>
        <td>${item.transactionDate}</td>
        <td>${item.gateway}</td>
        <td>${item.transferAmount} VND</td>
        <td>${item.content}</td>
      </tr>
    `).join("");

    const html = `
    <html>
    <head>
      <title>Danh sách giao dịch</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 10px; text-align: center; }
        th { background-color: #f2f2f2; }
        tr:hover { background-color: #f9f9f9; }
      </style>
    </head>
    <body>
      <h2> Giao dịch chứa "${keyword}"</h2>
      <table>
        <tr>
          <th>Thời gian</th>
          <th>Ngân hàng</th>
          <th>Số tiền</th>
          <th>Nội dung</th>
        </tr>
        ${rows || "<tr><td colspan='4'>Không có dữ liệu</td></tr>"}
      </table>
    </body>
    </html>
    `;

    res.send(html);
  });
});
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
