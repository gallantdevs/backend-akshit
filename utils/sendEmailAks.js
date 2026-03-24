import { Resend } from "resend";
// RESEND_API_KEY=re_WpkC75pd_PsZ1NHtL8urze5FWgctNjr5f

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  try {
    const data = await resend.emails.send({
      from: "Kairoz World <onboarding@resend.dev>", // domain here
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.message,
    });

    console.log("Mail sent:", data.id);
  } catch (error) {
    console.error("Email send error:", error.message);
    throw new Error(`Email send failed: ${error.message}`);
  }
};

export default sendEmail;