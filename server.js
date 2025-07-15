require('dotenv').config();
const express      = require('express');
const path         = require('path');
const bodyParser   = require('body-parser');
const cors         = require('cors');
const admin        = require('firebase-admin');
const nodemailer   = require('nodemailer');
const fs           = require('fs');

console.log("GMAIL_USER:", process.env.GMAIL_USER);
console.log("ADMIN_EMAIL:", process.env.ADMIN_EMAIL);

const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://smartlockapp-e22e7-default-rtdb.firebaseio.com"
});
const db = admin.database();

const app  = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  },
  tls: { rejectUnauthorized: false }
});

// ✅ دالة إعادة تعيين الرمز - تتحقق من وجود boxNumber
app.post('/reset-request', async (req, res) => {
  const { email, boxNumber } = req.body;
  console.log("📥 Received reset-request:", { email, boxNumber });

  if (!email || !boxNumber) {
    return res.status(400).json({ success: false, error: 'Missing email or boxNumber' });
  }

  const templatePath = path.join(__dirname, 'email_template.html');
  if (!fs.existsSync(templatePath)) {
    console.error("❌ email_template.html not found at:", templatePath);
    return res.status(500).json({ success: false, error: 'Template missing on server' });
  }

  try {
    await db.ref('resetRequests').push({
      email,
      boxNumber,
      time: new Date().toLocaleString('ar-EG', { timeZone: 'Asia/Hebron' })
    });

    const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    const timeAr = new Date().toLocaleString('ar-EG', { timeZone: 'Asia/Hebron' });
    const timeEn = new Date().toLocaleString('en-US',  { timeZone: 'Asia/Hebron' });

    const htmlMessage = htmlTemplate
      .replace(/{{box}}/g,     boxNumber)
      .replace(/{{email}}/g,   email)
      .replace(/{{time_ar}}/g, timeAr)
      .replace(/{{time_en}}/g, timeEn);

    const info = await transporter.sendMail({
      from: `"Smart Lock App" <${process.env.GMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
      subject: `🔐 طلب إعادة تعيين رمز لصندوق ${boxNumber}`,
      html: htmlMessage
    });

    console.log("✅ Email sent successfully:", info.messageId);
    return res.json({ success: true });

  } catch (err) {
    console.error("❌ Failed to send email:", err.message);
    return res.status(500).json({ success: false, error: 'Email sending failed' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running at: http://localhost:${port}`);
});
