const BSON = require('bson');

const inContention = require('../lib/in-contention');

const result = inContention([{
    _id: new BSON.ObjectId(),
    min_score: 1000,
    max_score: 2200
}, {
    _id: new BSON.ObjectId(),
    min_score: 1200,
    max_score: 2000
}, {
    _id: new BSON.ObjectId(),
    min_score: 0,
    max_score: 900
}]);

console.log(result);
