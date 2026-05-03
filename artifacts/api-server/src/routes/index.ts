import { Router, type IRouter } from "express";
import healthRouter from "./health";
import propertiesRouter from "./properties";
import unitsRouter from "./units";
import contractsRouter from "./contracts";
import invoicesRouter from "./invoices";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(healthRouter);

router.use(requireAuth);

router.use(propertiesRouter);
router.use(unitsRouter);
router.use(contractsRouter);
router.use(invoicesRouter);

export default router;
