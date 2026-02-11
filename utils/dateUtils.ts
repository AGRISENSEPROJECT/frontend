export const formatDate = (date: Date) => {
    if (!(date instanceof Date)) {
        throw new Error("Invalid date object passed to formatDate.");
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return {
        dayName: days[date.getDay()],
        dayNumber: date.getDate(),
        month: months[date.getMonth()],
        fullDate: `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`
    };
};

export default null;
