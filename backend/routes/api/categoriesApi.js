import express from "express";
import Category from "../../models/Category.js";
import Product from "../../models/Product.js";
import { isLoggedIn } from "../../middleware/isLoggedIn.js";
import { allowRoles } from "../../middleware/allowRoles.js";

const router = express.Router();

function escapeRegExp(string) {
  if (!string) return "";
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/categories - List all categories with product count
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search && search.trim() !== "") {
      const regex = new RegExp(escapeRegExp(search.trim()), "i");
      query.$or = [{ name: regex }, { description: regex }];
    }

    const categories = await Category.find(query).sort({ name: 1 }).lean();

    // Attach real-time product count to each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (c) => {
        const productCount = await Product.countDocuments({
          $or: [
            { category: c.name },
            { category: new RegExp(`^${escapeRegExp(c.name)}$`, "i") }
          ]
        });
        return {
          ...c,
          productCount
        };
      })
    );

    return res.json({ success: true, categories: categoriesWithCount });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/categories - Create a new category
router.post("/", isLoggedIn, allowRoles("admin", "manager", "inventory"), async (req, res) => {
  try {
    const { name, description = "", color = "#0d9488", icon = "ShoppingBag", image = "" } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ success: false, message: "Category name is required." });
    }

    const trimmedName = name.trim();

    // Prevent duplicate category name (case-insensitive)
    const existing = await Category.findOne({
      name: new RegExp(`^${escapeRegExp(trimmedName)}$`, "i")
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `Category '${trimmedName}' already exists.` });
    }

    const category = await Category.create({
      name: trimmedName,
      description: description.trim(),
      color: color.trim(),
      icon: icon.trim(),
      image: image.trim()
    });

    return res.status(201).json({
      success: true,
      message: `Category '${category.name}' created successfully!`,
      category: { ...category.toObject(), productCount: 0 }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/categories/:id - Update category
router.put("/:id", isLoggedIn, allowRoles("admin", "manager", "inventory"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, icon, image, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }

    const oldName = category.name;
    let newName = oldName;

    if (name && name.trim() !== "") {
      newName = name.trim();
      if (newName.toLowerCase() !== oldName.toLowerCase()) {
        const dup = await Category.findOne({
          _id: { $ne: id },
          name: new RegExp(`^${escapeRegExp(newName)}$`, "i")
        });
        if (dup) {
          return res.status(400).json({ success: false, message: `Category '${newName}' already exists.` });
        }
      }
      category.name = newName;
    }

    if (description !== undefined) category.description = description.trim();
    if (color !== undefined) category.color = color.trim();
    if (icon !== undefined) category.icon = icon.trim();
    if (image !== undefined) category.image = image.trim();
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    await category.save();

    // Cascade update to products if category name changed
    if (oldName !== newName) {
      await Product.updateMany(
        { category: oldName },
        { $set: { category: newName } }
      );
    }

    const count = await Product.countDocuments({ category: category.name });

    return res.json({
      success: true,
      message: "Category updated successfully!",
      category: { ...category.toObject(), productCount: count }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/categories/:id - Safe delete category
router.delete("/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }

    // Safety constraint: Prevent deletion if products are assigned to this category
    const assignedCount = await Product.countDocuments({
      $or: [
        { category: category.name },
        { category: new RegExp(`^${escapeRegExp(category.name)}$`, "i") }
      ]
    });

    if (assignedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category '${category.name}' because ${assignedCount} product(s) are currently assigned to it. Please reassign or delete those products first.`
      });
    }

    await Category.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: `Category '${category.name}' deleted successfully.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
