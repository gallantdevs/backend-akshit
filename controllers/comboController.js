import ComboOffer from "../models/Combo.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";

import pkg from "cloudinary";
const { v2: cloudinary } = pkg;
import streamifier from "streamifier";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* =========================================================
    HELPER: UPLOAD BUFFER TO CLOUDINARY
   ========================================================= */
const uploadFromBuffer = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "combos", 
        resource_type: "auto", 
      },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

/* =========================================================
   🟢 CREATE COMBO (Modified)
   ========================================================= */
export const createCombo = async (req, res) => {
  try {
    console.log("🟢 Incoming Combo Data:", req.body);

    if (req.file) {
      console.log("📤 Uploading thumbnail image...");
      const result = await uploadFromBuffer(req.file.buffer);
      req.body.thumbnailImage = result.secure_url; 
    }

    if (req.body.section === "") req.body.section = null;

   
    const { name, slug, comboPrice, products } = req.body;
    if (!name || !slug || !comboPrice || !products || products.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }


    const combo = new ComboOffer(req.body);
    const savedCombo = await combo.save();

    await Product.updateMany(
      { _id: { $in: products } },
      { $addToSet: { tags: savedCombo.slug } }
    );

    res.status(201).json({
      success: true,
      message: "Combo created successfully",
      combo: savedCombo,
    });
  } catch (err) {
    console.error("❌ Combo creation error:", err);
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "Duplicate slug. Try a unique one." });
    }
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

/* =========================================================
   🔵 GET ALL COMBOS (No Change)
   ========================================================= */
export const getCombos = async (req, res) => {
  try {
    const combos = await ComboOffer.find()
      .populate("products", "title price variants")
      .populate("section", "name identifier");
    res.status(200).json(combos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =========================================================
   🔵 GET COMBO BY SLUG (No Change)
   ========================================================= */
export const getComboBySlug = async (req, res) => {
  try {
    const combo = await ComboOffer.findOne({ slug: req.params.slug }).populate(
      "products",
      "title price variants"
    );
    if (!combo) return res.status(404).json({ message: "Combo not found" });
    res.status(200).json(combo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =========================================================
✏️ UPDATE COMBO (Modified)
========================================================= */
export const updateCombo = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.file) {
      console.log("📤 Uploading new thumbnail image...");
      const result = await uploadFromBuffer(req.file.buffer);
      req.body.thumbnailImage = result.secure_url; // URL को req.body में जोड़ें
    }

    if (req.body.section === "") {
      req.body.section = null;
    }
    
    const updatedCombo = await ComboOffer.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true, 
    });
    

    if (!updatedCombo)
      return res.status(404).json({ message: "Combo not found" });

    if (req.body.products) {
      await Product.updateMany(
        { tags: updatedCombo.slug },
        { $pull: { tags: updatedCombo.slug } }
      );

      await Product.updateMany(
        { _id: { $in: req.body.products } },
        { $addToSet: { tags: updatedCombo.slug } }
      );
    }

    res.status(200).json({
      success: true,
      message: "Combo updated successfully",
      combo: updatedCombo,
    });
  } catch (err) {
    console.error("❌ Combo update error:", err);
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "Duplicate slug. Try a unique one." });
    }
    if (err.name === "ValidationError" || err.name === "CastError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

/* =========================================================
   ❌ DELETE COMBO (No Change)
   ========================================================= */
export const deleteCombo = async (req, res) => {
  try {
    const { id } = req.params;
    const combo = await ComboOffer.findById(id);

    if (!combo) return res.status(404).json({ message: "Combo not found" });

    await Product.updateMany(
      { _id: { $in: combo.products } },
      { $pull: { tags: combo.slug } }
    );

    await combo.deleteOne();

    res.status(200).json({
      success: true,
      message: "Combo deleted successfully and tags removed from products",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};