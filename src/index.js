const express = require("express");
const { urlencoded, json } = require("express");
const session = require("express-session");
const passport = require("passport");
const MongoStore = require("connect-mongo");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const mongoSanitize = require("express-mongo-sanitize");

const app = express();
const server = require("http").createServer(app);
const PORT = process.env.PORT || 8082;

require("./config/dbConfig");
require("./strategies/local");

const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const smsRoutes = require("./routes/smsRoutes");
const routesRoutes = require("./routes/routesRoutes");
const mapsRoutes = require("./routes/mapsRoutes");
const quotesRoutes = require("./routes/quotesRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const { RES_TYPES } = require("./utils/helper");

app.use(
  cors({
    origin: ["https://www.expediteknight.com", "http://localhost:3000"],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

app.use(json());
app.use(urlencoded({ extended: true }));
app.use(mongoSanitize()); //removes $ and . chars

app.use((req, res, next) => {
  console.log(req.method, ":", req.path);
  next();
});

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/sms", smsRoutes);
app.use("/api/v1/routes", routesRoutes);
app.use("/api/v1/maps", mapsRoutes);
app.use("/api/v1/quotes", quotesRoutes);
app.use("/api/v1/analytics", analyticsRoutes);

server.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port: ${PORT}`)
);
