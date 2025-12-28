app.use("/ai", require("./routes/ai"));
import healthRoutes from "./routes/health.js";

app.use("/health", healthRoutes);