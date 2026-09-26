const express = require("express");
const dns = require("dns");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./swagger");

require("dotenv").config();

// Google DNS
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();
const PORT = process.env.PORT || 5432;

app.use(cors());
app.use(express.json());

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// ======================================================
// MONGODB CONNECTION & DEFOLT ADMIN YARATISH
// ======================================================
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ username: "admin" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await User.create({
        username: "admin",
        password: hashedPassword,
        fullName: "Bosh Admin",
        role: "admin",
      });
      console.log("Defolt Admin yaratildi! ✅ (Login: admin | Parol: admin123)");
    }
  } catch (err) {
    console.error("Defolt admin yaratishda xatolik ❌:", err.message);
  }
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected ✅");
    await createDefaultAdmin(); // Baza ulangach adminni tekshirib yaratadi
  } catch (err) {
    console.error("MongoDB error ❌:", err.message);
    process.exit(1);
  }
};

// ======================================================
// USER SCHEMA & MODEL
// ======================================================
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    phone: String,
    email: String,
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

// ======================================================
// MIDDLEWARES
// ======================================================
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Authorization token mavjud emas" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Token topilmadi" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token noto'g'ri yoki muddati tugagan" });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "Bu ma'lumotlarni ko'rish uchun Admin huquqi kerak!" });
  }
}

// ======================================================
// ROUTES
// ======================================================

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Yangi oddiy foydalanuvchini ro'yxatdan o'tkazish (Faqat user roliga)
 */
app.post("/register", async (req, res) => {
  try {
    const { username, password, fullName, phone, email } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Bunday username allaqachon mavjud" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashedPassword,
      fullName,
      role: "user", // Faqat oddiy foydalanuvchi bo'lib ro'yxatdan o'tadi
      phone,
      email,
    });

    res.status(201).json({ 
      message: "Foydalanuvchi yaratildi ✅", 
      user: { id: user._id, username: user.username, role: user.role } 
    });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi", error: error.message });
  }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Tizimga kirish va Token olish (Admin ham, User ham kiradi)
 */
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username va passwordni kiriting" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Username yoki password noto'g'ri" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Username yoki password noto'g'ri" });
    }

    const payload = { id: user._id, username: user.username, role: user.role };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

    return res.status(200).json({
      message: "Login muvaffaqiyatli ✅",
      accessToken,
      user: { id: user._id, username: user.username, role: user.role, fullName: user.fullName }
    });
  } catch (error) {
    res.status(500).json({ message: "Login xatosi", error: error.message });
  }
});

/**
 * @swagger
 * /me:
 *   get:
 *     summary: Profil ma'lumotlarini olish
 */
app.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Barcha foydalanuvchilar ro'yxati (Faqat Admin)
 */
app.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Foydalanuvchini bazada yangilash (Faqat Admin)
 */
app.put("/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { fullName, role, phone, email } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { fullName, role, phone, email },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    }

    return res.status(200).json({
      message: "Foydalanuvchi ma'lumotlari bazada yangilandi ✅",
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({ message: "Yangilashda xatolik", error: error.message });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Foydalanuvchini o'chirish (Faqat Admin)
 */
app.delete("/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    }

    return res.status(200).json({ message: "Foydalanuvchi o'chirildi ✅" });
  } catch (error) {
    return res.status(500).json({ message: "O'chirishda xatolik", error: error.message });
  }
});

// ======================================================
// SERVERNI ISHGA TUSHIRISH
// ======================================================
app.listen(PORT, async () => {
  await connectDB();
  console.log(`Server ishga tushdi: http://localhost:${PORT}`);
  console.log(`Swagger Docs: http://localhost:${PORT}/api-docs`);
});