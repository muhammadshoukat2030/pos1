import express from "express";
import Agent from "../../models/Agent.js";
import Item from "../../models/Item.js";
import { isLoggedIn } from "../../middleware/isLoggedIn.js";
import { allowRoles } from "../../middleware/allowRoles.js";

const router = express.Router();

// GET /api/agents (List all agents + commission stats)
router.get("/", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  try {
    const agents = await Agent.find().populate("items").sort({ createdAt: -1 }).lean();

    let totalCommission = 0;
    let totalPaid = 0;

    agents.forEach((agent) => {
      let agentCommission = 0;
      let agentPaid = 0;
      (agent.items || []).forEach((item) => {
        const c = Number(item.percentageAmount || 0);
        const p = Number(item.paidAmount || 0);
        agentCommission += c;
        agentPaid += p;
        totalCommission += c;
        totalPaid += p;
      });
      agent.totalCommission = Math.round(agentCommission);
      agent.totalPaid = Math.round(agentPaid);
      agent.balanceDue = Math.round(agentCommission - agentPaid);
    });

    return res.json({
      success: true,
      agents,
      stats: {
        totalAgents: agents.length,
        totalCommission: Math.round(totalCommission),
        totalPaid: Math.round(totalPaid),
        totalPayable: Math.round(totalCommission - totalPaid)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/agents (Create Agent)
router.post("/", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  try {
    const { name, phone, cnic } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: "Agent Name and Phone are required." });
    }

    const exists = await Agent.findOne({ phone: phone.trim() });
    if (exists) {
      return res.status(400).json({ success: false, message: "An agent with this phone number already exists." });
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const agentID = "AG" + randomNum;

    const newAgent = await Agent.create({
      agentID,
      name: name.trim(),
      phone: phone.trim(),
      cnic: cnic ? cnic.trim() : ""
    });

    return res.status(201).json({
      success: true,
      message: `Agent ${newAgent.name} (ID: ${agentID}) registered successfully!`,
      agent: newAgent
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/agents/:id (View Agent with commission items)
router.get("/:id", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id)
      .populate({
        path: "items",
        options: { sort: { createdAt: -1 } },
        populate: {
          path: "billId",
          select: "billID customerName grandTotal createdAt"
        }
      })
      .lean();

    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found." });
    }

    let totalCommission = 0;
    let totalPaid = 0;
    (agent.items || []).forEach((item) => {
      totalCommission += Number(item.percentageAmount || 0);
      totalPaid += Number(item.paidAmount || 0);
    });

    agent.totalCommission = Math.round(totalCommission);
    agent.totalPaid = Math.round(totalPaid);
    agent.balanceDue = Math.round(totalCommission - totalPaid);

    return res.json({ success: true, agent });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/agents/pay-item/:id (Pay commission)
router.post("/pay-item/:id", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Commission item not found." });
    }

    const payAmount = Number(req.body.amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid payment amount required." });
    }

    if (item.paidAmount + payAmount > item.percentageAmount) {
      return res.status(400).json({ success: false, message: "Payment exceeds remaining commission amount." });
    }

    item.paidAmount += payAmount;
    if (item.paidAmount >= item.percentageAmount) {
      item.paidStatus = "Paid";
    } else if (item.paidAmount > 0) {
      item.paidStatus = "Partial";
    } else {
      item.paidStatus = "Unpaid";
    }

    await item.save();

    return res.json({
      success: true,
      message: `Commission payment of PKR ${payAmount} recorded successfully!`,
      item
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/agents/:id (Delete Agent)
router.delete("/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
  try {
    const deleted = await Agent.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Agent not found." });
    }
    return res.json({ success: true, message: `Agent '${deleted.name}' deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
