const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderSchema = new Schema({
    coinName: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    investedValue: {
        type: Number,
        required: true,
    },
    orderCompleted: {
        type: Boolean,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    timePlaced: {
        type: Date,
        required: true,
    },
    timeExecuted: {
        type: Date,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }

})

module.exports = mongoose.model('Order', OrderSchema);