const express = require("express");
const router = express.Router();
const landingController = require("../controllers/landingController");

// ✅ Clone landing
router.post("/clone", landingController.cloneLanding);

// ✅ Lấy danh sách landing của user
router.get("/my/:userId", landingController.getUserLandings);

module.exports = router;
