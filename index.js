import { env, exit } from "process";
import { get } from "https";
import { Client, MessageEmbed } from "discord.js";

if (!env.hasOwnProperty("SECRET") || env.SECRET.length <= 0) {
  console.error("No or zero length SECRET environmental variable");
  exit(1);
}

// ### Tools
// Tools are functions used by the client code to parse or fetch data which the client code can then pass to command functions
const tools = {};

tools.fetchUrl = (url) => {

  return new Promise((resolve, reject) => {

    get(url, (res) => {

      let data = "";

      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve(data || ""));

    })
    .on("error", (err) => reject(err));

  });
};

tools.parseMessage = (message) => {

  // "!cmd example some trailing text" => { cmd: "cmd", trailing: "some trailing text" }
  const [full, cmd, trailing] = message.content.match(/^\!([^ ]+) \s*(.*?)\s*$/i);

  return { cmd, trailing };
};

tools.parseAlarmText = (trailing) => {

  const time = new Date();

  // "22:37" => ["22:37", "22", "37", undefined, undefined], "10:37:55pm" => ["10:37:55 pm", "10", "37", "55", "pm"]
  const [full, hours, minutes, seconds, period] = (trailing.match(/^([0-1]?[0-9]|2[0-4])[.:]?([0-5][0-9])[.:]?([0-5][0-9])?\s*([ap]m)?$/i) || []).map((a) => Number(a) || a);

  hours && time.setHours(hours);
  minutes && time.setMinutes(minutes);

  time.setSeconds(seconds || 0);

  if (time.getHours() < 13 && format === "pm") time.setHours(12 + time.getHours());

  const timestamp = time.getTime();
  const timestring = `${hours}:${minutes}:${seconds}${period ? " " + period : ""}`;

  return { timestring, period, timestamp };
};

tools.parseTimerText = (trailing) => {

  const units = { h: "hour", m: "minute", s: "second" };
  // "1h" => [1, "h"], "5m" => [5, "m"], "60s" => [60, "s"]
  const [full, time, suffix] = (trailing.match(/^(\d+)\s*([hms])?$/i) || []).map((t) => Number(t) || t);

  let timeout = time * 1000
  if (suffix === "h") timeout = timeout * 60;
  if (suffix === "h" || suffix === "m") timeout = timeout * 60;

  let timestring = `${time} ${units[suffix] || units["s"]}`;
  if (time > 1 || time === 0) timestring += "s";

  return { timestring, timeout };
};

// ### Commands
// Commands are functions used by the client code that interact with the users or discord based on the data passed to them
const commands = {};

commands.setAlarm = ({ message, timestring, period, timestamp }) => {

  const timeout = timestamp - Date.now();

  if (timestring && timeout >= 0) {
    setTimeout(() => message.channel.send(`Ding ding! It's ${timestring}!`, { reply: message.author }), timeout);

    return message.channel.send(`Alarm set for ${timestring}`, { reply: message.author });
  }

  return message.channel.send(`\`\`\`Usage: !a HH:MM[:SS]['am' | 'pm']\nExample: '!a 22:37' or '!a 10:37pm' to set an alarm for 22:37:00/10:37:00pm\nAlarms default to 00 seconds if not specified, like for example '!a 10:37:55am'\`\`\``, { reply: message.author });
};

commands.setTimer = ({ message, timestring, timeout }) => {

  if (timestring && timeout >= 0 && timeout <= 24 * 60 * 60 * 1000) {
    setTimeout(() => message.channel.send(`Ding ding! ${timestring} has passed!`, { reply: message.author }), timeout);

    return message.channel.send(`Timer goes off in ${timestring}`, { reply: message.author });
  }

  return message.channel.send(`\`\`\`Usage: !t NUMBER ['h' | 'm' | 's']\nExample: '!t 20 s' or '!t 20s' to start a 20 second timer\nTimers can not be set for more than 24 hours\`\`\``, { reply: message.author });
};

// ### Client code
// Client code is the wiring between Discord and the bot, i.e. defining functions for events sent by Discord
const client = new Client();

client.on("ready", () => console.info("Discord client ready"));

client.on("message", (message) => {

  if (message.author.id === client.user.id) return false;

  const { cmd, trailing } = tools.parseMessage(message);
  if (cmd === "a" && trailing.length > 0) return commands.setAlarm({ message, ...tools.parseAlarmText(trailing) });
  if (cmd === "t" && trailing.length > 0) return commands.setTimer({ message, ...tools.parseTimerText(trailing) });
});

client.login(`${env.SECRET}`);
