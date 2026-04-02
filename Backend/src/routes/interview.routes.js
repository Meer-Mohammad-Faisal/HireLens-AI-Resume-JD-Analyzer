const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const interviewController = require("../controllers/interview.controller");
const upload = require("../middlewares/file.middleware");

const interviewRouter = express.Router();

// Make auth optional for now (for testing) - change this in production
const optionalAuth = (req, res, next) => {
    if (!req.cookies?.token) {
        req.user = { id: "guest_user" };
        return next();
    }

    return authMiddleware.authUser(req, res, next);
};

interviewRouter.post(
    "/",
    optionalAuth,
    upload.single("resume"),
    interviewController.generateInterviewReportController
);

interviewRouter.get(
    "/report/:interviewId",
    optionalAuth,
    interviewController.getInterviewReportByIdController
);

interviewRouter.get(
    "/",
    optionalAuth,
    interviewController.getAllInterviewReportsController
);




interviewRouter.post(
    "/resume/pdf/:interviewReportId",
    authMiddleware.authUser,
    interviewController.generateResumePdfController
);

interviewRouter.get(
    "/resume/pdf/:interviewReportId",
    authMiddleware.authUser,
    interviewController.generateResumePdfController
);


module.exports = interviewRouter;
