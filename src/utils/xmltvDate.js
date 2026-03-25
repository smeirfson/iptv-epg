function parseXmltvDate(xmltvDate) {
    if (!xmltvDate || typeof xmltvDate !== "string") {
        return null;
    }

    const match = xmltvDate.match(
        /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+\-]\d{4})?$/
    );

    if (!match) {
        return null;
    }

    const [, year, month, day, hour, minute, second, offset] = match;

    let timezone = "Z";

    if (offset) {
        timezone = `${offset.slice(0, 3)}:${offset.slice(3, 5)}`;
    }

    const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}${timezone}`;
    const date = new Date(isoString);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function isWithinNextHours(date, hours) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return false;
    }

    const now = Date.now();
    const upperBound = now + hours * 60 * 60 * 1000;

    return date.getTime() >= now && date.getTime() <= upperBound;
}

module.exports = {
    parseXmltvDate,
    isWithinNextHours,
};