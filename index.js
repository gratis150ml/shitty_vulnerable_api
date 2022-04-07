const express = require("express");
const mongoose = require("mongoose");
var cors = require("cors");
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const client = require("twilio")(
  "",
  ""
);
const connect = async () => {
  await mongoose
    .connect("mongodb://holix:holix@localhost:27017/holixdb")
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
app.post("/api/register", async (request, response) => {
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
    return response
      .status(200)
      .json({ status: "account created. now u need to confirm" });
  } catch (err) {
    return response.status(400).json({ status: "error", message: err.message });
  }
});
app.post("/api/confirm-mobile", async (request, response) => {
  const { phone, email, code } = request.body;
  client.verify
    .services("")
    .verificationChecks.create({ to: phone, code: code })
    .then(async (verification_check) => {
      if (verification_check.valid === true) {
        const user = await model.findOne({ phone: phone });
        user.is_active = true;
        user.save();
        return response.status(200).json({ message: "done" });
      } else {
        return response.status(200).json({ message: "wrong code" });
      }
    });
});
app.post("/api/login", async (request, response) => {
  const { email, password } = request.body;
  const user = await model.findOne({ email: email });
  const match = await bcrypt.compare(password, user.password);
  if (match) {
    if (user.is_active === false) {
      return response.status(200).json({ message: "confirm your account" });
    } else {
      return response.status(200).json({ token: uuid.v4() });
    }
  }
});
app.listen(8080, (er) => {
  if (er) {
    console.log(er);
  } else {
    console.log("running on port 8080!");
  }
});
