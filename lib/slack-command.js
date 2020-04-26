import * as gameplay from './dao/games';
import * as scorecards from './dao/scorecards';
import * as responseRecording from './commands/response';
import * as wagering from './commands/wagering';
import * as host from './commands/host';
import inContention from './in-contention/index';

export default async function(payload, response) {
    const timestamp = payload.headers['X-Slack-Request-Timestamp'][0];
    if (Math.abs(Date.now - timestamp) > 60 * 5) {
      response.setStatusCode(400);
      return;
    }
    
    const request_mac = payload.headers['X-Slack-Signature'][0];
    if (request_mac.substring(0, 3) != 'v0=') {
      response.setStatusCode(400);
      return;
    }
    
    let body;
    if (payload.body) {
      body = payload.body.text();
    } else {
      body = "";
    }
    const local_mac = 'v0=' + utils.crypto.hmac('v0:' + timestamp + ':' + body || "", context.values.get('slack_signing_secret'), 'sha256', 'hex');
    let good_mac = true;
    for (let i = 0; i < request_mac.length; i++) {
      let ch = request_mac.charAt(i);
      if (i >= local_mac.length || ch !== local_mac.charAt(i)) {
        good_mac = false;
      }
    }
    if (!good_mac) {
      response.setStatusCode(400);
      return;
    }
    
    const {text, user_id, channel_id} = payload.query;
    
    const isHost = async function() {
      const currentWeek = await gameplay.getCurrentWeek();
      return user_id === currentWeek.host;
    }
    const assertIsHost = async function() {
      if (!await isHost()) {
        throw new Error("You're not the host");
      }
    }

    let responseMessage;
    try {
      if (text.substring(0, 14) === "always_all_in ") {
        return await wagering.alwaysAllIn(text, user_id);
      }
      else if (text.substring(0, 9) === "new week ") {
        assertIsHost();

        return await host.newWeek(text);
      }
      else if (text.substring(0, 9) === "response ") {
        await assertIsHost();
        responseMessage = await responseRecording.regularResponse(text, channel_id);
      }
      else if (text.substring(0, 6) === "final ") {
        await assertIsHost();
        responseMessage = await responseRecording.finalResponse(text, channel_id);
      }
      else if (text.substring(0, 6) === "wager ") {
        return await wagering.wager(text, user_id);
      }
      else if (text === "lock wagers") {
        assertIsHost();
        return await wagering.lockWagers();
      }
      else if (text === "finalize") {
        assertIsHost();
        return await host.finalize();
      }
      else if (text === "in contention") {
        const results = await inContention();
        let text = "Jeopardy results:\n";
        if (results.winners.length > 0) {
          text += "Winner";
          if (results.winners.length > 1) {
            text += "s";
          }
          text += ":\n";
          for (let i = 0; i < results.winners.length; i++) {
            text += `<@${results.winners[i]}>\n`;
          }
        }
        if (results.in_contention.length > 0) {
          text += "In contention:\n";
          for (let i = 0; i < results.in_contention.length; i++) {
            text += `<@${results.in_contention[i]}>\n`;
          }
        }
        if (results.eliminated.length > 0) {
          text += "Eliminated:\n";
          for (let i = 0; i < results.eliminated.length; i++) {
            text += `<@${results.eliminated[i]}>\n`;
          }
        }

        responseMessage = { text: text };
      }
      else if (text === "score") {
        const currentWeek = await gameplay.getCurrentWeek();
        const scores = await scorecards.getScores({ week: currentWeek.week, contestant: user_id });
        responseMessage = {text: `Your score: ${scores[0].total_score}`};
      }
      else if (text === "scores") {
        const currentWeek = await gameplay.getCurrentWeek();
        const scores = await scorecards.getScores({ week: currentWeek.week });
        let text = "Jeopardy scores:\n";
        for (let i = 0; i < scores.length; i++) {
          text += `<@${scores[i].contestant}>: ${scores[i].total_score}\n`;
        }
        responseMessage = {text: text};
      }
      else {
        let hostTools = "";
        if (await isHost()) {
          hostTools += "Host tools:\n" +
            "new week YYYY-MM-DD (start a new game--you must be global host in Stitch values)\n" +
            "response [in]correct (points) (record response, use in DM with contestant)\n" +
            "lock wagers (lock wagers before posting final clue)\n" +
            "final [in]correct (record response to final)\n" +
            "finalize (mark as incorrect anyone who hasn't responded to the final)";
        }

        responseMessage = { text:
          "Subcommands:\n" +
          "always_all_in yes|no (set your always-all-in status)\n" +
          "wager (amount) (set your wager for the final)\n" +
          "score (view your score)\n" +
          "scores (show all scores)\n" +
          hostTools
        };
      }

      if (typeof responseMessage === 'string') {
        return responseMessage;
      }
      else {
        response.setHeader("Content-Type", "application/json");
        response.setBody(JSON.stringify(responseMessage));
      }
    }
    catch (e) {
      return e.message;
    }
}
