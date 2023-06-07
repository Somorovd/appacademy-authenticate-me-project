import { useHistory } from "react-router-dom";
import "./EventCard.css";

const EventCard = ({ event }) => {
  const history = useHistory();

  const onClick = () => {
    history.push(`/events/${event.id}`);
  }

  return (
    <article
      className="event-card"
      onClick={onClick}
    >
      <div className="event-card__image">
        <img src={event.previewImage} />
      </div>
      <header className="event-card__header">
        <p className="event-card__date">
          {event.startDate}
        </p>
        <h2 className="event-card__title">
          {event.name}
        </h2>
        <p className="event-card__location">
          {
            event.type === "In Person"
              ? `${event["Venue"]?.city || "<city missing>"}, ${event["Venue"]?.state || "<state missing>"}`
              : "Online"
          }
        </p>
      </header>
      <p className="event-card__about">
        {/* {event.description} */}
        Nisi quis eleifend quam adipiscing vitae proin. Fames ac turpis egestas
        integer eget aliquet. Diam in arcu cursus euismod quis viverra nibh.
        Enim diam vulputate ut pharetra. Tristique risus nec feugiat in
        fermentum posuere urna nec.
      </p>
    </article>
  )
}

export default EventCard;