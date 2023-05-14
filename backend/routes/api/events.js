const express = require("express");
const router = express.Router();

const { Event, Group, Venue, Attendance, EventImage } = require("../../db/models");

//#region               GET requests
router.get("/", async (req, res) => {
  const options = {};
  const { events, attendingCounts } = await getEventsInfo(options);
  addCountsToEvents(events, attendingCounts);
  extractEventPreviewImages(events);
  return res.json({ "Events": events });
})
//#endregion

function addCountsToEvents(events, counts) {
  for (let i in events) events.numAttending = counts[i];
}

async function countAttending(event) {
  return await Attendance.count({
    where: { "eventId": event.id, "status": "attending" }
  })
}

function extractEventPreviewImages(events) {
  for (let event of events) {
    event.previewImage = event["EventImages"][0]?.url || null;
    delete event["EventImages"];
  }
}

async function getEventsInfo(options) {
  const events = await Event.findAll({
    include: [
      { model: EventImage, attributes: ["url"], where: { "preview": true }, limit: 1, required: false },
      { model: Group, attributes: ["id", "name", "city", "state"] },
      { model: Venue, attributes: ["id", "city", "state"] }
    ]
  });
  const attendingCounts = await Promise.all(
    events.map(async (event) => await countAttending(event))
  );
  return { "events": events.map((event) => event.toJSON()), attendingCounts };
}

module.exports = router;