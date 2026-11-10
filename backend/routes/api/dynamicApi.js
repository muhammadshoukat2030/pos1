import express from "express";
import ItemDefinition from "../../models/ItemDefinition.js";
import { isLoggedIn } from "../../middleware/isLoggedIn.js";
import { allowRoles } from "../../middleware/allowRoles.js";

const router = express.Router();

// GET /api/dynamic/all
router.get("/all", isLoggedIn, async (req, res) => {
  try {
    const allDefinitions = await ItemDefinition.find().sort({ brandName: 1 }).lean();
    const brands = allDefinitions.map((d) => d.brandName);
    return res.json({ success: true, allDefinitions, brands });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/dynamic/add-item
router.post("/add-item", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  try {
    const { itemsList = [], brandName, colors = [], units = [] } = req.body;

    if (!brandName || brandName.trim() === "") {
      return res.status(400).json({ success: false, message: "Brand Name is required." });
    }

    const finalBrandName = brandName.trim();
    let brandDoc = await ItemDefinition.findOne({
      brandName: { $regex: new RegExp(`^${finalBrandName}$`, "i") }
    });

    if (!brandDoc) {
      const products = itemsList.map((name) => ({
        itemName: name.trim(),
        hasColors: colors.length > 0,
        colors
      }));
      brandDoc = new ItemDefinition({
        brandName: finalBrandName,
        units: units.length > 0 ? units : ["pcs", "kg", "g", "ltr", "pack", "box", "tin"],
        products
      });
    } else {
      if (units && units.length > 0) {
        brandDoc.units = [...new Set([...brandDoc.units, ...units])];
      }

      itemsList.forEach((itemName) => {
        const cleanItemName = itemName.trim();
        const idx = brandDoc.products.findIndex((p) => p.itemName.toLowerCase() === cleanItemName.toLowerCase());

        if (idx > -1) {
          const oldColors = brandDoc.products[idx].colors || [];
          colors.forEach((newCol) => {
            const exists = oldColors.some((c) => c.colour.toLowerCase() === newCol.colour.toLowerCase());
            if (!exists) oldColors.push(newCol);
          });
          brandDoc.products[idx].colors = oldColors;
          brandDoc.products[idx].hasColors = oldColors.length > 0;
        } else {
          brandDoc.products.push({
            itemName: cleanItemName,
            hasColors: colors.length > 0,
            colors
          });
        }
      });
    }

    await brandDoc.save();
    return res.json({ success: true, message: `Brand "${finalBrandName}" updated successfully!`, brandDoc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/dynamic/delete-brand
router.post("/delete-brand", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  try {
    const { brandId } = req.body;
    const deleted = await ItemDefinition.findByIdAndDelete(brandId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Brand not found." });
    }
    return res.json({ success: true, message: `Brand "${deleted.brandName}" deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/dynamic/delete-product
router.post("/delete-product", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  try {
    const { brandId, productId } = req.body;
    const result = await ItemDefinition.findByIdAndUpdate(
      brandId,
      { $pull: { products: { _id: productId } } },
      { new: true }
    );
    if (!result) {
      return res.status(404).json({ success: false, message: "Item or Brand not found." });
    }
    return res.json({ success: true, message: "Item removed from brand successfully." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/dynamic/delete-color
router.post("/delete-color", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  try {
    const { brandId, productId, colorId } = req.body;
    const result = await ItemDefinition.findOneAndUpdate(
      { _id: brandId, "products._id": productId },
      { $pull: { "products.$.colors": { _id: colorId } } },
      { new: true }
    );
    if (!result) {
      return res.status(404).json({ success: false, message: "Color not found." });
    }
    return res.json({ success: true, message: "Color removed successfully." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
