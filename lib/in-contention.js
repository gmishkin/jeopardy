module.exports = function (scorecards) {
    // Is someone's min score greater than the highest of the other contestants' max scores? They're the winner
    // Is someone's max score less than the lowest of the other contestants' min scores? They're eliminated
    // Anyone else is still in contention

    const result = {
        winner: null,
        eliminated: [],
        in_contention: []
    };

    for (let i = 0; i < scorecards.length; i++) {
        if (scorecards[i].eliminated) continue;

        let min_other_mins = Number.POSITIVE_INFINITY;
        let max_other_maxes = Number.NEGATIVE_INFINITY;
        for (let j = 0; j < scorecards.length; j++) {
            if (i === j) continue;
            if (scorecards[j].min_score < min_other_mins) {
                min_other_mins = scorecards[j].min_score;
            }
            if (scorecards[j].max_score > max_other_maxes) {
                max_other_maxes = scorecards[j].max_score;
            }
        }
        if (scorecards[i].min_score > max_other_maxes) {
            result.winner = scorecards[i]._id
            for (let k = 0; k < result.in_contention.length; k++) {
                result.eliminated.push(result.in_contention[k]);
            }
            result.in_contention = [];
            break;
        }
        else if (scorecards[i].max_score < min_other_mins) {
            scorecards[i].eliminated = true;
            result.eliminated.push(scorecards[i]._id);
        }
        else {
            result.in_contention.push(scorecards[i]._id);
        }
    }

    return result;
}
