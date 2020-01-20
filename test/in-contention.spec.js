const assert = require('assert');

const BSON = require('bson');

const inContention = require('../lib/in-contention/in-contention').default;

describe('inContention', function () {
    describe('when there is a winner before scores are final', function () {
        const winner = {
            _id: new BSON.ObjectId('5da13f73be917b4a6314f57f'),
            min_score: 2000,
            max_score: 4000
        };
        const runnerUp = {
            _id: new BSON.ObjectId('5da14041be917b4a6314f580'),
            min_score: 0,
            max_score: 1000
        };

        it('correctly identifies a single winner', function () {
            const result = inContention([winner, runnerUp]);

            assert.strictEqual(result.winners.length, 1, 'Expected a single winner');
            assert.ok(winner._id.equals(result.winners[0]), 'Expected the winner to be this one');
        });

        it('eliminates the other contestant', function () {
            const result = inContention([winner, runnerUp]);

            assert.strictEqual(result.in_contention.length, 0, 'Expected no one else to be in contention');
            assert.strictEqual(result.eliminated.length, 1, 'Expected one to be eliminated');
            assert.ok(runnerUp._id.equals(result.eliminated[0]), 'Expected this one to be eliminated');
        });
    });

    describe('when there is a winner after scores are final', function () {
        const winner = {
            _id: new BSON.ObjectId('5da13f73be917b4a6314f57f'),
            min_score: 2000,
            max_score: 2000
        };
        const runnerUp = {
            _id: new BSON.ObjectId('5da14041be917b4a6314f580'),
            min_score: 1000,
            max_score: 1000
        };

        it('correctly identifies a single winner', function () {
            const result = inContention([winner, runnerUp]);

            assert.strictEqual(result.winners.length, 1, 'Expected a single winner');
            assert.ok(winner._id.equals(result.winners[0]), 'Expected the winner to be this one');
        });

        it('eliminates the other contestant', function () {
            const result = inContention([winner, runnerUp]);

            assert.strictEqual(result.in_contention.length, 0, 'Expected no one else to be in contention');
            assert.strictEqual(result.eliminated.length, 1, 'Expected one to be eliminated');
            assert.ok(runnerUp._id.equals(result.eliminated[0]), 'Expected this one to be eliminated');
        });
    });

    describe('when there is not a winner', function () {
        const leader = {
            _id: new BSON.ObjectId('5da145ea6649e70395439e34'),
            min_score: 2000,
            max_score: 2000
        }
        const inContention1 = {
            _id: new BSON.ObjectId('5da146206649e70395439e35'),
            min_score: 1500,
            max_score: 2500
        }
        const loser = {
            _id: new BSON.ObjectId('5da146c93821438b8d37228d'),
            min_score: 0,
            max_score: 400
        };

        it('correctly identify who\'s in contention', function () {
            const result = inContention([leader, inContention1, loser]);

            assert.strictEqual(result.winners.length, 0, 'Expected there to not be a winner declared');
            assert.strictEqual(result.in_contention.length, 2, 'Expected two to be in contention');
            assert.ok(result.in_contention.find(scorecard_id => leader._id.equals(scorecard_id)), "Expect the leader to be in contention");
            assert.ok(result.in_contention.find(scorecard_id => inContention1._id.equals(scorecard_id)), "Expect the one other to be in contention");
        });

        it('correctly identify who\'s eliminated', function () {
            const result = inContention([leader, inContention1, loser]);

            assert.strictEqual(result.eliminated.length, 1, 'Expected one to be eliminated');
            assert.ok(loser._id.equals(result.eliminated[0], 'Expected this one to be eliminated'));
        });
    });

    describe('when there is a potential tie', function () {
        const leader = {
            _id: new BSON.ObjectId('5da145ea6649e70395439e34'),
            min_score: 2000,
            max_score: 2000
        }
        const contender = {
            _id: new BSON.ObjectId('5da146206649e70395439e35'),
            min_score: 1500,
            max_score: 2000
        }
        const loser = {
            _id: new BSON.ObjectId('5da146c93821438b8d37228d'),
            min_score: 0,
            max_score: 400
        };

        it('does not declare a winner', function () {
            const result = inContention([leader, contender, loser]);
            assert.strictEqual(result.winners.length, 0, 'Expected there to not be a winner declared');
        });

        it('treats both as in contention', function () {
            const result = inContention([leader, contender, loser]);
            assert.strictEqual(result.in_contention.length, 2, 'Expected both to be in contention');
            assert.ok(result.in_contention.find(scorecard_id => leader._id.equals(scorecard_id)), "Expect the leader to be in contention");
            assert.ok(result.in_contention.find(scorecard_id => contender._id.equals(scorecard_id)), "Expect the potential tie one other to be in contention");
        });

        it('eliminates the loser', function () {
            const result = inContention([leader, contender, loser]);
            assert.strictEqual(result.eliminated.length, 1, 'Expected the loser to be eliminated');
            assert.ok(loser._id.equals(result.eliminated[0]), 'Expected this one to be eliminated');
        })
    });

    describe('when there is a tie', function () {
        const winner1 = {
            _id: new BSON.ObjectId('5da145ea6649e70395439e34'),
            min_score: 2000,
            max_score: 2000
        }
        const winner2 = {
            _id: new BSON.ObjectId('5da146206649e70395439e35'),
            min_score: 2000,
            max_score: 2000
        }
        const loser = {
            _id: new BSON.ObjectId('5da146c93821438b8d37228d'),
            min_score: 400,
            max_score: 400
        };

        it('identifies both winners', function () {
            const result = inContention([winner1, winner2, loser]);
            assert.strictEqual(result.winners.length, 2, 'Expected two winners');
            assert.ok(result.winners.find(scorecard_id => winner1._id.equals(scorecard_id)), "Expected the first winner to be identified");
            assert.ok(result.winners.find(scorecard_id => winner2._id.equals(scorecard_id)), "Expected the second winner to be identified");
        });

        it('sees no one is still in contention', function () {
            const result = inContention([winner1, winner2, loser]);
            assert.strictEqual(result.in_contention.length, 0, "Expected no one to still be in contention");
        });

        it('eliminates the loser', function () {
            const result = inContention([winner1, winner2, loser]);
            assert.strictEqual(result.eliminated.length, 1, 'Expected the loser to be eliminated');
            assert.ok(loser._id.equals(result.eliminated[0]), 'Expected this one to be eliminated');
        });
    });

    describe('when losers are tied', function () {
        const winner = {
            _id: new BSON.ObjectId('5da13f73be917b4a6314f57f'),
            min_score: 2000,
            max_score: 4000
        };
        const loser1 = {
            _id: new BSON.ObjectID('5da530c5cf8f1bc515affde3'),
            min_score: 400,
            max_score: 400
        };
        const loser2 = {
            _id: new BSON.ObjectID('5da530f0cf8f1bc515affde4'),
            min_score: 400,
            max_score: 400
        };

        it('declares the correct winner', function () {
            const result = inContention([winner, loser1, loser2]);

            assert.strictEqual(result.winners.length, 1, 'Expected a single winner');
            assert.ok(winner._id.equals(result.winners[0]), 'Expected the winner to be this one');
            assert.strictEqual(result.in_contention.length, 0, 'Expected no one to be in content');
        });

        it('eliminates both losers', function () {
            const result = inContention([winner, loser1, loser2]);

            assert.strictEqual(result.eliminated.length, 2, 'Expected two losers');
            assert.ok(result.eliminated.find(scorecard_id => loser1._id.equals(scorecard_id)), 'Expected loser1 to be eliminated');
            assert.ok(result.eliminated.find(scorecard_id => loser2._id.equals(scorecard_id)), 'Expected loser2 to be eliminated');
        });
    });

    describe('when two contestants in contention are tied', function () {
        const contender1 = {
            _id: new BSON.ObjectID('5da530c5cf8f1bc515affde3'),
            min_score: 2400,
            max_score: 2400
        };
        const contender2 = {
            _id: new BSON.ObjectID('5da530f0cf8f1bc515affde4'),
            min_score: 2400,
            max_score: 2400
        };
        const swingContender = {
            _id: new BSON.ObjectId('5da532847fe26ace252b50bf'),
            min_score: 1000,
            max_score: 3000
        };

        it('everyone is still in contention', function () {
            const result = inContention([contender1, contender2, swingContender]);
            assert.strictEqual(result.in_contention.length, 3, "Everyone to be in contention");
            assert.strictEqual(result.winners.length, 0, "No winners");
            assert.strictEqual(result.eliminated.length, 0, "No one eliminated");
        });
    });

    describe('when two contenders have the same range of outcomes', function () {
        const contender1 = {
            _id: new BSON.ObjectID('5da530c5cf8f1bc515affde3'),
            min_score: 1400,
            max_score: 2400
        };
        const contender2 = {
            _id: new BSON.ObjectID('5da530f0cf8f1bc515affde4'),
            min_score: 1400,
            max_score: 2400
        };
        const loser = {
            _id: new BSON.ObjectId('5da146c93821438b8d37228d'),
            min_score: 400,
            max_score: 400
        };

        it('does not declare a winner', function () {
            const result = inContention([contender1, contender2, loser]);
            assert.strictEqual(result.winners.length, 0, 'Expected there to not be a winner declared');
        });

        it('puts the correct contestants as in contention', function () {
            const result = inContention([contender1, contender2, loser]);
            assert.strictEqual(result.in_contention.length, 2, 'Expected two contenders');
            assert.ok(result.in_contention.find(scorecard_id => contender1._id.equals(scorecard_id)), "Expect the first contestant to be in contention");
            assert.ok(result.in_contention.find(scorecard_id => contender2._id.equals(scorecard_id)), "Expect the second contestant to be in contention");
        });

        it('eliminates the loser', function () {
            const result = inContention([contender1, contender2, loser]);
            assert.strictEqual(result.eliminated.length, 1, 'Expected the loser to be eliminated');
            assert.ok(loser._id.equals(result.eliminated[0]), 'Expected this one to be eliminated');
        });
    });
});
