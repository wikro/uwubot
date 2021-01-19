const { env } = require("process");

if (!env.hasOwnProperty("SECRET") || env.SECRET.length <= 0) {

  console.error("No or zero length SECRET environmental variable");

  return false;
}

// const https = require("https");


// ### Tools
tools = {};

/* tools.fetchUrl = (url) => {

  return new Promise((resolve, reject) => {

    https.get(url, (res) => {

      let data = "";

      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve(data || ""));

    })
    .on("error", (err) => {
      reject(err);
    });

  });
}; */

tools.parseMessage = (message) => {

  // "!cmd example params" => { cmd: "cmd", params: [ "example", "params"] }
  const re = message.content.match(/^\!([^ ]+) (.*)$/i) || [];
  const cmd = re[1] || "";
  const params = (re[2] || "").trim();

  return { cmd, params };
};

tools.parseAlarm = (timestring) => {

  const time = new Date();

  // "22:37"      => ["22:37", "22", "37", undefined, undefined]
  // "10:37:55pm" => ["10:37:55 pm", "10", "37", "55", "pm"]
  const parsed = (timestring.match(/^([0-1]?[0-9]|2[0-4])[.:]?([0-5][0-9])[.:]?([0-5][0-9])?\s*([ap]m)?$/i) || []).map((a) => Number(a) || a );

  parsed[1] && end.setHours(parsed[1]);
  parsed[2] && end.setMinutes(parsed[2]);
  parsed[3] && end.setSeconds(parsed[3]);

  const period = parsed[4] || "24h";

  if (end.getHours() < 13 && format === "pm") {
    end.setHours(12 + end.getHours());
  }

  return { time, period };
};

tools.parseTimer = (timestring) => {

  const start = new Date();
  const end = new Date(start);

  // "1h"  => ["1", "h"]
  // "5m"  => ["5", "m"]
  // "60s" => ["60", "s"]
  const parsed = (timestring.match(/^([+-]?\d+)\s*([hms])?$/i) || []).map((t) => Number(t) || t);

  const time = parsed[1] || 0;
  const suffix = parsed[2] || "s";

  switch (suffix) {

    case "h":
      end.setHours(time + end.getHours());
      break;
    case "m":
      end.setMinutes(time + end.getMinutes());
      break;
    default:
      end.setSeconds(time + end.getSeconds());
  }

  const hms = { h: "hour", m: "minute", s: "second" };
  const string = time > 1 ? `${time} ${hms[suffix]}s` : `${time} ${hms[suffix]}`;

  const timeout = end - start;

  return { start, end, string, timeout };
};


// ### Actions
const actions = {};

actions.reply = (message) => {

  if (message.author.id === client.user.id) return false;

  const { cmd, params } = tools.parseMessage(message);

  if (cmd === "t" && params.length > 0) {

    const { start, end, string, timeout } = tools.parseTimer(params);

    if (start && end && string && timeout >= 0) {
      setTimeout(() => {

        message.channel.send(`Ding ding! ${string} has passed!`, { reply: message.author });
      }, timeout);
      
      return message.channel.send(`Sure thing! Your timer goes off in ${string}`, { reply: message.author });
    }

    return message.channel.send(`Usage: \`!t <number>[h | m | s]\`\nExample: '\`!t 20s\`' to add a 20 second timer`, { reply: message.author });  
  }

  return false;
};


// ### Discord client code and wiring
const { Client, MessageEmbed } = require("discord.js");

const client = new Client();

client.on("ready", () => {

  console.info("Discord client ready");

  return true;
});

client.on("message", (message) => {
  return actions.reply(message);
});

client.login(`${env.SECRET}`);

