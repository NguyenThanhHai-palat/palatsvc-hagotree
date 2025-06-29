const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const iconv = require("iconv-lite");
const bodyParser = require("body-parser");
const app = express();
const port = 3000;
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
    cb(null, "dataupload/"); // Đường dẫn thư mục để lưu file
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Tên file sẽ giữ nguyên
  },
});

const upload2 = multer({ storage: storage2 });

const dataFilePath = path.join("./public/data.json");
app.use(express.json({ limit: '25mb' }));
const upload = multer({ storage: storage });
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
app.post("/upload-post", upload.single("image"), (req, res) => {
  const { title, cost, content, tag } = req.body;
  const file = req.file;

  const imageFilename = file ? `/image/${file.filename}` : "";

  const jsonPath = path.join(__dirname, "public", "sp.json");
  let posts = [];

  if (fs.existsSync(jsonPath)) {
    const content = fs.readFileSync(jsonPath, "utf8");
    try {
      posts = JSON.parse(content);
    } catch (err) {
      console.error("Lỗi đọc JSON:", err);
    }
  }

  const newId = `sp${posts.length + 1}`;

  const post = {
    id: newId,
    title,
    content,
    cost,
    image: imageFilename,
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
      res.status(201).send();
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

        if (users[email] && users[email].password === password) {
          if(users[email].password === password){
            res.status(200).send("OK");
          }
          else{
            res.status(200).send("NO");
          }
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
    return iconv.decode(buffer, charset);
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
  console.log(req.body);

  const asx = req.body;
  const jsonString = asx["application/json"];
  let jsonObj;

  try {
    jsonObj = JSON.parse(jsonString);
  } catch (e) {
    return res.status(400).send("Lỗi JSON đầu vào");
  }

  if (!file) {
    const error = new Error("Vui lòng chọn một file!");
    error.httpStatusCode = 400;
    return next(error);
  }

  const rawName = jsonObj.name;
  if (!rawName) {
    const error = new Error("Vui lòng cung cấp tên file!");
    error.httpStatusCode = 400;
    return next(error);
  }

  const namex = decodeMimeWord(rawName); // ✅ giải mã MIME base64 nếu có
  console.log("🎧 Tên file sau decode:", namex);

  const newFileName = path.join(file.destination, namex);
  fs.rename(file.path, newFileName, (err) => {
    if (err) {
      return next(err);
    }

    console.log("File received and renamed:", {
      ...file,
      originalname: namex,
      path: newFileName,
    });

    const directoryPath = path.join(__dirname, "dataupload");
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        return console.log("Unable to scan directory: " + err);
      }
      const mp3Files = files.filter((file) => path.extname(file) === ".mp3");
      fs.writeFile("music.json", JSON.stringify(mp3Files), (err) => {
        if (err) throw err;
        console.log("Music JSON file has been saved!");
        res.status(200).send("OK");
      });
    });
  });
});
app.post("/uploadmusic-user/Post", express.json(), (req, res) => {
  const { name, user, rev } = req.body;
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
