import express from "express";
import jwt from "jsonwebtoken";
import Experiment from "../models/Experiment.js";

const router = express.Router();

router.get("/preview/active", async (req, res) => {
  try {
    const { shop } = req.query;
    if (!shop) {
      return res.status(400).json({ error: "Missing shop" });
    }

    const experiment = await Experiment.findOne({
      shop,
      status: { $in: ["pending", "active"] },
    }).sort({ updatedAt: -1 });

    if (!experiment) {
      return res.status(404).json({ error: "No active experiment" });
    }

    const token = jwt.sign(
      { experimentId: experiment.experimentId },
      process.env.API_SECRET_KEY,
      { expiresIn: "7d" },
    );

    return res.json({
      previewId: experiment.experimentId,
      token,
    });
  } catch (err) {
    console.error("Active preview lookup error:", err.message);
    return res.status(500).json({ error: "Failed to look up active preview" });
  }
});

router.get("/preview/active-list", async (req, res) => {
  try {
    const { shop } = req.query;
    if (!shop) {
      return res.status(400).json({ error: "Missing shop" });
    }

    const experiments = await Experiment.find({
      shop,
      status: "active",
    }).sort({ startedAt: 1 });

    if (!experiments.length) {
      return res.json({ experiments: [] });
    }

    const payload = experiments.map((experiment) => ({
      experimentId: experiment.experimentId,
      status: experiment.status,
      name: experiment.name,
      testGroups: experiment.testGroups,
      modifications: experiment.modifications || [],
      startedAt: experiment.startedAt,
      updatedAt: experiment.updatedAt,
    }));

    return res.json({ experiments: payload });
  } catch (err) {
    console.error("Active list lookup error:", err.message);
    return res
      .status(500)
      .json({ error: "Failed to look up active experiments" });
  }
});

router.get("/preview/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.API_SECRET_KEY);
    } catch (e) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (decoded.experimentId !== id) {
      return res.status(403).json({ error: "Token mismatch" });
    }

    const experiment = await Experiment.findOne({ experimentId: id });
    if (!experiment) {
      return res.status(404).json({ error: "Experiment not found" });
    }

    return res.json({
      experiment: {
        experimentId: experiment.experimentId,
        status: experiment.status,
        toolbarExited: experiment.toolbarExited,
        name: experiment.name,
        testGroups: experiment.testGroups,
        modifications: experiment.modifications || [],
        updatedAt: experiment.updatedAt,
      },
    });
  } catch (err) {
    console.error("Preview fetch error:", err.message);
    return res.status(500).json({ error: "Failed to load preview" });
  }
});

router.put("/preview/:id/modifications", async (req, res) => {
  try {
    const { id } = req.params;
    const { token, modifications } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.API_SECRET_KEY);
    } catch (e) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (decoded.experimentId !== id) {
      return res.status(403).json({ error: "Token mismatch" });
    }

    const updated = await Experiment.findOneAndUpdate(
      { experimentId: id },
      { modifications },
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({ error: "Experiment not found" });
    }

    return res.json({ experiment: updated });
  } catch (err) {
    console.error("Save modifications error:", err.message);
    return res.status(500).json({ error: "Failed to save modifications" });
  }
});

router.put("/preview/:id/toolbar-exit", async (req, res) => {
  try {
    const { id } = req.params;
    const { token, toolbarExited } = req.body;

    const decoded = jwt.verify(token, process.env.API_SECRET_KEY);

    if (decoded.experimentId !== id) {
      return res.status(403).json({ error: "Token mismatch" });
    }

    const experiment = await Experiment.findOneAndUpdate(
      { experimentId: id },
      { toolbarExited },
      { new: true }
    );

    if (!experiment) {
      return res.status(404).json({ error: "Experiment not found" });
    }

    res.json({
      success: true,
      toolbarExited: experiment.toolbarExited,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update toolbar state" });
  }
});

export default router;