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
    },
  },
  apis: ["./server.js"],
};

const specs = swaggerJsdoc(options);
module.exports = specs;