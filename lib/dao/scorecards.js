import db from './db'
import { getCurrentWeek } from './games'
import inContentionPipeline from '../in-contention/in-contention-pipeline';

const dbScorecards = () => db().collection("scorecards");

const getMaxUnbackedWager = function () {
    Number(context.values.get('max_unbacked_wager'));
}

export async function getScores(matchCriteria) {
    const max_unbacked_wager = getMaxUnbackedWager();

    const results = await dbScorecards().aggregate([
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
      }},
      {$sort: {
        total_score: -1
      }}
    ]).toArray();
    return results;
}

export async function recordResponse(contestant, points) {
    const currentWeek = await getCurrentWeek();

    await dbScorecards().updateOne(
        {
            contestant: contestant,
            week: currentWeek.week
        },
        { "$push": { responses: points } },
        { upsert: true }
    )
}

export async function recordFinalResponse(contestant, multiplier) {
    const currentWeek = await getCurrentWeek();

    await dbScorecards().updateOne(
        {
            contestant: contestant,
            week: currentWeek.week
        },
        { "$set": { final: multiplier } },
        { upsert: true }
    );
}

export async function recordWager(contestant, amount) {
    const currentWeek = await getCurrentWeek();

    await dbScorecards().updateOne(
        {
            contestant: contestant,
            week: currentWeek.week
        },
        {"$set": { wager: amount }}
    );
}

export async function runInContentionPipeline() {
    const currentWeek = await getCurrentWeek()
    return await dbScorecards().aggregate(inContentionPipeline(currentWeek.week, getMaxUnbackedWager())).toArray();
}

export async function finalize() {
  const currentWeek = await getCurrentWeek();

  // Mark people who haven't responded as incorrect
  await dbScorecards().updateMany(
    { week: currentWeek.week, final: { $exists: false } },
    { "$set": { final: -1 } }
  );

  // Record the effective wager of the always all-in people who didn't override their wager this week
  const maxWagerScorecareds = await dbScorecards().aggregate([
    {
      '$match': {
        'wager': { '$exists': false },
        'week': currentWeek.week,
      }
    }, {
      '$lookup': {
        'from': 'contestants', 
        'localField': 'contestant', 
        'foreignField': 'name', 
        'as': 'contestant_info'
      }
    }, {
      '$unwind': {
        'path': '$contestant_info'
      }
    }, {
      '$match': {
        'contestant_info.always_all_in': true
      }
    }, {
      '$project': {
        'effective_wager': { '$sum': '$responses' }
      }
    }
  ]).toArray()

  const updates = [];
  maxWagerScorecareds.forEach(element => {
    updates.push(dbScorecards().updateOne({ _id: element._id },
      { "$set": {wager: element.effective_wager, auto_wager: true}}));
  });

  await Promise.all(updates)
}
