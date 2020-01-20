export default function (week, max_unbacked_wager) {
    return [
        {$match: {
            week: week,
        }},
        {$addFields: {
            subtotal: { $sum: '$responses' }
        }},
        {$lookup: {
            from: 'contestants',
            localField: 'contestant',
            foreignField: 'name',
            as: 'contestant_info'
        }},
        {$addFields: {
            final_wager: { $ifNull: [
                '$wager',
                { $cond: {
                    'if': { $eq: [
                        { $arrayElemAt: ['$contestant_info.always_all_in', 0]},
                        { $literal: true }
                    ]},
                    'then': { $max: ['$subtotal', max_unbacked_wager] },
                    'else': 0
                }}
            ]}
        }},
        {$addFields: {
            total_score: { $add: [
                '$subtotal',
                { $multiply: ['$final_wager', '$final' ] }
            ]}
        }},
        {$addFields: {
            min_score: { $ifNull: ["$total_score",
                {$subtract: ["$subtotal", "$final_wager"]}
            ]},
            max_score: { $ifNull: ["$total_score",
                {$add: ["$subtotal", "$final_wager"]}
            ]}
        }},
        {$project: {
            contestant: 1,
            min_score: 1,
            max_score: 1
        }}
    ];
}
