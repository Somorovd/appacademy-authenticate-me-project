const express = require("express");
const router = express.Router();

const { Event, EventImage, Attendance, Group, User, Venue } = require("../../db/models");
const { buildMissingResourceError } = require("../../utils/helpers");
const { requireAuth, buildAuthorzationErrorResponce } = require("../../utils/auth");
const { Op } = require("sequelize");
const { check } = require("express-validator");
const { handleInputValidationErrors, buildValidationErrorResponce } = require("../../utils/validation");

//#region 							Express Middleware
const validateAttendanceRequestInput = [
	check("userId").exists({ checkFalsy: true })
		.withMessage("User Id is required"),
	check("status").exists({ checkFalsy: true }).isIn(["waitlist", "attending"])
		.withMessage("Status must be 'waitlist' or 'attending'"),
	handleInputValidationErrors
]

const validateEventQueryParameters = (req, res, next) => {
	let { page, size, name, type, startDate } = req.query;
	const errors = [];
	if (page && (isNaN(page) || page <= 0))
		errors.push({ path: "page", message: "Page must be greater than or equal to 1" })
	if (size && (isNaN(size) || size <= 0))
		errors.push({ path: "size", message: "Size must be greater than or equal to 1" })
	if (name && (!isNaN(name) || typeof name !== "string"))
		errors.push({ path: "name", message: "Name must be a string" });
	if (type && (type !== "In Person" && type !== "Online"))
		errors.push({ path: "type", message: "Type must be either 'In Person' or 'Online'" });
	if (startDate && (isNaN(new Date(startDate).getTime())))
		errors.push({ path: "startDate", message: "Start Date must be a valid date" });

	if (errors.length)
		return buildValidationErrorResponce(next, errors);
	else return next();
}

const handleEventQueryParameters = (req, res, next) => {
	let { page, size, name, type, startDate } = req.query;

	const where = {};
	if (name) where.name = name;
	if (type) where.type = type;
	if (startDate) where.startDate = startDate;

	page = Number(page || 1);
	size = Number(size || 20)
	const pagination = {
		limit: size,
		offset: (page - 1) * size
	};

	req.query.page = page;
	req.query.size = size;
	req.query.where = where;
	req.query.pagination = pagination;
	return next();
}
//#endregion

//#region               GET requests
router.get("/",
	validateEventQueryParameters,
	handleEventQueryParameters,
	async (req, res, next) => {
		const { page, size, where, pagination } = req.query;
		const options = { query: { where, pagination } }
		const events = await getEventsInfo(options);
		return res.json({ "Events": events, page, size });
	}
);

router.get("/:eventId",
	async (req, res, next) => {
		const options = { eventIds: req.params.eventId, details: true };
		const event = (await getEventsInfo(options))[0];

		if (!event)
			buildMissingResourceError(next, "Event");

		return res.json(event);
	}
);

router.get("/:eventId/attendees",
	async (req, res, next) => {
		const eventId = req.params.eventId;
		const userId = req.user.id;

		const event = await Event.findByPk(eventId, {
			attributes: ["id"],
			include: {
				model: Group.scope([
					{ method: ["includeAuthorization", userId] }
				])
			}
		});

		if (!event)
			return buildMissingResourceError(next, "Event");

		const group = event["Group"];
		const isHost = (
			group.organizerId == userId || group["Members"][0]
		);
		const where = (isHost) ? {} : { "status": { [Op.ne]: "pending" } };

		const attendees = await User.findAll({
			attributes: ["id", "firstName", "lastName"],
			include: {
				model: Event, attributes: ["id"],
				through: { attributes: ["status"], where: where },
				where: { "id": eventId },
			}
		});

		for (let attendee of attendees) {
			const attendeeData = attendee.dataValues;
			attendeeData["Attendance"] = attendeeData["Events"][0]["Attendance"];
			delete attendeeData["Events"];
		}

		return res.json({ "Attendees": attendees });
	}
);
//#endregion

//#region 							POST requests
router.post("/:eventId/images",
	requireAuth,
	async (req, res, next) => {
		const eventId = req.params.eventId;
		const userId = req.user.id;
		const { url, preview } = req.body;

		const event = await Event
			.scope([
				"minimal",
				{ method: ["includeAuthorization", userId] }
			])
			.findByPk(eventId, {
				include: [
					{
						model: User, attributes: ["id"],
						through: {
							attributes: ["status"],
							where: { "userId": userId, "status": "attending" }
						}
					}
				],
				required: false,
				where: { "id": userId }
			});

		// return res.json(event);

		if (!event)
			return buildMissingResourceError(next, "Event");

		const group = event["Group"];
		const isNotAuthorized = (
			group.organizerId != userId &&
			!group["Members"][0] &&
			!event["Users"][0]
		);
		if (isNotAuthorized)
			return buildAuthorzationErrorResponce(next);

		const image = await EventImage.create(
			{ eventId, url, preview }
		);
		event.addEventImage(image);

		return res.json({
			id: image.id,
			url: image.url,
			preview: image.preview
		});
	}
);

router.post("/:eventId/attendance",
	requireAuth,
	async (req, res, next) => {
		const eventId = req.params.eventId;
		const userId = req.user.id; 

		const event = await Event.findByPk(eventId, {
			attributes: ["id"],
			include: [
				{
					model: Group, attributes: ["id"],
					include: {
						model: User, as: "Members",
						attributes: ["id"],
						through: {
							attributes: ["status"],
							where: { "status": { [Op.ne]: "pending" } }
						},
						required: false,
						where: { "id": userId }
					}
				},
				{
					model: User, attributes: ["id"],
					through: { attributes: ["status"] },
					where: { "id": userId },
					required: false
				}
			]
		});

		if (!event)
			return buildMissingResourceError(next, "Event");

		const member = event["Group"]["Members"][0];

		if (!member)
			return buildAuthorzationErrorResponce(next);

		const user = event["Users"][0];
		if (user) {
			const status = user["Attendance"].status;
			if (status == "pending") {
				const err = new Error("Attendance has already been requested");
				err.title = "Bad Request";
				err.status = 400;
				return next(err);
			} else {
				const err = new Error("User is already attending this event");
				err.title = "Bad Request";
				err.status = 400;
				return next(err);
			}
		}

		const attendance = await Attendance.create(
			{ userId, eventId, status: "pending" }
		);

		return res.json(attendance);
	}
);
//#endregion

//#region 							PUT requests
router.put("/:eventId",
	requireAuth,
	async (req, res, next) => {
		const { venueId, name, type, capacity, price, description, startDate, endDate } = req.body;
		const eventId = req.params.eventId;
		const userId = req.user.id;

		const event = await Event.findByPk(eventId, {
			include: {
				model: Group, attributes: ["organizerId"],
				include: {
					model: User, as: "Members",
					attributes: ["id"],
					through: {
						attributes: ["status"],
						where: { "status": "co-host" }
					},
					required: false,
					where: { "id": userId }
				}
			}
		});

		if (!event)
			return buildMissingResourceError(next, "Event");

		const group = event["Group"];
		const isNotAuthorized = (
			group.organizerId != userId && !group["Members"][0]
		);
		if (isNotAuthorized)
			return buildAuthorzationErrorResponce(next);

		if (venueId) {
			const venue = await Venue.findByPk(venueId);
			if (!venue)
				return buildMissingResourceError(next, "Venue");
		}

		event.set({
			venueId, name, type, capacity,
			price, description, startDate, endDate
		});

		await event.save();

		delete event.dataValues["Group"];
		return res.json(event);
	}
);

router.put("/:eventId/attendance",
	requireAuth, validateAttendanceRequestInput,
	async (req, res, next) => {
		const { userId, status } = req.body;
		const eventId = req.params.eventId;

		const event = await Event.findByPk(eventId, {
			attributes: ["id"],
			include: [
				{
					model: Group.scope([
						{ method: ["includeAuthorization", req.user.id] }
					])
				},
				{
					model: User, attributes: ["id"],
					required: false,
					where: { "id": userId }
				}
			]
		});

		if (!event)
			return buildMissingResourceError(next, "Event");

		const group = event["Group"];
		const isNotAuthorized = (
			group.organizerId != req.user.id && !group["Members"][0]
		);
		if (isNotAuthorized)
			return buildAuthorzationErrorResponce(next);

		let attendee = event["Users"][0];
		if (!attendee) {
			attendee = await User.findByPk(userId);
			if (!attendee) {
				const err = new Error("User could not be found");
				err.title = "Validation Error";
				err.status = 400;
				return next(err);
			} else
				return buildMissingResourceError(next, "Attendance");
		}

		const attendance = attendee["Attendance"];
		attendance.set({ status });
		await attendance.save();

		return res.json(attendance);
	}
);
//#endregion

//#region               DELETE requests
router.delete("/:eventId",
	requireAuth,
	async (req, res, next) => {
		const userId = req.user.id;
		const event = await Event.findByPk(req.params.eventId, {
			include: {
				model: Group, attributes: ["organizerId"],
				include: {
					model: User, as: "Members",
					through: {
						attributes: ["status"],
						where: { "status": "co-host", "userId": userId }
					}
				}
			}
		});
		if (!event)
			return buildMissingResourceError(next, "Event");

		const isNotAuthorized = (
			event["Group"].organizerId != userId &&
			!event["Group"]["Members"][0]
		);

		if (isNotAuthorized)
			return buildAuthorzationErrorResponce(next);

		await event.destroy();
		return res.json({ message: "Successfully deleted" });
	}
);

router.delete("/:eventId/attendance",
	requireAuth,
	async (req, res, next) => {
		const userId = req.body.userId;
		const eventId = req.params.eventId;

		const errors = [];
		if (!userId)
			errors.push({ path: "userId", message: "User Id is required" });

		if (errors.length)
			return buildValidationErrorResponce(next, errors);

		const user = await User.findByPk(userId, {
			attributes: ["id"],
			include: [
				{
					model: Event, attributes: ["id"], where: { "id": eventId },
					required: false,
					include: {
						model: Group.scope([
							{ method: ["includeAuthorization", req.user.id] }
						]),
						required: false
					}
				},
			]
		});

		if (!user)
			return buildMissingResourceError(next, "User");

		let event = user["Events"][0];
		if (!event) {
			event = await Event.findByPk(eventId);
			if (!event)
				return buildValidationErrorResponce(
					next, [{ path: "userId", message: "User could not be found" }]
				);
			else
				return buildMissingResourceError(next, "Attendance");
		}

		const { organizerId, Member } = event["Group"];
		const isNotAuthorized = (
			userId != userId &&
			userId != organizerId &&
			!Member[0]
		);
		if (isNotAuthorized)
			return buildAuthorzationErrorResponce(next);

		await event["Attendance"].destroy();
		return res.json({ message: "Successfully deleted" });
	}
);
//#endregion

function addCountsToEvents(events, counts) {
	for (let i in events) events[i].numAttending = counts[i];
}

function assignEventPreviewImages(events) {
	for (let event of events) {
		event.previewImage = event["EventImages"][0]?.url || null;
		delete event["EventImages"];
	}
}

async function countAttending(event) {
	return await Attendance.count({
		where: { "eventId": event.id, "status": "attending" }
	})
}

async function getEventsInfo(options) {
	const { details, groupIds, eventIds, attendees, query } = options;
	const scopes = ["general"];
	if (details) scopes.push("details")
	else scopes.push("getPreviewImage");
	if (groupIds) scopes.push({ method: ["filterByGroups", groupIds] });
	if (eventIds) scopes.push({ method: ["filterByEvents", eventIds] });
	if (attendees !== undefined) scopes.push({ method: ["getAttendees", attendees] });
	if (query) scopes.push({ method: ["useQueryParams", query] })

	const events = await Event.scope(scopes).findAll();

	for (let event of events) {
		const numAttending = await countAttending(event);
		const eventData = event.dataValues;
		eventData.numAttending = numAttending;

		if (!details) {
			eventData.previewImage = eventData["EventImages"][0]?.url || null;
			delete eventData["EventImages"]
		}
	}
	return events;
}

module.exports = {
	router, getEventsInfo
};
