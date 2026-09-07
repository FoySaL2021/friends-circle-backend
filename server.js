const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;

// ======================================================
// BASIC MIDDLEWARE
// ======================================================

app.use(cors());

app.use(express.json({
    limit: "2mb"
}));

app.use(express.urlencoded({
    extended: true,
    limit: "2mb"
}));

// ======================================================
// UPLOAD DIRECTORY
// ======================================================

const uploadDirectory = path.join(
    __dirname,
    "uploads"
);

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true
    });
}

// ======================================================
// MULTER CONFIGURATION
// ======================================================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, uploadDirectory);
    },

    filename: function (req, file, cb) {

        const extension =
            path.extname(file.originalname)
                .toLowerCase();

        const safeName =
            `image_${Date.now()}_${Math.random()
                .toString(36)
                .substring(2, 10)}${extension}`;

        cb(null, safeName);
    }
});

const upload = multer({

    storage: storage,

    limits: {
        fileSize: 10 * 1024 * 1024
    },

    fileFilter: function (req, file, cb) {

        if (!file.mimetype) {
            return cb(
                new Error("Invalid image type.")
            );
        }

        if (!file.mimetype.startsWith("image/")) {
            return cb(
                new Error(
                    "Only image files are allowed."
                )
            );
        }

        cb(null, true);
    }
});

// ======================================================
// STATIC IMAGE ACCESS
// ======================================================

app.use(
    "/uploads",
    express.static(uploadDirectory)
);

// ======================================================
// ROOT
// ======================================================

app.get("/", function (req, res) {

    res.status(200).json({
        success: true,
        message:
            "Friends Circle Backend is running",
        status: "OK"
    });
});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/health", function (req, res) {

    res.status(200).json({
        success: true,
        server: "OK",
        storage: "Render local filesystem",
        uploadDirectory: "/uploads"
    });
});

// ======================================================
// UPLOAD IMAGE
// ======================================================

app.post(
    "/api/upload-image",
    upload.single("image"),
    function (req, res) {

        try {

            if (!req.file) {

                return res.status(400).json({
                    success: false,
                    message:
                        "No image received."
                });
            }

            const imageUrl =
                `${req.protocol}://${req.get("host")}` +
                `/uploads/${req.file.filename}`;

            console.log(
                "Image uploaded:",
                req.file.filename
            );

            return res.status(200).json({

                success: true,

                message:
                    "Image uploaded successfully.",

                imageUrl: imageUrl,

                publicId:
                    req.file.filename,

                width: null,

                height: null,

                format:
                    path.extname(
                        req.file.filename
                    )
                    .replace(".", "")
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

// ======================================================
// DELETE IMAGE
// ======================================================

app.delete(
    "/api/delete-image",
    function (req, res) {

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

            // Prevent path traversal
            const safeFileName =
                path.basename(publicId);

            const filePath =
                path.join(
                    uploadDirectory,
                    safeFileName
                );

            if (!fs.existsSync(filePath)) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Image not found."
                });
            }

            fs.unlinkSync(filePath);

            console.log(
                "Image deleted:",
                safeFileName
            );

            return res.status(200).json({

                success: true,

                message:
                    "Image deleted successfully.",

                result: "deleted"
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

// ======================================================
// 404 HANDLER
// ======================================================

app.use(function (req, res) {

    return res.status(404).json({

        success: false,

        message:
            "Endpoint not found.",

        path: req.originalUrl
    });
});

// ======================================================
// ERROR HANDLER
// ======================================================

app.use(
    function (error, req, res, next) {

        console.error(
            "Server error:",
            error
        );

        if (
            error instanceof multer.MulterError
        ) {

            return res.status(400).json({

                success: false,

                message:
                    error.message ||
                    "Upload error."
            });
        }

        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Internal server error."
        });
    }
);

// ======================================================
// START SERVER
// ======================================================

app.listen(
    PORT,
    "0.0.0.0",
    function () {

        console.log(
            `Friends Circle Backend running on port ${PORT}`
        );

        console.log(
            `Upload directory: ${uploadDirectory}`
        );
    }
);
