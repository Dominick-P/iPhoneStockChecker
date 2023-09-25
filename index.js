require('dotenv').config();
const pc = require('picocolors');
const schedule = require('node-schedule');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;
const location = process.env.LOCATION;

const bot = new TelegramBot(telegramBotToken, { polling: false });

const carrier = "UNLOCKED/US";
const modelNumber = "MU683LL/A";

let lastNotificationSent;

console.log(pc.dim("Scheduling stock check job..."));

const job = schedule.scheduleJob('*/1 * * * *', function () {
    console.log(pc.dim("Checking for stock..."));

    axios.get(`https://www.apple.com/shop/fulfillment-messages?pl=true&mts.0=regular&cppart=${carrier}&parts.0=${modelNumber}&location=${location}`).then((response) => {
        const stores = response.data.body.content.pickupMessage.stores;
        const availableStores = stores.filter((store) => { // Get stores that have stock
            return store.partsAvailability[modelNumber].pickupDisplay === "available";
        });

        if (availableStores.length > 0) { // Send message if there are stores with stock
            if (lastNotificationSent && (Date.now() - lastNotificationSent) < 600000) { // Only send a notification every 10 minutes
                return;
            }

            lastNotificationSent = Date.now();

            const storesFriendlyNames = availableStores.map((store) => { return store.storeName; }); // Get store names
            console.log(pc.bgGreen("Your iPhone is available at: " + storesFriendlyNames.join("\n"))); // Log to console

            bot.sendMessage(telegramChatId, "I found stock of your iPhone!\n\n" // Send message to Telegram
                + "```\n" + storesFriendlyNames.join("\n") + "```"
                + "\n\n Link to Checkout: https://www.apple.com/shop/bag", { parse_mode: "Markdown" });
        } else {
            console.log(pc.red("No stock found, waiting for next check"));
        }
    });
});

console.log(pc.dim("Stock check job scheduled, invoking for the first time..."));

job.invoke();