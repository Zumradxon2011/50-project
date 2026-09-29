const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "JWT Auth & Products API",
      version: "1.0.0",
      description: "MongoDB va Swagger integratsiya qilingan API hujjatlari",
    },
    servers: [
      {
        url: "http://localhost:5432",
        description: "Local Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            username: { type: "string" },
            fullName: { type: "string" },
            role: { type: "string", enum: ["user", "admin"] },
            phone: { type: "string" },
            email: { type: "string" },
          },
        },
        RegisterInput: {
          type: "object",
          required: ["username", "password", "fullName"],
          properties: {
            username: { type: "string", example: "johndoe" },
            password: { type: "string", example: "password123" },
            fullName: { type: "string", example: "John Doe" },
            phone: { type: "string", example: "+998901234567" },
            email: { type: "string", example: "john@example.com" },
          },
        },
        LoginInput: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string", example: "admin" },
            password: { type: "string", example: "admin123" },
          },
        },
      },
    },
    paths: {
      "/register": {
        post: {
          summary: "Yangi oddiy foydalanuvchini ro'yxatdan o'tkazish (Faqat user roliga)",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterInput" },
              },
            },
          },
          responses: {
            201: { description: "Foydalanuvchi yaratildi" },
            400: { description: "Username allaqachon mavjud" },
            500: { description: "Server xatosi" },
          },
        },
      },
      "/login": {
        post: {
          summary: "Tizimga kirish va Token olish (Admin ham, User ham kiradi)",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginInput" },
              },
            },
          },
          responses: {
            200: { description: "Login muvaffaqiyatli" },
            401: { description: "Username yoki password noto'g'ri" },
            500: { description: "Server xatosi" },
          },
        },
      },
      "/me": {
        get: {
          summary: "Profil ma'lumotlarini olish",
          tags: ["User Profile"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Foydalanuvchi ma'lumotlari" },
            401: { description: "Token yo'q yoki noto'g'ri" },
            404: { description: "Foydalanuvchi topilmadi" },
          },
        },
      },
      "/users": {
        get: {
          summary: "Barcha foydalanuvchilar ro'yxati (Faqat Admin)",
          tags: ["Admin User Management"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Foydalanuvchilar ro'yxati" },
            401: { description: "Token yo'q yoki noto'g'ri" },
            403: { description: "Admin huquqi yo'q" },
          },
        },
      },
      "/users/{id}": {
        put: {
          summary: "Foydalanuvchini bazada yangilash (Faqat Admin)",
          tags: ["Admin User Management"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Foydalanuvchi IDsi",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    fullName: { type: "string" },
                    role: { type: "string", enum: ["user", "admin"] },
                    phone: { type: "string" },
                    email: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Foydalanuvchi yangilandi" },
            404: { description: "Foydalanuvchi topilmadi" },
          },
        },
        delete: {
          summary: "Foydalanuvchini o'chirish (Faqat Admin)",
          tags: ["Admin User Management"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Foydalanuvchi IDsi",
            },
          ],
          responses: {
            200: { description: "Foydalanuvchi o'chirildi" },
            404: { description: "Foydalanuvchi topilmadi" },
          },
        },
      },
    },
  },
  apis: [],
};

const specs = swaggerJsdoc(options);
module.exports = specs;