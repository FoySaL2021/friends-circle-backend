const express = require("express");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 10000;

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(cors());

app.use(express.json());


// --------------------------------------------------
// Cloudinary Configuration
// --------------------------------------------------

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


// --------------------------------------------------
// Multer Configuration
// --------------------------------------------------

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 10 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        if (!file.mimetype.startsWith("image/")) {
            return cb(
                new Error("Only image files are allowed.")
            );
        }

        cb(null, true);
    }
});


// --------------------------------------------------
// Health Check
// --------------------------------------------------

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "Friends Circle Backend is running",
        status: "OK"
    });
});


// --------------------------------------------------
// Image Upload
// --------------------------------------------------

app.post(
    "/api/upload-image",
    upload.single("image"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({
                    success: false,
                    message: "No image received."
                });
            }


            const folder =
                req.body.folder || "friends-circle";


            const publicId =
                req.body.publicId ||
                `image_${Date.now()}`;


            const result =
                await new Promise(
                    (resolve, reject) => {

                        const stream =
                            cloudinary.uploader.upload_stream(
                                {
                                    folder: folder,
                                    public_id: publicId,
                                    resource_type: "image"
                                },

                                (error, result) => {

                                    if (error) {
                                        reject(error);
                                    } else {
                                        resolve(result);
                                    }
                                }
                            );

                        stream.end(req.file.buffer);
                    }
                );


            return res.status(200).json({

                success: true,

                message: "Image uploaded successfully.",

                imageUrl: result.secure_url,

                publicId: result.public_id,

                width: result.width,

                height: result.height,

                format: result.format
            });

        } catch (error) {

            console.error(
                "Image upload error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Image upload failed."
            });
        }
    }
);


// --------------------------------------------------
// Delete Image
// --------------------------------------------------

app.delete(
    "/api/delete-image",
    async (req, res) => {

        try {

            const publicId =
                req.body.publicId;


            if (!publicId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "publicId is required."
                });
            }


            const result =
                await cloudinary.uploader.destroy(
                    publicId,
                    {
                        resource_type: "image"
                    }
                );


            return res.status(200).json({

                success: true,

                result: result.result
            });

        } catch (error) {

            console.error(
                "Delete image error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Image deletion failed."
            });
        }
    }
);


// --------------------------------------------------
// Error Handler
// --------------------------------------------------

app.use(
    (error, req, res, next) => {

        console.error(error);

        if (
            error instanceof multer.MulterError
        ) {

            return res.status(400).json({

                success: false,

                message:
                    error.message
            });
        }


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Server error."
        });
    }
);


// --------------------------------------------------
// Start Server
// --------------------------------------------------

app.listen(PORT, () => {

    console.log(
        `Friends Circle Backend running on port ${PORT}`
    );
});
