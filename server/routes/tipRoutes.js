import express from "express";
import Tip from "../Models/Tips.js";

const router = express.Router();

// GET all tips — optional ?governorate= filter
router.get("/", async (req, res) => {
  try {
    const { governorate } = req.query;

    // إذا جاء governorate → نرجع tips الخاصة بها + tips "All"
    // إذا ما جاء → نرجع الكل
    let filter = {};
    if (governorate) {
      filter = { $or: [{ governorate }, { governorate: "All" }] };
    }

    const tips = await Tip.find(filter).sort({ createdAt: -1 });
    res.json(tips);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADD tip
router.post("/", async (req, res) => {
  try {
    const { type, content, governorate = "All" } = req.body;
    const newTip = new Tip({ type, content, governorate });
    await newTip.save();
    res.json(newTip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE tip
router.put("/:id", async (req, res) => {
  try {
    const { type, content, governorate } = req.body;
    const updated = await Tip.findByIdAndUpdate(
      req.params.id,
      { type, content, ...(governorate && { governorate }) },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Tip not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE tip
router.delete("/:id", async (req, res) => {
  try {
    await Tip.findByIdAndDelete(req.params.id);
    res.json({ message: "Tip deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;