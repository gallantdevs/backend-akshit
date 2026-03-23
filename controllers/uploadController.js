import { cloudinary } from "../middleware/cloudinaryUpload.js";
import streamifier from "streamifier";

export const uploadImages = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: "No files uploaded." });
  }

 
  const uploadPromises = req.files.map((file) => {
    return new Promise((resolve, reject) => {
      
      
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "ecommerce-products", 
        },
        (error, result) => {
          if (result) {
           
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
            });
          } else {
           
            reject(error);
          }
        }
      );

      
      streamifier.createReadStream(file.buffer).pipe(stream);
    });
  });

  try {
    
    const results = await Promise.all(uploadPromises);
    
    res.status(201).json({
      success: true,
      message: "Files uploaded successfully",
      files: results, 
    });

  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({ success: false, message: error.message || "Upload failed" });
  }
};