const mongoose = require('mongoose')



const blackListTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, "Token is required to be added in blacklist"]
    }
}, {
    timestamps: true
})


const tokenBlacklistModel = mongoose.model("blacklist_tokens", blackListTokenSchema)

module.exports = tokenBlacklistModel