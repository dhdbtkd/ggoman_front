

import { error } from '@sveltejs/kit';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

export async function load({ cookies, fetch }) {
    dayjs.extend(utc);
    dayjs.extend(timezone);
    dayjs.extend(utc);
    dayjs.extend(timezone);
    dayjs.tz.setDefault('Asia/Seoul');
    let standard = {
        date: dayjs.tz('2023-12-19T00:00:00'),
        number: 627
    }
    const standard_day = dayjs.tz(standard.date);
    console.log("🚀 ~ file: +page.server.js:19 ~ load ~ standard_day:", standard_day.format("YYYY.MM.DD HH:mm"))
    const now = dayjs.tz();
    console.log("🚀 ~ file: +page.server.js:21 ~ load ~ now:", now.format("YYYY.MM.DD HH:mm:ss"))
    const diff = now.diff(standard_day, "day");
    console.log("🚀 ~ file: +page.server.js:23 ~ load ~ diff:", diff)
    let today_number = standard.number + diff;

    console.log("🚀 ~ file: +page.server.js:16 ~ load ~ today_number:", today_number)
    const today_similarity = await fetch(`https://semantle-ko.newsjel.ly/today`)
        .then((res) => {
            return res.json()
        })
        .then((json) => {

            console.log("🚀 ~ file: +page.server.js:23 ~ .then ~ json:", json)
            return json;
        })
    return {
        today_number: today_number,
        today_similarity: today_similarity
    }

}