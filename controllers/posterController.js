import Poster from "../models/Poster.js";
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

const uploadFromBuffer = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "posters",
        resource_type: "image",
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

export const createPoster = async (req, res, next) => {
  try {
    let imageUrl = "";

    if (req.file) {
      const result = await uploadFromBuffer(req.file.buffer); 
      imageUrl = result.secure_url;
    }

    const newPoster = new Poster({
      ...req.body,
      image: imageUrl || req.body.image,
    });

    const savedPoster = await newPoster.save();
    const populatedPoster = await savedPoster.populate(
      "category subcategory section"
    );

    res.status(200).json({
      message: "Poster created successfully",
      poster: populatedPoster,
      success: true,
    });
  } catch (err) {
    console.error("Error creating poster:", err);
    next(err);
  }
};

// ---------------- GET POSTERS ----------------
export const getPoster = async (req, res, next) => {
  try {
    const posters = await Poster.find().populate(
      "category subcategory section"
    );
    res.status(200).json(posters);
  } catch (err) {
    next(err);
  }
};

// ---------------- UPDATE POSTER  ----------------
export const updatePoster = async (req, res, next) => {
  try {
    console.log("🟡 PUT /poster called for ID:", req.params.id);

    let imageUrl = req.body.image;

    if (req.file) {
      console.log("📤 Uploading new image (from buffer) to Cloudinary...");
      const result = await uploadFromBuffer(req.file.buffer);
      imageUrl = result.secure_url;
    }

    const updateData = {
      title: req.body.title,
      tag: req.body.tag,
      category: req.body.category || null,
      subcategory: req.body.subcategory || null,
      redirectUrl: req.body.redirectUrl,
      isActive: req.body.isActive === "true" || req.body.isActive === true,
      image: imageUrl,
      updatedAt: new Date(),
    };

    console.log("🧾 Mongo UpdateData:", updateData);

    const updatedPoster = await Poster.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("category subcategory section");

    if (!updatedPoster) {
      console.log("⚠️ Poster not found in DB!");
      return res.status(404).json({ message: "Poster not found" });
    }

    console.log("✅ Poster updated successfully:", updatedPoster.title);
    res.status(200).json({
      message: "Poster updated successfully",
     poster: updatedPoster,
      success: true,
    });
  } catch (err) {
    console.error("❌ Error updating poster:", err);
    next(err);
  }
};

// ---------------- DELETE POSTER  ----------------
export const deletePoster = async (req, res, next) => {
  try {
    await Poster.findByIdAndDelete(req.params.id);
    res.status(200).json({
      message: "Poster deleted successfully",
      success: true,
  A });
  } catch (err) {
    next(err);
  }
};