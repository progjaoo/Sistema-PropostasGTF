import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";
import { securityConfig } from "./config/security";
import {
  apiSecurityHeaders,
  corsOptions,
  globalApiRateLimit,
  requireTrustedWebOrigin,
} from "./middlewares/request-security";
import {
  errorHandler,
  normalizeErrorResponses,
  notFoundHandler,
  requireJsonContentType,
} from "./middlewares/error-handler";

const app: Express = express();
app.disable("x-powered-by");
app.set("trust proxy", securityConfig.trustProxy);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  frameguard: { action: "deny" },
  referrerPolicy: { policy: "no-referrer" },
}));
app.use(cors(corsOptions));
app.use(apiSecurityHeaders);
app.use(normalizeErrorResponses);
app.use(requireTrustedWebOrigin);
app.use(globalApiRateLimit);
app.use(requireJsonContentType);
app.use("/api/profile", express.json({ limit: "3mb" }));
app.use("/api/stations", express.json({ limit: "3mb" }));
app.use("/api/advertisers", express.json({ limit: "3mb" }));
app.use("/api/proposals", express.json({ limit: "3mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use("/api", router);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
