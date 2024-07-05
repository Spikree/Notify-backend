import express from 'express';
import userSchema from './models/user.model.js';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv'

dotenv.config();


const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_CONNECT_STRING);
        console.log('Connected to mongoDB')
    } catch (error) {
        console.log('couldnt connect to mongoDB', error)
    }
}

connectDb();


const app = express();
app.use(express.json());
app.use(bodyParser.json());
const port = process.env.PORT || 4000;

import jwt from 'jsonwebtoken'
import authenticateToken from './utilities.js';


app.use(cors({ origin: "*" }))

app.get('/', (req, res) => {
    res.json({ data: "message", success: "true" })
})

// create account
app.post("/create-account", async (req, res) => {
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


// login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    if (!password) {
        return res.status(400).json({ message: "password is required" })
    }

    const userInfo = await userSchema.findOne({ email: email });

    if (!userInfo) {
        return res.status(400).json({ message: "User not found" })
    }

    if (userInfo.email == email && userInfo.password == password) {
        const user = { user: userInfo };
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "36000m",
        })

        return res.json({
            error: false,
            message: "login sucessful",
            email,
            accessToken
        })
    } else {
        return res.status(400).json({
            error: true,
            message: "Invalid credentials",
        })
    }
})

// add note
app.post("/add-note", authenticateToken, async (req, res) => {

})

app.listen(port, () => {
    console.log(`server listening on http://localhost:${port}`)
})