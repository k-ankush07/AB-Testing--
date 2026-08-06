import express from "express";
import Experiment from "../models/Experiment.js";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/experiments", async (req, res) => {
  try {
    const { shop, type, name, testGroups } = req.body;

    if (!shop || !type || !testGroups || testGroups.length < 2) {
      return res.status(400).json({
        error: "shop, type, and at least 2 testGroups are required",
      });
    }

    if (testGroups.length > 5) {
      return res.status(400).json({ error: "Maximum 5 test groups allowed" });
    }

    const totalPercent = testGroups.reduce((sum, g) => sum + g.percent, 0);
    if (totalPercent !== 100) {
      return res.status(400).json({ error: "Test group percentages must sum to 100" });
    }

    const experiment = await Experiment.create({
      shop,
      type,
      name,
      status: "pending",
      testGroups,
    });

    return res.status(201).json({ experiment });
  } catch (err) {
    console.error("Create experiment error:", err.message);
    return res.status(500).json({ error: "Failed to create experiment" });
  }
});

router.get("/experiments", async (req, res) => {
  try {
    const { shop } = req.query;
    if (!shop) return res.status(400).json({ error: "shop is required" });

    const experiments = await Experiment.find({ shop }).sort({ createdAt: -1 });
    return res.json({ experiments });
  } catch (err) {
    console.error("List experiments error:", err.message);
    return res.status(500).json({ error: "Failed to fetch experiments" });
  }
});

router.delete("/experiments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Experiment.findOneAndDelete({ experimentId: id });

    if (!deleted) {
      return res.status(404).json({ error: "Experiment not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Delete experiment error:", err.message);
    return res.status(500).json({ error: "Failed to delete experiment" });
  }
});

router.patch("/experiments/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const experiment = await Experiment.findOne({ experimentId: id });
    if (!experiment) {
      return res.status(404).json({ error: "Experiment not found" });
    }

    const updateData = { status };
    // startedAt sirf PEHLI baar set karo — dobara active karne pe overwrite mat karo,
    // warna merge order (first-wins by startedAt) galat ho jaata hai
    if (status === "active" && !experiment.startedAt) {
      updateData.startedAt = new Date();
    }
    if (status === "ended") updateData.endedAt = new Date();

    const updated = await Experiment.findOneAndUpdate(
      { experimentId: id },
      updateData,
      { new: true }
    );

    return res.json({ experiment: updated });
  } catch (err) {
    console.error("Update status error:", err.message);
    return res.status(500).json({ error: "Failed to update experiment" });
  }
});

router.get("/experiments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const experiment = await Experiment.findOne({ experimentId: id });

    if (!experiment) {
      return res.status(404).json({ error: "Experiment not found" });
    }

    return res.json({ experiment });
  } catch (err) {
    console.error("Get experiment error:", err.message);
    return res.status(500).json({ error: "Failed to fetch experiment" });
  }
});

router.put("/experiments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, testGroups } = req.body;

    if (!testGroups || testGroups.length < 2 || testGroups.length > 5) {
      return res.status(400).json({ error: "Between 2 and 5 test groups required" });
    }

    const totalPercent = testGroups.reduce((sum, g) => sum + g.percent, 0);
    if (totalPercent !== 100) {
      return res.status(400).json({ error: "Test group percentages must sum to 100" });
    }

    const updated = await Experiment.findOneAndUpdate(
      { experimentId: id },
      { name, testGroups },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Experiment not found" });
    }

    return res.json({ experiment: updated });
  } catch (err) {
    console.error("Update experiment error:", err.message);
    return res.status(500).json({ error: "Failed to update experiment" });
  }
});

router.post("/experiments/:id/builder-token", async (req, res) => {
  try {
    const { id } = req.params;
    const { shop } = req.body;

    const experiment = await Experiment.findOne({ experimentId: id });
    if (!experiment) {
      return res.status(404).json({ error: "Experiment not found" });
    }

    const token = jwt.sign(
      {
        experimentId: id,
        shop,
        scope: "builder",
      },
      process.env.API_SECRET_KEY,
      { expiresIn: "24h" }
    );

    return res.json({ token });
  } catch (err) {
    console.error("Builder token error:", err.message);
    return res.status(500).json({ error: "Failed to generate token" });
  }
});

router.delete("/experiments/:id/modifications/:modId", async (req, res) => {
  try {
    const { id, modId } = req.params;
    const experiment = await Experiment.findOne({ experimentId: id });
    if (!experiment) {
      return res.status(404).json({ error: "Experiment not found" });
    }

    experiment.modifications = (experiment.modifications || []).filter(
      (m) => m.id !== modId
    );
    experiment.markModified("modifications");
    await experiment.save();

    return res.json({ success: true, modifications: experiment.modifications });
  } catch (err) {
    console.error("Delete modification error:", err.message);
    return res.status(500).json({ error: "Failed to delete modification" });
  }
});

router.put("/experiments/:id/modifications/:modId", async (req, res) => {
  try {
    const { id, modId } = req.params;
    const updatedMod = req.body;

    const experiment = await Experiment.findOne({ experimentId: id });
    if (!experiment) {
      return res.status(404).json({ error: "Experiment not found" });
    }

    const idx = (experiment.modifications || []).findIndex((m) => m.id === modId);
    if (idx === -1) {
      return res.status(404).json({ error: "Modification not found" });
    }

    experiment.modifications[idx] = { ...updatedMod, id: modId };
    experiment.markModified("modifications");
    await experiment.save();

    return res.json({ modification: experiment.modifications[idx] });
  } catch (err) {
    console.error("Update modification error:", err.message);
    return res.status(500).json({ error: "Failed to update modification" });
  }
});

export default router;