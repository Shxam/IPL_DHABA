import twilio from 'twilio';

let twilioClient: any = null;

const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!twilioClient && accountSid && authToken) {
    try {
      twilioClient = twilio(accountSid, authToken);
    } catch (e: any) {
      console.error('[SMS Service] Failed to initialize Twilio client:', e.message);
    }
  }
  return twilioClient;
};

export async function sendSMS(toPhone: string, message: string): Promise<boolean> {
  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!client || !fromNumber) {
    console.log(`\n==================================================`);
    console.log(`[SMS MOCK] To: ${toPhone}`);
    console.log(`[SMS MOCK] Body: ${message}`);
    console.log(`==================================================\n`);
    return true;
  }

  try {
    await client.messages.create({
      body: message,
      from: fromNumber,
      to: toPhone,
    });
    return true;
  } catch (err: any) {
    console.error(`[SMS Service] Failed to send SMS to ${toPhone}:`, err.message);
    return false;
  }
}
