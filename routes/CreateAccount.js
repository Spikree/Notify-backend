import express from 'express'
import userSchema from '../models/user.model.js'
import jwt from 'jsonwebtoken'

const createAccount = express.Router();

createAccount.post("/", async (req, res) => {
    const { fullName, email, password } = req.body;

    if (!fullName) {
        return res.status(400).json({ error: true, message: "full name is required" });
    }

    if (!email) {
        return res.status(400).json({ error: true, message: "email is required" });
    }

    if (!password) {
        return res.status(400).json({ error: true, message: "password is required" });
    }

    const isUser = await userSchema.findOne({ email: email })

    if (isUser) {
        return res.json({
            error: true,
            message: "user already exists"
        })
    }

    const user = new userSchema({
        fullName,
        email,
        password
    })

    await user.save();

    const accessToken = jwt.sign({
        user
    }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "36000m"
    });

    return res.json({
        error: false,
        user,
        accessToken,
        message: "Registration successful",
    })
})

export default createAccount;