import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    razorpay_order_id: {
        type: String,
        required: true,
    },
    razorpay_payment_id: {
        type: String,
        required: true,
    },
    razorpay_signature: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['created', 'verified', 'failed'], 
        default: 'created',
    },
    amount: {
        type: Number, 
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

export const Payment = mongoose.model("Payment", paymentSchema);