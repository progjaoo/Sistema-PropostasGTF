import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import stationsRouter from "./stations";
import advertisersRouter from "./advertisers";
import productDurationsRouter from "./product-durations";
import productTemplatesRouter from "./product-templates";
import proposalCategoriesRouter from "./proposal-categories";
import proposalTemplatesRouter from "./proposal-templates";
import proposalTypesRouter from "./proposal-types";
import proposalsRouter from "./proposals";
import recallRemindersRouter from "./recall-reminders";
import dashboardRouter from "./dashboard";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/users", usersRouter);
router.use("/stations", stationsRouter);
router.use("/advertisers", advertisersRouter);
router.use("/product-durations", productDurationsRouter);
router.use("/product-templates", productTemplatesRouter);
router.use("/proposal-categories", proposalCategoriesRouter);
router.use("/proposal-templates", proposalTemplatesRouter);
router.use("/proposal-types", proposalTypesRouter);
router.use("/proposals", proposalsRouter);
router.use("/recall-reminders", recallRemindersRouter);
router.use("/dashboard", dashboardRouter);

export default router;
