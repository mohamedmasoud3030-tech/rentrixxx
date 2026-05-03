import { Router, type IRouter } from "express";
import healthRouter from "./health";
import propertiesRouter from "./properties";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(healthRouter);

router.use(requireAuth);

router.use(propertiesRouter);

export default router;
