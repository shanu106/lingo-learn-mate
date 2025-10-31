import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 8080;

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, "dist")));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});
// Health check endpoint for Cloud Run
app.get("/health", (_, res) => {
  res.status(200).json({ status: "healthy" });
});

// Fallback for SPA routes - must be last
// app.get("/.*/", (_, res) => {
//   res.sendFile(path.join(__dirname, "dist", "index.html"));
// });

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
