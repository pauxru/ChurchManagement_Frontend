import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const galleryDir = path.join(process.cwd(), "public/gallery"); // Path to the images
        const files = fs.readdirSync(galleryDir); // Read the folder contents

        const imageUrls = files.map((file) => `/gallery/${file}`); // Generate image URLs
        res.status(200).json({ images: imageUrls });
    } catch (error) {
        res.status(500).json({ error: "Failed to load images" });
    }
}
