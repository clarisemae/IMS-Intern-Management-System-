import nodemailer from "nodemailer";

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

function getSmtpPort() {
  return Number(process.env.SMTP_PORT ?? 587);
}

function getSmtpSecure() {
  if (process.env.SMTP_SECURE) {
    return process.env.SMTP_SECURE === "true";
  }

  return getSmtpPort() === 465;
}

async function getTransporter() {
  if (!transporterPromise) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error("Email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.");
    }

    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host,
        port: getSmtpPort(),
        secure: getSmtpSecure(),
        auth: {
          user,
          pass,
        },
      }),
    );
  }

  return transporterPromise;
}

export async function sendPasswordResetOtpEmail(email: string, otp: string) {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  if (!from) {
    throw new Error("Email sender is not configured. Set SMTP_FROM or SMTP_USER.");
  }

  const transporter = await getTransporter();

  await transporter.sendMail({
    from,
    to: email,
    subject: "REGRIS password reset code",
    text: [
      "We received a request to reset your REGRIS password.",
      "",
      `Your one-time password is: ${otp}`,
      "",
      "This code expires in 10 minutes.",
      "If you did not request this reset, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin-bottom: 8px;">REGRIS password reset</h2>
        <p>We received a request to reset your REGRIS password.</p>
        <p style="margin: 20px 0;">
          <span style="display: inline-block; padding: 12px 18px; font-size: 24px; font-weight: 700; letter-spacing: 6px; background: #eff6ff; border-radius: 12px;">
            ${otp}
          </span>
        </p>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p>If you did not request this reset, you can ignore this email.</p>
      </div>
    `,
  });
}
