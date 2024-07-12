import express from 'express';
import userSchema from './models/user.model.js';
import Note from './models/note.model.js';
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
import noteModel from './models/note.model.js';


app.use(cors({ origin: "*" }));

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

// get user
app.get("/get-user",authenticateToken, async (req, res) => {
    const { user } = req.user;

    const isUser = await userSchema.findOne({_id: user._id});

    if(!isUser) {
        return res.sendStatus(401);
    }

    return res.json({
        user: {fullName: isUser.fullName, email: isUser.email, "_id":isUser._id, createdOn: isUser.createdOn},
        message:""
    })
})

// add note
app.post("/add-note", authenticateToken, async (req, res) => {
    const { title, content, tags } = req.body;
    const { user } = req.user;

    if (!title) {
        return res.status(400).json({ error: true, message: "Title is required" })
    }

    if (!content) {
        return res.status(400).json({ error: true, message: "content is required" })
    }

    try {
        const note = new Note({
            title,
            content,
            tags: tags || [],
            userId: user._id,
        });

        await note.save();

        return res.json({
            error: false,
            note,
            message: "Note added sucessfully",
        })
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: "Internal server error",
        })
    }

})

// edit note 
app.put("/edit-note/:noteId", authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { title, content, tags, isPinned } = req.body;
    const { user } = req.user;

    if (!title && !content && !tags) {
        return res.status(400).json({ error: true, message: "No changes provided" });
    }

    try {
        const note = await Note.findOne({ _id: noteId, userId: user._id });

        if (!note) {
            return res.status(404).json({ error: true, message: "Note not found" })
        }

        if (title) note.title = title;
        if (content) note.content = content;
        if (tags) note.tags = tags;
        if (isPinned) note.isPinned = isPinned;

        await note.save();

        return res.json({
            error: false,
            note,
            message: "note added sucessfully"
        })
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: "Internal server error"
        })
    }
})

// get all notes
app.get("/get-all-notes", authenticateToken, async (req, res) => {
    const { user } = req.user;

    try {
        const notes = await Note.find({ userId: user._id }).sort({ isPinned: -1 });

        return res.json({
            error: false,
            notes,
            message: "All notes retrived sucessfully",
        })
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: "failed to fetch all the notes, Internal server error"
        })
    }
})

// delete a note
app.delete("/delete-note/:noteId", authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { user } = req.user;

    try {
        const note = await Note.findOne({
            _id: noteId,
            userId: user._id
        });

        if (!note) {
            return res.status(400).json({ error: true, message: "Note not found" });
        }

        await Note.deleteOne({
            _id: noteId, userId: user._id
        });

        return res.json({
            error: false,
            message: "Note deleted sucessfully",

        })
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: "Internal server error"
        })
    }
})

// update is pinned
app.put("/update-note-pinned/:noteId", authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { isPinned } = req.body;
    const { user } = req.user;

    try {
        const note = await Note.findOne({ _id: noteId, userId: user._id });

        if (!note) {
            return res.status(404).json({ error: true, message: "Note not found" })
        }

        note.isPinned = isPinned;

        await note.save();

        return res.json({
            error: false,
            note,
            message: "note pinned sucessfully"
        })
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: "Internal server error"
        })
    }
})

// search notes
app.get("/search-notes/", authenticateToken, async (req, res) => {
    const {user} = req.user;
    const {query} = req.query;

    if(!query) {
        return res.status(400).json({error: true,message: "Search query is required"})
    }

    try {
        const matchingNotes = await Note.find({
            userId: user._id,
            $or : [
                { title: {$regex: new RegExp(query,"i")} },
                {content: {$regex: new RegExp(query,"i")}}
            ]
        })

        return res.json({
            error: false,
            notes: matchingNotes,
            message: "Notes matching the search query recieved",
        })
    } catch (error) {
        return res.status(500).json({error: true,message: "Internal server error"})
    }
})

app.listen(port, () => {
    console.log(`server listening on http://localhost:${port}`)
})