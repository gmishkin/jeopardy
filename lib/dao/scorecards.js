import db from './db'
import { getCurrentWeek } from './games'

const dbScorecards = () => db().collection("scorecards");

export async function getScores(matchCriteria) {
    const max_unbacked_wager = Number(context.values.get('max_unbacked_wager'));

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
