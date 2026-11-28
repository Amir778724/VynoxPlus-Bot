const MORNING_CRON = "30 6 * * *";
const EVENING_CRON = "30 16 * * *";

const MORNING_MESSAGE = `🌞 صبح بخیر از VynoxPlus!

برای سفارش و دریافت راهنمایی، از راه ارتباطی درج‌شده در کانال استفاده کنید.

💎 VynoxPlus`;

const PRICE_MESSAGE = `🌙 لیست قیمت VynoxPlus

📦 ۵ گیگابایت: ۴۰٬۰۰۰ تومان
📦 ۱۰ گیگابایت: ۸۰٬۰۰۰ تومان
📦 ۱۵ گیگابایت: ۱۲۰٬۰۰۰ تومان
📦 ۲۰ گیگابایت: ۱۶۰٬۰۰۰ تومان
📦 ۳۰ گیگابایت: ۲۴۰٬۰۰۰ تومان
📦 ۴۰ گیگابایت: ۳۲۰٬۰۰۰ تومان
📦 ۵۰ گیگابایت: ۴۰۰٬۰۰۰ تومان

برای سفارش، از راه ارتباطی درج‌شده در کانال پیام بدهید.
✨ VynoxPlus`;

async function telegram(env, method, payload) {
  if (!env.BOT_TOKEN) throw new Error("Missing BOT_TOKEN secret");
  const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.description || `Telegram API HTTP ${response.status}`);
  return result;
}

async function sendChannel(env, text) {
  if (!env.CHANNEL_ID) throw new Error("Missing CHANNEL_ID variable");
  return telegram(env, "sendMessage", {
    chat_id: env.CHANNEL_ID,
    text,
    disable_web_page_preview: true
  });
}

function json(data, status = 200) {
  return Response.json(data, { status });
}

async function handleTelegramUpdate(request, env) {
  // Telegram webhook authentication uses the existing ADMIN_KEY secret.
  const supplied = request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!env.ADMIN_KEY || supplied !== env.ADMIN_KEY) return json({ ok: false }, 401);

  const update = await request.json();
  const message = update.message;
  if (!message?.chat?.id || !message?.text) return json({ ok: true });

  const chatId = String(message.chat.id);
  const senderId = String(message.from?.id || "");
  const text = message.text.trim();
  const command = text.split(/\s+/)[0].split("@")[0].toLowerCase();
  const isAdmin = Boolean(env.ADMIN_CHAT_ID) && senderId === String(env.ADMIN_CHAT_ID);

  // /id is intentionally available before admin setup, and exposes only the caller's own ID.
  if (command === "/id") {
    await telegram(env, "sendMessage", {
      chat_id: chatId,
      text: `شناسه عددی تلگرام شما: ${senderId || chatId}\nاین عدد را در متغیر ADMIN_CHAT_ID در Cloudflare قرار دهید.`
    });
    return json({ ok: true });
  }

  if (!isAdmin) {
    await telegram(env, "sendMessage", {
      chat_id: chatId,
      text: "این ربات خصوصی است و دسترسی مدیریت ندارید. برای دریافت شناسه خود دستور /id را بفرستید."
    });
    return json({ ok: true });
  }

  const help = "🤖 پنل مدیریت VynoxPlus\n\n/start یا /help — راهنما\n/status — وضعیت ربات\n/test — ارسال پیام آزمایشی\n/morning — ارسال پیام صبح\n/prices — ارسال لیست قیمت\n/post متن — انتشار متن دلخواه در کانال";
  try {
    if (command === "/start" || command === "/help") {
      await telegram(env, "sendMessage", { chat_id: chatId, text: help });
    } else if (command === "/status") {
      await telegram(env, "sendMessage", {
        chat_id: chatId,
        text: `✅ ربات فعال است\nکانال: ${env.CHANNEL_ID || "تنظیم نشده"}\nزمان‌بندی: هر روز ساعت ۱۰:۰۰ و ۲۰:۰۰ به وقت ایران\nتوکن: ${env.BOT_TOKEN ? "تنظیم شده" : "تنظیم نشده"}`
      });
    } else if (command === "/test") {
      await sendChannel(env, "🧪 پیام آزمایشی VynoxPlus\n\nاتصال ربات به کانال با موفقیت آزمایش شد.");
      await telegram(env, "sendMessage", { chat_id: chatId, text: "✅ پیام آزمایشی در کانال ارسال شد." });
    } else if (command === "/morning") {
      await sendChannel(env, MORNING_MESSAGE);
      await telegram(env, "sendMessage", { chat_id: chatId, text: "✅ پیام صبح در کانال منتشر شد." });
    } else if (command === "/prices") {
      await sendChannel(env, PRICE_MESSAGE);
      await telegram(env, "sendMessage", { chat_id: chatId, text: "✅ لیست قیمت در کانال منتشر شد." });
    } else if (command === "/post") {
      const post = text.replace(/^\/post(?:\s+|$)/i, "").trim();
      if (!post) {
        await telegram(env, "sendMessage", { chat_id: chatId, text: "متن پیام را بعد از دستور بنویس. نمونه:\n/post سلام، سفارش‌گیری آغاز شد." });
      } else {
        await sendChannel(env, post);
        await telegram(env, "sendMessage", { chat_id: chatId, text: "✅ پیام دلخواه در کانال منتشر شد." });
      }
    } else {
      await telegram(env, "sendMessage", { chat_id: chatId, text: "دستور شناخته نشد. /help را بفرست." });
    }
  } catch (error) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: `❌ خطا: ${error.message || "ارسال ناموفق"}` });
  }
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return json({
        service: "VynoxPlus Telegram Scheduler",
        status: "online",
        bot_token_configured: Boolean(env.BOT_TOKEN),
        channel_configured: Boolean(env.CHANNEL_ID),
        admin_chat_configured: Boolean(env.ADMIN_CHAT_ID)
      });
    }

    if (request.method === "GET" && url.pathname === "/activate") {
      try {
        const result = await telegram(env, "setWebhook", {
          url: `${url.origin}/telegram`,
          secret_token: env.ADMIN_KEY,
          allowed_updates: ["message"],
          drop_pending_updates: true
        });
        return json({ ok: true, message: "Telegram webhook activated", webhook_configured: result.result });
      } catch (error) {
        return json({ ok: false, error: error.message || "Webhook setup failed" }, 502);
      }
    }

    if (request.method === "POST" && url.pathname === "/telegram") {
      try {
        return await handleTelegramUpdate(request, env);
      } catch (error) {
        return json({ ok: false, error: error.message || "Webhook error" }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/setup-webhook") {
      const auth = request.headers.get("authorization") || "";
      if (!env.ADMIN_KEY || auth !== `Bearer ${env.ADMIN_KEY}`) return json({ ok: false, error: "Unauthorized" }, 401);
      try {
        const result = await telegram(env, "setWebhook", {
          url: `${url.origin}/telegram`,
          secret_token: env.ADMIN_KEY,
          allowed_updates: ["message"],
          drop_pending_updates: true
        });
        return json({ ok: true, webhook_configured: result.result });
      } catch (error) {
        return json({ ok: false, error: error.message || "Webhook setup failed" }, 502);
      }
    }

    if (request.method === "POST" && url.pathname === "/test") {
      const auth = request.headers.get("authorization") || "";
      if (!env.ADMIN_KEY || auth !== `Bearer ${env.ADMIN_KEY}`) return json({ ok: false, error: "Unauthorized" }, 401);
      try {
        await sendChannel(env, "🧪 پیام آزمایشی VynoxPlus\n\nاتصال ربات به کانال با موفقیت آزمایش شد.");
        return json({ ok: true, message: "Test message sent" });
      } catch (error) {
        return json({ ok: false, error: error.message || "Telegram send failed" }, 502);
      }
    }

    return new Response("Not found", { status: 404 });
  },

  async scheduled(controller, env) {
    const message = controller.cron === MORNING_CRON
      ? MORNING_MESSAGE
      : controller.cron === EVENING_CRON
        ? PRICE_MESSAGE
        : null;
    if (!message) throw new Error(`Unexpected cron expression: ${controller.cron}`);
    await sendChannel(env, message);
  }
};
