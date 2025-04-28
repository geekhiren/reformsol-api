const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();

const bodyParser = require("body-parser");
const fs = require("fs");
const { google } = require("googleapis");

const app = express();
const PORT = 5000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.use(bodyParser.json());
app.use(cors()); // Allow requests from React frontend

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // App password
    },
});

// API route to send email
app.post("/send-email", async (req, res) => {
    const { name, email, message } = req.body;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email, // Send email to the client
        subject: "Thank You for Contacting Us!",
        text: `Hello ${name},\n\nThank you for reaching out. We have received your message:\n"${message}"\n\nWe will get back to you shortly.\n\nBest Regards,\nYour Company Name`,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ mailOptions, message: "Email sent successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error sending email" });
    }
});

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const FILE_ID = '1MZYraMLN3vCd2z_xu4kQR-TvVtUIDDbs';  // Replace with your file ID

// Decode the Base64-encoded credentials from .env
const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8')
);

// Auth Setup without keyFile
const auth = new google.auth.GoogleAuth({
    credentials: credentials, // use credentials directly
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

app.get("/data", async (req, res) => {
    try {
        const response = await drive.files.get(
            { fileId: FILE_ID, alt: "media" },
            { responseType: "stream" }
        );

        let data = "";
        response.data.on("data", chunk => (data += chunk));
        response.data.on("end", () => res.json(JSON.parse(data)));
    } catch (err) {
        console.error("Error reading file:", err);
        res.status(500).send("Failed to fetch data.");
    }
});

// Route to UPDATE JSON file
app.post("/data", async (req, res) => {
    try {
        const newData = JSON.stringify(req.body, null, 2);
        const media = {
            mimeType: 'application/json',
            body: Buffer.from(newData),
        };

        await drive.files.update({
            fileId: FILE_ID,
            media: media,
        });

        res.send("Data updated successfully.");
    } catch (err) {
        console.error("Error updating file:", err);
        res.status(500).send("Failed to update data.");
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
