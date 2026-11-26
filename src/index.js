const MORNING_CRON = "30 6 * * *";
const EVENING_CRON = "30 16 * * *";

const MORNING_MESSAGE = `🌞 صبح بخیر از VynoxPlus!\n\nبرای سفارش و دریافت راهنمایی، از راه ارتباطی درج‌شده در کانال استفاده کنید.\n\n💎 VynoxPlus`;

const PRICE_MESSAGE = `🌙 لیست قیمت VynoxPlus\n\n📦 ۵ گیگابایت: ۴۰٬۰۰۰ تومان\n📦 ۱۰ گیگابایت: ۸۰٬۰۰۰ تومان\n📦 ۱۵ گیگابایت: ۱۲۰٬۰۰۰ تومان\n📦 ۲۰ گیگابایت: ۱۶۰٬۰۰۰ تومان\n📦 ۳۰ گیگابایت: ۲۴۰٬۰۰۰ تومان\n📦 ۴۰ گیگابایت: ۳۲۰٬۰۰۰ تومان\n📦 ۵۰ گیگابایت: ۴۰۰٬۰۰۰ تومان\n\nبرای سفارش، از راه ارتباطی درج‌شده در کانال پیام بدهید.\n✨ VynoxPlus`;

async function sendTelegramMessage(env, text) {
  if (!env.BOT_TOKEN) throw new Error("Missing BOT_TOKEN secret");
  if (!env.CHANNEL_ID) throw new Error("Missing CHANNEL_ID variable");

  const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: env.CHANNEL_ID, text, disable_web_page_preview: true })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.description || `Telegram API returned HTTP ${response.status}`);
  return result;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return Response.json({
        service: "VynoxPlus Telegram Scheduler",
        status: "online",
        bot_token_configured: Boolean(env.BOT_TOKEN),
        channel_configured: Boolean(env.CHANNEL_ID)
      });
    }
    if (request.method === "POST" && url.pathname === "/test") {
      const auth = request.headers.get("authorization") || "";
      if (!env.ADMIN_KEY || auth !== `Bearer ${env.ADMIN_KEY}`) {
        return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
      try {
        await sendTelegramMessage(env, "🧪 پیام آزمایشی VynoxPlus\n\nاتصال ربات به کانال با موفقیت آزمایش شد.");
        return Response.json({ ok: true, message: "Test message sent" });
      } catch (error) {
        return Response.json({ ok: false, error: error.message || "Telegram send failed" }, { status: 502 });
      }
    }
    return new Response("Not found", { status: 404 });
  },
  async scheduled(controller, env) {
    let message;
    if (controller.cron === MORNING_CRON) message = MORNING_MESSAGE;
    else if (controller.cron === EVENING_CRON) message = PRICE_MESSAGE;
    else throw new Error(`Unexpected cron expression: ${controller.cron}`);
    await sendTelegramMessage(env, message);
  }
};
