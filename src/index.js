import express from "express"
import nodemailer from "nodemailer"
import cors from "cors"

const app = express()
app.use(express.json({ limit: "2mb" }))
app.use(cors({
  origin: "*",
  methods: ["POST"],
  allowedHeaders: ["Content-Type", "x-api-key"]
}))

const {
  PORT = "3000",
  MAIL_SERVER,
  MAIL_PASSWORD,
  MAIL_API_KEY
} = process.env

if (!MAIL_SERVER || !MAIL_PASSWORD) {
  console.error("Faltan env vars: EMAIL_SERVER, EMAIL_PASSWORD")
  process.exit(1)
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: MAIL_SERVER,
    pass: MAIL_PASSWORD
  }
})

function requireApiKey(req, res, next) {
  const key = req.header("x-api-key")
  if (!key || key !== MAIL_API_KEY) return res.status(401).json({ ok: false, error: "unauthorized" })
  next()
}

app.get("/health", (_req, res) => res.json({ ok: true, message: "Servidor email ejecutandose correctamente" }))
app.post("/send", requireApiKey, async (req, res) => {
  try {
    const {
      to,
      subject,
      text,
      html,
      cc,
      bcc,
      replyTo,
      attachments,
      source,
      senderName
    } = req.body ?? {}

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ ok: false, error: "to, subject y (text o html) son requeridos" })
    }

    const fromEmail = MAIL_SERVER
    const displayName = senderName || source || "Notificaciones"

    const info = await transporter.sendMail({
      from: `${displayName} <${fromEmail}>`,
      to,
      cc,
      bcc,
      replyTo,
      subject,
      text,
      html,
      attachments: Array.isArray(attachments)
        ? attachments.map(a => ({
            filename: a.filename,
            content: a.content,
            encoding: a.encoding || "base64",
            contentType: a.contentType
          }))
        : undefined
    })

    return res.json({ ok: true, messageId: info.messageId })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ ok: false, error: "send_failed" })
  }
})

app.listen(Number(PORT), () => {
  console.log(`mail-service listening on :${PORT}`)
})

