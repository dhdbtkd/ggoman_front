export async function GET({ url, fetch, params, cookies }) {
    const guess = url.searchParams.get('guess');
    const fetch_url = `https://semantle-ko.newsjel.ly/guess/627/${guess}`;
    console.log("🚀 ~ file: +server.js:5 ~ GET ~ fetch_url:", fetch_url)
    const response = await fetch(fetch_url)
    .then((response)=>{
        return response
    })
    return response;
}