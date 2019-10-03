import { getCurrentWeek } from '../dao/games';
import { setAlwaysAllIn } from '../dao/contestants';
import { getScores, recordWager } from '../dao/scorecards';

export async function alwaysAllIn(text, user_id) {
    const currentWeek = await getCurrentWeek();
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

    const currentWeek = await getCurrentWeek();
    const wager = text.split(" ");
    
    if (currentWeek.wagers_locked) {
        throw new Error("Sorry, wagers for the final are already locked in");
    }
    
    let wagerAmount = Number(wager[1]);
    if (wagerAmount < 0) {
        throw new Error("Illegal wager");
    }
    
    const subtotal = await getScores({ week: currentWeek.week, contestant: user_id })[0];
    if (wagerAmount > max_unbacked_wager && wagerAmount > subtotal) {
        throw new Error("Illegal wager");
    }
    else if (wagerAmount > max_unbacked_wager) {
        throw new Error("Illegal wager");
    }
    
    await recordWager(user_id, wagerAmount);
    return "Thanks for your wager of " + wagerAmount;
}
