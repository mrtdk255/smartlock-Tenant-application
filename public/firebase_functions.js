const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "mrtdk37@gmail.com",
    pass: "Rxrx@1313" // يجب استبداله بكلمة مرور التطبيق
  }
});

exports.sendTenantEmail = functions.database.ref("/tenants/{tenantId}")
  .onCreate((snapshot, context) => {
    const tenantData = snapshot.val();
    const mailOptions = {
      from: "mrtdk37@gmail.com",
      to: "mrtdj2020@gmail.com",
      subject: "📩 بيانات مستأجر جديد",
      text: `
🔔 تم تسجيل مستأجر جديد:

📛 الاسم: ${tenantData.name}
📞 الهاتف: ${tenantData.phone}
📧 البريد الإلكتروني: ${tenantData.email}
📅 الوصول: ${tenantData.checkin}
📅 المغادرة: ${tenantData.checkout}

New tenant registered:

📛 Name: ${tenantData.name}
📞 Phone: ${tenantData.phone}
📧 Email: ${tenantData.email}
📅 Check-in: ${tenantData.checkin}
📅 Check-out: ${tenantData.checkout}
      `.trim()
    };

    return transporter.sendMail(mailOptions)
      .then(() => console.log("✅ تم إرسال بيانات المستأجر بنجاح."))
      .catch(error => console.error("❌ خطأ في إرسال البريد:", error));
  });