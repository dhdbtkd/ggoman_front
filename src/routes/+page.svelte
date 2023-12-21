<script>
    import { io } from 'socket.io-client'
    import { onMount } from 'svelte';
    import _ from 'lodash';
    import Icon from '@iconify/svelte';
    import {page} from "$app/stores";
    
    export let data;

    
    console.log($page.url);
    console.log($page.url.pathname);
    let step = 0;
    let standard = {
        date : new Date('2023-12-19T00:00:00'),
        number : 627
    }
    let today_number;
    let name;
    let guess;
    let socket;
    let current_guess;
    let last_guess;
    let guess_list = [];
    let name_input;
    let user_list = [];
    let guess_input;
    let waiting = false;
    let invalid_text = false;
    let top_player = {
        socket_id : '',
        name : ''
    }
    $: {
        user_list = [...user_list];
        console.log(user_list);
    }
    const add_user = (user_object) => {
        let find_user = user_list.find((user)=>{
            return user.socket_id == user_object.socket_id
        })
        if(find_user){
            find_user.name = user_object.name;
            return;
        } else {
            find_user = user_list.find((user)=>{
                return user.name == user_object.name
            })
            if(find_user){
                return
            } else {
                user_list.push(user_object)
            }
        }
        
    }
    const get_today_similarity = ()=>{
        
    }
    let is_admin = false;
    const get_today_number = ()=>{
        const differenceInMilliseconds = new Date().getTime() - standard.date.getTime();
        const differenceInDays = differenceInMilliseconds / (1000 * 60 * 60 * 24);
        console.log(Math.floor(differenceInDays));
        const day_difference = Math.floor(differenceInDays);
        today_number = standard.number+day_difference;
        console.log("🚀 ~ file: +page.svelte:67 ~ today_number:", today_number)
    }
    onMount(()=>{
        is_admin = $page.url.searchParams.get('admin')=='true'?true:false;
        name_input.focus(); //닉네임 input에 포커스
        if(data.today_number){
            today_number = data.today_number;
        } else {
            get_today_number();
        }
        setInterval(()=>{
            console.log("i'am alive");
            socket.emit("i_am_alive", name);
        },10000)
        socket = io("wss://port-0-ggoman-back-koh2xlivr60m6.sel4.cloudtype.app",{
            timeout : 50000
        })
        // socket = io("ws://192.168.50.31:3000/",{
        //     timeout : 50000
        // })

        socket.on("connect", () => {
            if (socket.recovered) {
                // any event missed during the disconnection period will be received now
                console.log("this is recovered");
            } else {
                console.log(socket.id); // x8WIv7-mJelg7on_ALbx
                console.log(socket.connected);
                socket.emit("request_history", today_number);

                const localstorage_name = window.localStorage.getItem('name', name);
                if(localstorage_name){ //localstorage에 name이 있는 유저의 경우 rejoin
                    name = localstorage_name;
                    step = 1;
                    const push_item = {
                        socket_id : socket.id,
                        name : name
                    }
                    add_user(push_item);
                    console.log("🚀 ~ file: +page.svelte:104 ~ onMount ~ push_item:", push_item)
                    console.log("localstorage에 name이 존재하므로 rejoin");
                    user_list = [...user_list];
                    socket.emit('rejoin', name);
                }
            }
        });
        //유저 생존 신고 받음
        socket.on("he_is_alive", (user_object)=>{
            console.log("he_is_alive", user_object);
            add_user(user_object);
        })
        socket.on("user_list", (list)=>{
            if(list.length>0){
                user_list = [...user_list, ...list];
            }
        })

        socket.on("user_leave", (user_name)=>{
            console.log("🚀 떠난 친구:", user_name)
            const index = user_list.findIndex((user) => user.name == user_name.user_name);
            if (index !== -1) {
                const removed_user = user_list.splice(index, 1)[0]; // Get the removed element
                console.log(`Removed: ${removed_user.name}`);
                user_list = [...user_list];
            } else {
                console.log(`Element "${user_name}" not found in array.`);
            }
        })
        socket.on("return_history", (arg)=>{
            console.log("return_history",   );
            if(arg.number == today_number){
                guess_list = [...arg.data];
                //중복 객체 제거
                const unique = _.uniqBy(guess_list, "guess");
                //유사도 정렬
                sort_array(unique);
                guess_list = [...unique];
                console.log("🚀 ~ file: +page.svelte:138 ~ socket.on ~ guess_list:", guess_list)
                find_top_player(guess_list, 'sim');
            }
        })
        socket.on("disconnect", () => {
            console.log(socket.connected); // false
        });
        socket.on("hello", (arg) => {
            console.log(arg); // world
        });
        socket.on("new_member",(user_object)=>{
            console.log("새로운 친구 ", user_object);
            add_user(user_object);
            user_list = [...user_list];
        })
        socket.on("user_rejoin",(user_object)=>{
            console.log("🚀돌아온 친구", user_object)
            add_user(user_object);
            user_list = [...user_list];
        })
        socket.on("clear",()=>{
            console.log("clear");
            guess_list = [];
        })
        socket.on("guess_result_from_server",(arg)=>{
            guess_list = [...guess_list, arg];
            sort_array(guess_list);
            console.log("🚀 ~ file: +page.svelte:31 ~ socket.on ~ arg:", arg)
            find_top_player(guess_list, 'sim');
        })
        socket.on("disconnect", (reason) => {
            console.log("🚀 ~ file: +page.svelte:143 ~ disconnect~ reason:", reason)
        });
    })
    const find_top_player = (array, key) => {
        if (array.length === 0) {
            return null; 
        }
        const result =  array.reduce((maxObject, currentObject) => {
            const maxKeyValue = maxObject[key];
            const currentKeyValue = currentObject[key];

            return (currentKeyValue > maxKeyValue) ? currentObject : maxObject;
        });
        top_player.socket_id = result.socket_id;
        top_player.name = result.name;
    }
    const reset_history = ()=>{
        socket.emit('reset_history', true);
    }
    const name_submit=()=>{
        if(!name){
            alert("닉네임 입력 안했잖아")
            return;
        }
        socket.emit('name_submit', name);
        window.localStorage.setItem('name', name);
        const user ={
            socket_id : socket.id,
            name : name
        }
        add_user(user);
        user_list = [...user_list];
        step++;
    }
    const is_duplicate_guess = ()=>{
        const find = guess_list.find((guess2)=>{
            return guess2.guess == guess
        })
        if(find){
            return true;
        } else {
            return false;
        }
    }
    const sort_array = (array)=>{
        array.sort((a, b) => {
            if (a.sim < b.sim) return 1;
            if (a.sim > b.sim) return -1;
            return 0; 
        });
    }
    const submit_guess = async () => {
        if(!guess) return;
        const is_duplicate = is_duplicate_guess();
        if(is_duplicate){
            const find = guess_list.find((guess2)=>{
                return guess2.guess == guess
            })
            current_guess = find;
        } else {
            last_guess = guess;
            waiting = true;
            const url = `/api/guess?guess=${guess}&number=${today_number}`;
            const result = await fetch(url)
            .then((res)=>{
                return res.json()
            })
            .then((json)=>json)
            
            console.log("🚀 ~ file: +page.svelte:149 ~ constsubmit_guess= ~ result:", result)
            waiting = false;
            if(result.guess){
                result.number = today_number;
                result.name = name;
                result.socket_id = socket.id;
                result.count = guess_list.length+1;
                current_guess = result;
                guess_list.push(result);
                guess_list = [...guess_list];
                sort_array(guess_list);
                socket.emit("guess_result_to_server", result);
                invalid_text = false;
                find_top_player(guess_list, "sim");
            } else {
                //에러일 경우->알수없는 단어
                invalid_text = true;
            }
        };
        guess = '';
        guess_input.focus();
    }
    const keydown = (e) => {
        if(e.key === "Enter") {
            if(step == 0){
                name_submit()
            } else {
                submit_guess()
            }
        }
    }
    const reset_name = ()=>{
        step = 0;
        const remove_name = window.localStorage.getItem("name");
        window.localStorage.removeItem("name");
        const index = user_list.findIndex((user) => user.name == remove_name);
        if (index !== -1) {
            const removed_user = user_list.splice(index, 1)[0]; // Get the removed element
            console.log(`Removed: ${removed_user}`);
            user_list = [...user_list];
        } else {
            console.log(`Element "${remove_name}" not found in array.`);
        }
    }
    const guess_text_dynamic_class = (rank)=>{
        let class_text;
        if(rank > 500 && rank <1000){
            class_text = "grid grid-cols-5 gap-2";
        } else if(rank > 250 && rank <501){
            class_text = "grid grid-cols-5 gap-2";
        } else if(rank > 100 && rank <251){
            class_text = "grid grid-cols-5 gap-2";
        } else if(rank > 50 && rank <101){
            class_text = "grid grid-cols-5 gap-2";
        } else if(rank > 10 && rank <51){
            class_text = "grid grid-cols-5 gap-2";
        } else if(rank > 0 && rank <11){
            class_text = "grid grid-cols-5 gap-2";
        } else if(rank == "정답!"){
            class_text = "grid grid-cols-5 gap-2";
        } else {
            class_text = "grid grid-cols-5 gap-2 text-xs text-zinc-400";
        }
        
        return class_text;
    }

</script>
{#if step == 0}
<div class="w-full h-[100dvh] flex flex-col justify-center items-center p-4 bg-zinc-900 text-zinc-100">
    <div class="mb-16 font_test">
        <div class="text-lg">
            웰컴 투
        </div>
        <div class="font-bold text-2xl">
            다함께 꼬맨틀
        </div>
    </div>
    <div>
        닉네임 뭐 할거야
    </div>
    <div class="w-2/3">
        <div class="mb-6">
            <label for="large-input" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">이름</label>
            <input bind:this={name_input} maxlength="8" type="text" on:keydown={keydown} bind:value={name} class="block w-full p-4 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 sm:text-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
        </div>
        <div class="">
            {#if name}
            <button on:click={name_submit} class="bg-zinc-800 text-white rounded-lg w-full py-4"> 입장!🤸 </button>
            {/if}
        </div>
    </div>
</div>

{:else if step == 1}
<div class="w-full h-[100dvh] flex flex-col p-4 bg-zinc-900 text-zinc-200">
    <div class="absolute top-3 left-3 bg-zinc-700 p-2 rounded-lg text-xs flex justify-center items-center" on:click={reset_name}>
        <Icon class="text-lg mr-2" icon="icon-park-outline:return" /> 
        <div>
            닉네임
        </div>
        <div>
            변경
        </div>
    </div>
    {#if is_admin}
    <div class="absolute top-3 right-3 bg-zinc-700 p-2 rounded-lg text-xs flex justify-center items-center" on:click={reset_history}>
        RESET
    </div>
    {/if}
    <div class="flex flex-col justify-center items-center mb-6 mt-5">
        <div class="text-2xl font-bold mb-4">
            다함께 꼬맨틀
        </div>
        <div>
            <div class="text-xs">
                <div class="mb-2">
                    안녕하세요 
                    <span class="font-bold">
                        {name}
                    </span>님
                </div>
                <div>
                    친구들과 {today_number}번째 꼬맨틀의 정답을 맞혀보세요🧐
                </div>
            </div>
        </div>
        
    </div>
    <div class="flex flex-col text-xs">
        <div class="mb-2">
            접속중인 친구
        </div>
        <div class="flex flex-wrap">
            {#each user_list as user,index(index)}
            <!-- {@debug user_list} -->
            {#if user.socket_id == socket.id}
            <div class="flex items-center justify-center rounded-full text-xs px-3 py-1 mx-1 bg-zinc-500 my-1" class:crowned-text={top_player.socket_id == user.socket_id || top_player.name == user.name}>
                it's me {user.name}
            </div>
            
            {:else}
            <div class="flex items-center justify-center rounded-full text-xs px-3 py-1 mx-1 bg-zinc-700 my-1" class:crowned-text={top_player.socket_id == user.socket_id || top_player.name == user.name}>
                {user.name}
            </div>

            {/if}
            {/each}
        </div>
    </div>
    <div class="my-3">
        {#if invalid_text}
            <div class="font-bold text-rose-500 my-2 text-sm">
                '{last_guess}'는 알 수 없는 단어래😒
            </div>
        {/if}
        <input placeholder="단어를 입력하세요." bind:this={guess_input} type="text" on:keydown={keydown} bind:value={guess} class="block w-full p-3 border bg-zinc-800 border-zinc-600 text-sm rounded-lg =">
    </div>
    <div class="mb-6">
        <button on:click={submit_guess} class={waiting?"flex justify-center items-center bg-zinc-800 text-zinc-300 rounded-lg w-full py-3":"flex justify-center items-center bg-zinc-600 rounded-lg w-full py-3"} disabled={waiting}>
            {#if waiting}
            <svg  aria-hidden="true" class="mr-2 w-6 h-6 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
            </svg>
            맞춰보는중...
            {:else}
            <Icon class="text-lg mr-2" icon="grommet-icons:send" /> 제출
            {/if}
        </button>
    </div>
    <div>
        
    </div>
    <div class="border-b pb-2 mb-2 border-gray-100 text-sm">
        <div class="grid grid-cols-5 gap-2 my-2">
            <div class="flex col-span-2">
                <div class="mr-2 w-5">
                    #
                </div>
                <div>
                    누가
                </div>
            </div>
            <div>
                단어
            </div>
            <div>
                유사도
            </div>
            <div>
                순위
            </div>
        </div>
        {#if current_guess}
        <div class="grid grid-cols-5 gap-2">
            <div class="flex col-span-2">
                <div class="mr-2 w-5">
                    {current_guess.count}
                </div>
                <div>
                    {current_guess.name}
                </div>

            </div>
            <div class="text-[#ffc2d1] font-bold">
                {current_guess.guess}
            </div>
            <div>
                {(current_guess.sim*100).toFixed(1)}
            </div>
            <div>
                {#if current_guess.rank < 1000 && current_guess.rank > 500}
                <span class="font-bold">
                    {current_guess.rank} 😏
                </span>
                {:else if current_guess.rank < 501 && current_guess.rank > 250}
                <span class="font-bold text-[#ffe5ec]">
                    {current_guess.rank} 🙃
                </span>
                {:else if current_guess.rank < 251 && current_guess.rank > 100}
                <span class="font-bold text-[#ffc2d1]">
                    {current_guess.rank} 😋
                </span>
                {:else if current_guess.rank < 101 && current_guess.rank > 50}
                <span class="font-bold text-[#ffb3c6]">
                    {current_guess.rank} 😁
                </span>
                {:else if current_guess.rank < 51 && current_guess.rank > 10}
                <span class="font-bold text-[#ff8fab] text-base">
                    {current_guess.rank} 😝
                </span>
                {:else if current_guess.rank < 11 && current_guess.rank > 0}
                <span class="font-bold text-[#fb6f92] text-base">
                    {current_guess.rank} 🤩
                </span>
                {:else if current_guess.rank.includes("정답")}
                <span class="font-bold text-[#fb6f92] text-lg">
                    {current_guess.rank} 🥳
                </span>
                {:else}
                    {#if current_guess.sim>data.today_similarity.rest}
                    <span class="text-zinc-400 text-xs">
                        ????
                    </span>
                    {:else}
                    <span class="text-zinc-400 text-xs">
                        {current_guess.rank} 😭
                    </span>
                    {/if}
                
                {/if}
            </div>
        </div>
        {/if}
    </div>
    <div class="text-sm overflow-y-scroll">
        {#each guess_list as guess, index (index)}
        <div class={guess_text_dynamic_class(guess.rank)}>
            <div class="flex col-span-2">
                <div class="mr-2 w-5">
                    {guess.count}
                </div>
                <div>
                    {guess.name}
                </div>

            </div>
            <div>
                {guess.guess}
            </div>
            <div>
                {(guess.sim*100).toFixed(1)}
            </div>
            <div>
                {#if guess.rank < 1000 && guess.rank > 500}
                <span class="font-bold">
                    {guess.rank}
                </span>
                {:else if guess.rank < 501 && guess.rank > 250}
                <span class="font-bold text-[#ffe5ec]">
                    {guess.rank}
                </span>
                {:else if guess.rank < 251 && guess.rank > 100}
                <span class="font-bold text-[#ffc2d1]">
                    {guess.rank}
                </span>
                {:else if guess.rank < 101 && guess.rank > 50}
                <span class="font-bold text-[#ffb3c6]">
                    {guess.rank}
                </span>
                {:else if guess.rank < 51 && guess.rank > 10}
                <span class="font-bold text-[#ff8fab] text-base">
                    {guess.rank}
                </span>
                {:else if guess.rank < 11 && guess.rank > 0}
                <span class="font-bold text-[#fb6f92] text-base">
                    {guess.rank}
                </span>
                {:else if guess.rank.includes("정답")}
                <span class="font-bold text-[#fb6f92] text-lg">
                    {guess.rank} 🥳
                </span>
                {:else}
                    {#if guess.sim>data.today_similarity.rest}
                    <span class="text-zinc-400 text-xs">
                        ????
                    </span>
                    {:else}
                    <span class="text-zinc-400 text-xs">
                        {guess.rank}
                    </span>
                    {/if}
                {/if}
                
            </div>
        </div>
        {/each}
    </div>
</div>

{/if}

<style>
    .font_test {
        font-family: 'S-CoreDream-3Light';
    }
    .crowned-text::before {
        content: "👑"; /* 왕관(👑) emoji를 추가하는 부분 */
        display: inline-block;
        margin-right: 5px; /* 왕관과 텍스트 사이의 간격을 조절할 수 있습니다. */
    }

    .crowned-text {
        border: 0.25em solid transparent;
        background-image: linear-gradient(rgb(63 63 70), rgb(63 63 70)), linear-gradient(120deg, #f09 0%, #0ff 50%, #9f0 100%);
        background-origin: border-box;
        background-clip: padding-box, border-box;
        border-radius: 1.8em;
        background-size: 200% 100%;
        animation: moveGradient 4s alternate infinite;
    }

    @keyframes moveGradient {
        50% {
            background-position: 100% 50%;
        }
    }
    
</style>