

import { error } from '@sveltejs/kit';

export async function load({ cookies, fetch }) {
    let standard = {
        date : new Date('2023-12-19T00:00:00'),
        number : 627
    }
    let today_number;
    const differenceInMilliseconds = new Date().getTime() - standard.date.getTime();
    const differenceInDays = differenceInMilliseconds / (1000 * 60 * 60 * 24);
    console.log(Math.floor(differenceInDays));
    const day_difference = Math.floor(differenceInDays);
    today_number = standard.number+day_difference;
    const today_similarity = await fetch(`https://semantle-ko.newsjel.ly/similarity/${today_number}`)
    .then((res)=>{
        return res.json()
    })
    .then((json)=>{
        
        console.log("🚀 ~ file: +page.server.js:23 ~ .then ~ json:", json)
        return json;
    })
    return {
        today_number : today_number,
        today_similarity : today_similarity
    }
    // const loginCookie = cookies.get("session");
    // let loginValid;
    // let login_valid;
    // if(loginCookie){
    //     login_valid = await fetch(`https://ourgarden.holymason.me/validate_session`,{
    //         method : "post",
    //         headers: {'Content-Type': 'application/json'},
    //         body : JSON.stringify({
    //             session : loginCookie
    //         })
    //     })
    //     .then((res)=>{
    //         return res.json()
    //     })
    //     .then((json)=>{
    //         if(json.success){
    //             loginValid = true;
    //         } else {
    //             loginValid = false;
    //         }
    //     })
    // } else {
    //     loginValid = false;
    // }
    
	// return {
    //     login_valid : login_valid
	// };
}