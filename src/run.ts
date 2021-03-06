import * as indexConf from "../conf/index.json";
import TelegramBot from "node-telegram-bot-api";
import { GitInfo } from "./ext/struct";
import { exec } from "child_process";

// AccessToken
const token: string = indexConf.telegram.accessToken;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Whitelisted chatIds.
const chatIds: number[] = indexConf.telegram.chatIds;

// Whitelisted UserIds.
const userIds: string[] = indexConf.telegram.userIds;

// Repositories
const list: GitInfo[] = indexConf.telegram.list;
const repos: string[] = list.map((e: GitInfo): string => e.name);

//

let running: { [k: string]: boolean } = {};

// MAIN
bot.on("message", async (msg: TelegramBot.Message) => {
  console.log(`got message`);
  const userId: string | undefined = msg.from
    ? msg.from.username
    : msg.chat.username;
  console.log(`msg: ${JSON.stringify(msg)}`);
  if (userId === undefined || userIds.indexOf(userId) < 0) return;
  console.log(`passed userId: ${userId}`);
  const chatId = msg.chat.id;
  if (chatIds.indexOf(chatId) < 0) return;
  console.log(`passed chatId (1/2): ${chatId}`);
  if (msg.text === undefined) return;
  console.log(`passed chatId (2/2): ${chatId}`);
  const repoIdx: number = repos.indexOf(msg.text);
  if (repoIdx < 0) return;
  console.log(`passed repo: ${msg.text}`);

  // Now we have a repo index.
  const cmd: string = list[repoIdx].command;
  const repo: string = repos[repoIdx];

  console.log(
    `[${new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul"
    })}] (@${userId}) executing '${msg.text}' ...`
  );

  if (running[repo]) {
    bot.sendMessage(chatId, `'${msg.text}' is already running. wait for it.`, {
      reply_to_message_id: msg.message_id
    });
    return;
  }
  bot.sendMessage(chatId, `Start Building '${msg.text}'`, {
    reply_to_message_id: msg.message_id
  });
  running[repo] = true;
  await exec(cmd, (error, stdout, stderr) => {
    // your callback
    console.log(` stdout =>`, stdout);
    if (error != null) {
      console.log("exec error: " + error);
      bot.sendMessage(chatId, "Failed to built.\n```" + error + "```", {
        reply_to_message_id: msg.message_id
      });
      delete running[repo];
      return;
    } else {
      // send a message to the chat acknowledging receipt of their message
      const stdMsg: string =
        stdout.indexOf("Already up to date.") > 0 ? "\n" + stdout : "";
      bot.sendMessage(chatId, "Successfully built." + stdMsg, {
        reply_to_message_id: msg.message_id
      });
      delete running[repo];
      return;
    }
  });
  return;
});
