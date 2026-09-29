const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger");
const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5432;

app.use(cors());
app.use(express.json());

// ======================================
// MONGODB ULANISH
// ======================================
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("You successfully connected to MongoDB! ✅");
  } catch (err) {
    console.error("MongoDB ulanishda xato ❌:", err.message);
    process.exit(1);
  }
};

// ======================================
// SCHEMA & MODEL
// ======================================
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    firstName: String,
    lastName: String,
    middleName: String,
    birthDate: String,
    gender: String,
    country: String,
    region: String,
    district: String,
    address: String,
    phone: String,
    email: String,
    passport: {
      series: String,
      number: String,
      issuedBy: String,
      issuedDate: String,
    },
    age: Number,
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

// ======================================
// SWAGGER UI
// ======================================
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ======================================
// MIDDLEWARE
// ======================================
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Authorization token mavjud emas" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Token noto‘g‘ri formatda" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token noto‘g‘ri yoki muddati tugagan" });
  }
}

// ======================================
// ROUTES
// ======================================

// REGISTER
app.post("/register", async (req, res) => {
  try {
    const { username, password, fullName } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Bunday username allaqachon mavjud" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      ...req.body,
      password: hashedPassword,
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: "User yaratildi ✅",
      user: userResponse,
    });
  } catch (error) {
    res.status(500).json({ message: "User yaratishda xato", error: error.message });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username yoki passwordni kiriting" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Username yoki password noto‘g‘ri" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Username yoki password noto‘g‘ri" });
    }

    const accessToken = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login muvaffaqiyatli ✅",
      accessToken,
    });
  } catch (error) {
    res.status(500).json({ message: "Login xatosi", error: error.message });
  }
});

// ME (PROFIL)
app.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User topilmadi" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Xatolik", error: error.message });
  }
});

// ALL USERS
app.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Userlarni olishda xato", error: error.message });
  }
});

// ======================================
// SERVERNI ISHGA TUSHIRISH
// ======================================
const startServer = async () => {
  await connectDB(); // Oldin MongoDB ga ulanamiz
  app.listen(PORT, () => { // Keyin serverni ishga tushiramiz
    console.log(`Project running: http://localhost:${PORT}`);
    console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
  });
};

startServer();