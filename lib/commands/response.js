import { recordResponse, recordFinalResponse, getScores } from '../dao/scorecards';
import { getCurrentWeek } from '../dao/games';

async function getChannelUserId(channel_id) {
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

export async function regularResponse(text, channel_id) {
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
      
    const conversation_user = await getChannelUserId(channel_id);
    await recordResponse(conversation_user, points);

    const currentWeek = await getCurrentWeek();
    const scorecards = await getScores({ week: currentWeek.week, contestant: conversation_user });

    return { response_type: "in_channel", text: `${answer[1]} (${points} points), new score is ${scorecards[0].total_score}` };
}

export async function finalResponse(text, channel_id) {
    const answer = text.split(" ");
    let multiplier = -1;
    if (answer[1] === "correct") {
        multiplier = 1;
    }
    
    const conversation_user = await getChannelUserId(channel_id);
    await recordFinalResponse(conversation_user, multiplier);

    const currentWeek = await getCurrentWeek();
    const scorecards = await getScores({ week: currentWeek.week, contestant: conversation_user });
    
    return { response_type: "in_channel", text: `${answer[1]}, final score is ${scorecards[0].total_score}` };
}
