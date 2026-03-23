import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path'; 
import fs from 'fs';   

dotenv.config();
console.log("--- DEBUGGING: .env file values ---");
console.log("Attempting to use SMTP_HOST:", process.env.SMTP_HOST);
console.log("Attempting to use SMTP_EMAIL (Username):", process.env.SMTP_EMAIL);
console.log("Is SMTP_PASS (Password/Key) loaded?:",
    process.env.SMTP_PASS ? "Yes, Loaded" : "NO, NOT LOADED"
);
console.log("-----------------------------------------");
const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false, 
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASS,
        },
    });

    const attachments = [];
    const logoCid = 'logo@kairoz.world'; 
    
 
    const logoPath = path.join(process.cwd(), 'Server', 'Logo.svg');

    if (fs.existsSync(logoPath)) {
        attachments.push({
            filename: 'Logo.svg',
            path: logoPath,
            cid: logoCid 
        });
    } else {
        console.warn(`Logo file not found at: ${logoPath}. Email bina logo ke jayega.`);
    }

    const mailOptions = {
        from: '"Kairoz World" <harshservi48@gmail.com>',
        to: options.to,
        subject: options.subject,
        text: options.message,
        html: options.html,
        attachments: attachments 
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Mail sent: ${info.messageId}`);
    } catch (error) {
        console.error(`Email send error: ${error.message}`);
        throw new Error(`Email send failed: ${error.message}`);
    }
};

export default sendEmail;