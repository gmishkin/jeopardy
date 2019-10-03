import db from './db'

const dbContestants = db.collection("contestants");

export async function setAlwaysAllIn(contestant, setting) {
    await dbContestants.updateOne(
        { name: contestant },
        { name: contestant, always_all_in: setting },
        { upsert: true }
    );
}
