exports = async function(payload, response) {
  /*
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
  */

    const db = context.services.get("mongodb-atlas").db("jeopardy");
    const max_unbacked_wager = Number(context.values.get('max_unbacked_wager'));

    const getCurrentWeek = async function() {
      const results = await db.collection("games").find().sort({ week: -1 }).limit(1).toArray();
      return results[0];
    }
    
    const getScores = async function(matchCriteria) {
      const results = await db.collection("scorecards").aggregate([
        {$match: matchCriteria},
        {$lookup: {
          from: 'contestants',
          localField: 'contestant',
          foreignField: 'name',
          as: 'contestant_info'
        }},
        {$addFields: {
          subtotal_score: {$sum: "$responses"}
        }},
        {$addFields: {
          final_wager: {
            $ifNull: [
              "$wager",
              {$cond: {
                "if": {$eq: [
                  {$arrayElemAt: ["$contestant_info.always_all_in", 0]},
                  {$literal: true}
                ]},
                "then": {$max: ["$subtotal_score", max_unbacked_wager]},
                "else": 0
              }}
            ]
          }
        }},
        {$addFields: {
          total_score: {
            $add: [
              "$subtotal_score",
              {$multiply: ["$final_wager", {$ifNull: ["$final", {$literal: 0}]}]}
            ]
          }
        }}
      ]).toArray();
      return results;
    }
    
    const {text, user_id, channel_id} = payload.query;
    
    const isHost = async function() {
      const currentWeek = await getCurrentWeek();
      const results = await db.collection("games").find({ week: currentWeek.week }).toArray();
      return user_id === results[0].host;
    }
    
    const getChannelUserId = async function() {
      const result = await context.http.get({ url: "https://slack.com/api/conversations.info?token=" + context.values.get("slack_access_token") + "&channel=" + channel_id });
      const conversation = JSON.parse(result.body.text());
      
      if (!conversation.ok) {
        throw new Error(conversation.error);
      }
      else if (!conversation.channel.is_im) {
        throw new Error("Conversation is not an IM");
      }
      else {
        return conversation.channel.user;
      }
    }

    if (text.substring(0, 14) === "always_all_in ") {
      const currentWeek = await getCurrentWeek();
      if (currentWeek.wagers_locked) {
        return "Sorry, you can't adjust your always-all-in status while wagering is locked. Wait til next week.";
      }

      let setting;
      if (text.substring(text.length - 4) === " yes") {
        setting = true;
      }
      else {
        setting = false;
      }
      
      await db.collection("contestants").updateOne(
        { name: user_id },
        { name: user_id, always_all_in: setting },
        { upsert: true }
      );
      return "Your always-all-in status has been set to " + setting;
    }
    else if (text.substring(0, 9) === "new_week ") {
      if (user_id !== context.values.get("host")) {
        return "You're not the host"
      }
      else {
        const week = text.substring(text.length - 10).split('-');
        await db.collection("games").insertOne({
          week: new Date(week[0], week[1] - 1, week[2]),
          host: user_id
        });
        return "Game started";
      }
    }
    else if (text.substring(0, 9) === "response ") {
      if (!await isHost()) {
        return "You're not the host";
      }

      const currentWeek = await getCurrentWeek();
      const answer = text.split(" ");
      if (answer.length < 3) {
        return "Not enough arguments";
      }

      let multiplier = 0;
      if (answer[1] === "correct") {
        multiplier = 1;
      }
      else if (answer[1] === "incorrect") {
        multiplier = -1;
      }
      const points = multiplier * Number(answer[2]);
      
      let conversation_user;
      try {
        conversation_user = await getChannelUserId();
      }
      catch (e) {
        return e.message;
      }
      await db.collection("scorecards").updateOne(
        {
          contestant: conversation_user,
          week: currentWeek.week
        },
        { "$push": { responses: points } },
        { upsert: true }
      )
      response.setHeader("Content-Type", "application/json");
      response.setBody(JSON.stringify({ response_type: "in_channel", text: answer[1] + " (" + points + " points)" }));
      
    }
    else if (text.substring(0, 6) === "final ") {
      if (!await isHost()) {
        return "You're not the host";
      }
      
      const currentWeek = await getCurrentWeek();
      const answer = text.split(" ");
      let multiplier = -1;
      if (answer[1] === "correct") {
        multiplier = 1;
      }
      
      let conversation_user;
      try {
        conversation_user = await getChannelUserId();
      }
      catch (e) {
        return e.message;
      }
      await db.collection("scorecards").updateOne(
        {
          contestant: conversation_user,
          week: currentWeek.week
        },
        { "$set": { final: multiplier } },
        { upsert: true }
      );
      
      response.setHeader("Content-Type", "application/json");
      response.setBody(JSON.stringify({ response_type: "in_channel", text: answer[1] }));
    }
    else if (text.substring(0, 6) === "wager ") {
      const currentWeek = await getCurrentWeek();
      const wager = text.split(" ");
      
      if (currentWeek.wagers_locked) {
        return "Sorry, wagers for the final are already locked in";
      }
      
      let wagerAmount = Number(wager[1]);
      if (wagerAmount < 0) {
        return "Illegal wager";
      }
      
      const scorecard = await db.collection("scorecards").find({ week: currentWeek.week, contestant: user_id }).toArray();
      let subtotal = 0;
      if (scorecard[0].responses) {
        for (let i = 0; i < scorecard[0].responses.length; i++) {
          subtotal += scorecard[0].responses[i];
        }
        if (wagerAmount > max_unbacked_wager && wagerAmount > subtotal) {
          return "Illegal wager";
        }
      }
      else if (wagerAmount > max_unbacked_wager) {
        return "Illegal wager";
      }
      
      await db.collection("scorecards").updateOne(
        {
          contestant: user_id,
          week: currentWeek.week
        },
        {"$set": { wager: wagerAmount }}
      );
      return "Thanks for your wager of " + wagerAmount;
    }
    else if (text === "lock wagers") {
      if (!await isHost()) {
        return "You're not the host"
      }
      const currentWeek = await getCurrentWeek();
      await db.collection("games").updateOne({ week: currentWeek.week }, { "$set": { wagers_locked: true }});
      return "Wagers locked";
    }
    else if (text === "score") {
      const currentWeek = await getCurrentWeek();
      const scores = await getScores({ week: currentWeek.week, contestant: user_id });
      response.setHeader("Content-Type", "application/json");
      response.setBody(JSON.stringify({text: `Your score: ${scores[0].total_score}`}));
    }
    else if (text === "scores") {
      const currentWeek = await getCurrentWeek();
      const scores = await getScores({ week: currentWeek.week });
      let text = "Jeopardy scores:\n";
      for (let i = 0; i < scores.length; i++) {
        text += `<@${scores[i].contestant}>: ${scores[i].total_score}\n`;
      }
      response.setHeader("Content-Type", "application/json");
      response.setBody(JSON.stringify({text: text}));
    }
    else {
      let hostTools = "";
      if (await isHost()) {
        hostTools += "Host tools:\n" +
          "new_week YYYY-MM-DD (start a new game--you must be global host in Stitch values)\n" +
          "response [in]correct (points) (record response, use in DM with contestant)\n" +
          "lock wagers (lock wagers before posting final clue)\n" +
          "final [in]correct (record response to final)";
      }
      
      response.setHeader("Content-Type", "application/json");
      response.setBody(JSON.stringify({ text:
        "Subcommands:\n" +
        "always_all_in yes|no (set your always-all-in status)\n" +
        "wager (amount) (set your wager for the final)\n" +
        "score (view your score)\n" +
        "scores (show all scores)\n" +
        hostTools
      }));
    }
};