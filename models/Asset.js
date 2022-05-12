const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const assetSchema = new Schema({
    coinName: {
        type: String,
        required: true,
    },
    amount: Number,
    avgPrice: Number,
    users: [
        {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
});

module.exports = mongoose.model('Asset', assetSchema);