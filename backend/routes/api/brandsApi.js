import express from "express";
import Brand from "../../models/Brand.js";
import Product from "../../models/Product.js";
import { isLoggedIn } from "../../middleware/isLoggedIn.js";
import { allowRoles } from "../../middleware/allowRoles.js";

const router = express.Router();

function escapeRegExp(string) {
  if (!string) return "";
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/brands - List all brands with product usage count
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search && search.trim() !== "") {
      const regex = new RegExp(escapeRegExp(search.trim()), "i");
      query.$or = [{ name: regex }, { description: regex }, { originCountry: regex }];
    }

    const brands = await Brand.find(query).sort({ name: 1 }).lean();

    // Attach real-time product count to each brand
    const brandsWithCount = await Promise.all(
      brands.map(async (b) => {
        const productCount = await Product.countDocuments({
          $or: [
            { brandName: b.name },
            { brandName: new RegExp(`^${escapeRegExp(b.name)}$`, "i") }
          ]
        });
        return {
          ...b,
          productCount
        };
      })
    );

    return res.json({ success: true, brands: brandsWithCount });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/brands - Create a new brand
router.post("/", isLoggedIn, allowRoles("admin", "manager", "inventory"), async (req, res) => {
  try {
    const { name, description = "", originCountry = "Pakistan", logo = "" } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ success: false, message: "Brand name is required." });
    }

    const trimmedName = name.trim();

    // Prevent duplicate brand name (case-insensitive)
    const existing = await Brand.findOne({
      name: new RegExp(`^${escapeRegExp(trimmedName)}$`, "i")
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `Brand '${trimmedName}' already exists.` });
    }

    const brand = await Brand.create({
      name: trimmedName,
      description: description.trim(),
      originCountry: originCountry.trim(),
      logo: logo.trim()
    });

    return res.status(201).json({
      success: true,
      message: `Brand '${brand.name}' created successfully!`,
      brand: { ...brand.toObject(), productCount: 0 }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/brands/:id - Update brand
router.put("/:id", isLoggedIn, allowRoles("admin", "manager", "inventory"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, originCountry, logo, isActive } = req.body;

    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({ success: false, message: "Brand not found." });
    }

    const oldName = brand.name;
    let newName = oldName;

    if (name && name.trim() !== "") {
      newName = name.trim();
      if (newName.toLowerCase() !== oldName.toLowerCase()) {
        const dup = await Brand.findOne({
          _id: { $ne: id },
          name: new RegExp(`^${escapeRegExp(newName)}$`, "i")
        });
        if (dup) {
          return res.status(400).json({ success: false, message: `Brand '${newName}' already exists.` });
        }
      }
      brand.name = newName;
    }

    if (description !== undefined) brand.description = description.trim();
    if (originCountry !== undefined) brand.originCountry = originCountry.trim();
    if (logo !== undefined) brand.logo = logo.trim();
    if (isActive !== undefined) brand.isActive = Boolean(isActive);

    await brand.save();

    // If brand name changed, cascade update to existing products
    if (oldName !== newName) {
      await Product.updateMany(
        { brandName: oldName },
        { $set: { brandName: newName, brand: newName } }
      );
    }

    const count = await Product.countDocuments({ brandName: brand.name });

    return res.json({
      success: true,
      message: "Brand updated successfully!",
      brand: { ...brand.toObject(), productCount: count }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/brands/:id - Safe delete brand
router.delete("/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({ success: false, message: "Brand not found." });
    }

    // Safety constraint: Prevent deletion if products are assigned to this brand
    const assignedCount = await Product.countDocuments({
      $or: [
        { brandName: brand.name },
        { brandName: new RegExp(`^${escapeRegExp(brand.name)}$`, "i") }
      ]
    });

    if (assignedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete brand '${brand.name}' because ${assignedCount} product(s) are currently assigned to it. Please reassign or delete those products first.`
      });
    }

    await Brand.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: `Brand '${brand.name}' deleted successfully.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
