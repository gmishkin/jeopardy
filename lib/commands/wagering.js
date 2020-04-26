import * as gameplay from '../dao/games';
import { setAlwaysAllIn } from '../dao/contestants';
import { getScores, recordWager } from '../dao/scorecards';

export async function alwaysAllIn(text, user_id) {
    const currentWeek = await gameplay.getCurrentWeek();
    if (currentWeek.wagers_locked) {
        throw new Error("Sorry, you can't adjust your always-all-in status while wagering is locked. Wait til next week.");
    }

    let setting;
    if (text.substring(text.length - 4) === " yes") {
        setting = true;
    }
    else {
        setting = false;
    }

    await setAlwaysAllIn(user_id, setting);
    return "Your always-all-in status has been set to " + setting;
}

export async function wager(text, user_id) {
    const max_unbacked_wager = Number(context.values.get('max_unbacked_wager'));

    const currentWeek = await gameplay.getCurrentWeek();
    const wager = text.split(" ");
    
    if (currentWeek.wagers_locked) {
        throw new Error("Sorry, wagers for the final are already locked in");
    }
    
    const wagerText = wager[1];
    let wagerAmount = Number(wagerText);
    if (wagerAmount < 0) {
        throw new Error("Illegal wager");
    }
    
    const scorecards = await getScores({ week: currentWeek.week, contestant: user_id });
    const subtotal = scorecards[0].subtotal_score;
    if (wagerText === "all") {
        wagerAmount = subtotal;
    }
    else if (isNaN(wagerAmount)) {
        throw new Error("Illegal wager");
    }
    else if (wagerAmount > max_unbacked_wager && wagerAmount > subtotal) {
        throw new Error("Illegal wager");
    }
    
    await recordWager(user_id, wagerAmount);
    return "Thanks for your wager of " + wagerAmount;
}

export async function lockWagers() {
    const currentWeek = await gameplay.getCurrentWeek();
    const scorecards = await getScores({ week: currentWeek.week, contestant: currentWeek.host });

    if (!scorecards[0].wager) {
        return "You haven't wagered yet, dummy";
    }

    await gameplay.lockWagers();
    return "Wagers locked"
}
