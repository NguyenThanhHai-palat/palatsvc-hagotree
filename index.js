const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();
const port = 3000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "image/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
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
  res.status(201).json({ message: "SERVER HAGOTREE" });
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
app.post("/upload-post", express.json({ limit: "10mb" }), (req, res) => {
  const { title, content, image } = req.body;

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

  const post = {
    title,
    content,
    image: imageFilename ? `/image/${imageFilename}` : "",
    createdAt: new Date().toISOString(),
  };

  const jsonPath = path.join(__dirname, "public", "upload-content.json");
  let posts = [];

  if (fs.existsSync(jsonPath)) {
    const content = fs.readFileSync(jsonPath, "utf8");
    try {
      posts = JSON.parse(content);
    } catch (err) {
      console.error("Lỗi đọc JSON:", err);
    }
  }

  posts.push(post);
  fs.writeFileSync(jsonPath, JSON.stringify(posts, null, 2));
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
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Thiếu email trong request." });
  }

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
app.post("/feedback", (req, res) => {
  const formData = req.body;
  console.log("Received Form Data:", formData);

  const filePath = path.join(__dirname, "public", "feedback.json");
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
      return res.status(201).json({ message: "Đăng nhập thành công!" });
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


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
