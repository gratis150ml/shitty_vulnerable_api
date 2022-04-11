const express = require("express");
const mongoose = require("mongoose");
var cors = require("cors");
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const client = require("twilio")("AC", "1");
const connect = async () => {
  await mongoose
    .connect("mongodb://localhost:27017/holix")
    .catch((error) => console.log(error));
};
connect();
const app = express();
app.use(cors());
app.use(express.json());
const User = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    is_admin: { type: Boolean, default: false },
    is_banned: { type: Boolean, default: false },
    phone: { type: String, required: true },
    is_active: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
  { collection: "users" }
);
const model = mongoose.model("User", User);
const Post = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
  },
  {
    timestamps: true,
  },
  { collection: "posts" }
);
const model2 = mongoose.model("Post", Post);
app.post("/v1/register", async (request, response) => {
  try {
    const { username, email, password, phone } = request.body;
    const hashed_password = await bcrypt.hash(password, 10);
    const user = await model.create({
      username: username,
      password: hashed_password,
      email: email,
      phone: phone,
    });
    client.verify
      .services("")
      .verifications.create({ to: phone, channel: "sms" });
    return response.status(200).json({ status: "ok", data: user });
  } catch (err) {
    return response.status(400).json({ status: "error", message: err.message });
  }
});
app.post("/v1/verify", async (request, response) => {
  const { phone, code } = request.body;
  client.verify
    .services("")
    .verificationChecks.create({ to: phone, code: code })
    .then(async (verification_check) => {
      if (verification_check.valid === true) {
        return response.status(200).json({ status: "ok", data: uuid.v4() });
      } else {
        return response
          .status(200)
          .json({ status: "error", message: "wrong code" });
      }
    });
});
app.post("/v1/login", async (request, response) => {
  const { email, password } = request.body;
  const user = await model.findOne({ email: email });
  const match = await bcrypt.compare(password, user.password);
  if (match) {
    client.verify
      .services("")
      .verifications.create({ to: user.phone, channel: "sms" });
    return response
      .status(200)
      .json({ status: "ok", data: "now verify your account" });
  }
});
app.get("/v1/search", async (request, response) => {
  const { query } = request.body;
  const post = model2.find({ title: query });
  response.status(200).json({ status: "ok", data: post });
});
app.get("/v1/posts", async (request, response) => {
  //
});
app.post("/v1/confirm-email", async (request, response) => {
  //
});
app.post("/v1/posts/create", async (request, response) => {
  //
});
app.post("/v1/update-email", async (request, response) => {
  //
});
app.get("/v1/forgot-password", async (request, response) => {
  //
});
app.listen(8080);
