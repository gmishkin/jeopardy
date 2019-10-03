import db from './db'

const dbGames = db.collection("games");

export async function newWeek(week, host) {
    await dbGames.insertOne({
        week: new Date(week[0], week[1] - 1, week[2]),
        host: host
    });
}

export async function getCurrentWeek() {
    const results = await dbGames.find().sort({ week: -1 }).limit(1).toArray();
    return results[0];
}

export async function lockWagers() {
    const currentWeek = await getCurrentWeek();
    await dbGames.updateOne({ week: currentWeek.week }, { "$set": { wagers_locked: true }});
}
