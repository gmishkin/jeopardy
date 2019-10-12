const assert = require('assert');

const BSON = require('bson');

const inContention = require('../lib/in-contention').default;

describe('inContention', function () {
    describe('when there is a winner', function () {
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
});
