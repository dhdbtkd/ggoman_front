export async function GET({ url, fetch, params, cookies }) {
    const guess = url.searchParams.get('guess');
    const number = url.searchParams.get('number');
    const fetch_url = `https://semantle-ko.newsjel.ly/guess/${number}/${guess}`;
    const response = await fetch(fetch_url)
    .then((response)=>{
        return response
    })
    console.log("🚀 ~ file: +server.js:12 ~ GET ~ response:", response)
    return response;
}
