import * as gameplay from '../dao/games';
import * as scorecards from '../dao/scorecards';

export async function newWeek(text) {
    const week = text.substring(text.length - 10).split('-');
    await gameplay.newWeek(week, user_id);
    return "Game started";
}

export async function finalize() {
    await Promise.all([scorecards.finalize(), gameplay.finalize()]);
    return "Everyone who didn't respond to final is marked as incorrect. Check \"in contention\" for the winner.";
}
