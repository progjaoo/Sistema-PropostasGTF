import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import stationsRouter from "./stations";
import advertisersRouter from "./advertisers";
import productTemplatesRouter from "./product-templates";
import proposalCategoriesRouter from "./proposal-categories";
import proposalTemplatesRouter from "./proposal-templates";
import proposalsRouter from "./proposals";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/stations", stationsRouter);
router.use("/advertisers", advertisersRouter);
router.use("/product-templates", productTemplatesRouter);
router.use("/proposal-categories", proposalCategoriesRouter);
router.use("/proposal-templates", proposalTemplatesRouter);
router.use("/proposals", proposalsRouter);
router.use("/dashboard", dashboardRouter);

export default router;
