const express = require("express");
const { handleAIRequest } = require("../controllers/aiController");

const router = express.Router();

router.post("/", handleAIRequest);

module.exports = router;
