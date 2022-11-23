const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
    {
        amount: {
            type: Number,
            default: 0
        },

        //check user again for security
        userId: {
            type: String,
            required: true,
            ref: "users",
        },

        isInflow: {
            type: Boolean
        },

        paymentMethod: {
            type: String,
            default: "flutterwave"
        },

        currency: {
            type: String,
            required: [true, "currency is required"],
            enum: ["NGN", "USD", "EUR", "GBP"],
        },

        status: {
            type: String,
            required: [true,"payment status is required"],
            enum: ["successful", "pending", "failed"],
        },
    },
);

module.exports = mongoose.model("wallet_transact", walletTransactionSchema);