import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const client = twilio(process.env.TWILIO_SID!, process.env.TWILIO_TOKEN!);

async function main() {
  const [, , target] = process.argv;
  if (!target) {
    throw new Error("Usage: npx tsx scripts/test-twilio.ts \"+33XXXXXXXXX\"");
  }

  const from = process.env.TWILIO_NUMBER;
  if (!from) {
    throw new Error("Missing TWILIO_NUMBER in .env");
  }

  const isWhatsApp = from.startsWith("whatsapp:");
  const to = isWhatsApp ? `whatsapp:${target.replace(/^whatsapp:/, "")}` : target;

  const message = await client.messages.create({
    from: isWhatsApp ? from : from,
    to,
    body: "Test Twilio – message bien reçu ?",
  });

  console.log("Message SID:", message.sid);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

