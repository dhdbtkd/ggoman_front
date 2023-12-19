<script>
    import { io } from 'socket.io-client'
    import { onMount } from 'svelte';
    import _ from 'lodash';
    import Icon from '@iconify/svelte';

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
    let user_list = [];
    let guess_input;
    let invalid_text = false;
    $: {
        user_list = [...user_list];
        console.log(user_list);
    }
    onMount(()=>{
        const differenceInMilliseconds = new Date().getTime() - standard.date.getTime();
        const differenceInDays = differenceInMilliseconds / (1000 * 60 * 60 * 24);
        console.log(Math.floor(differenceInDays));
        const day_difference = Math.floor(differenceInDays);
        today_number = standard.number+day_difference;
        

        socket = io("wss://port-0-ggoman-back-koh2xlivr60m6.sel4.cloudtype.app")
        // socket = io("ws://localhost:3000")

        socket.on("connect", () => {
            if (socket.recovered) {
                // any event missed during the disconnection period will be received now
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
                    user_list.push(push_item);
                    console.log("🚀 ~ file: +page.svelte:104 ~ onMount ~ push_item:", push_item)
                    console.log("localstorage에 name이 존재하므로 rejoin");
                    user_list = [...user_list];
                    socket.emit('rejoin', name);
                }
            }
        });
        socket.on("user_list", (list)=>{
            if(list.length>0){
                user_list = [...user_list, list];
            }
        })

        socket.on("user_leave", (user_name)=>{
            console.log("🚀 떠난 친구:", user_name)
            const index = user_list.findIndex((user) => user.name == user_name.user_name);
            if (index !== -1) {
                const removed_user = user_list.splice(index, 1)[0]; // Get the removed element
                console.log(`Removed: ${removed_user}`);
                console.log(`Remaining users: ${user_list}`);
                user_list = [...user_list];
            } else {
                console.log(`Element "${user_name}" not found in array.`);
            }
        })
        socket.on("return_history", (arg)=>{
            console.log("return_history", arg);
            if(arg.number == today_number){
                guess_list = [...arg.data];
                //중복 객체 제거
                const unique = _.uniqBy(guess_list, "guess");
                //유사도 정렬
                sort_array(unique);
                guess_list = [...unique];
            }
        })
        socket.on("disconnect", () => {
            console.log(socket.connected); // false
        });
        socket.on("hello", (arg) => {
            console.log(arg); // world
        });
        socket.on("new_member",(arg)=>{
            console.log("새로운 친구 ", arg);
            user_list.push(arg);
            user_list = [...user_list];
        })
        socket.on("user_rejoin",(arg)=>{
            console.log("🚀돌아온 친구", arg)
            user_list.push(arg);
            user_list = [...user_list];
        })
        socket.on("guess_result_from_server",(arg)=>{
            guess_list = [...guess_list, arg];
            sort_array(guess_list);
            console.log("🚀 ~ file: +page.svelte:31 ~ socket.on ~ arg:", arg)
        })

        
    })
    
    const name_submit=()=>{
        socket.emit('name_submit', name);
        window.localStorage.setItem('name', name);
        user_list.push({
            socket_id : socket.id,
            name : name
        });
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
        const is_duplicate = is_duplicate_guess();
        if(is_duplicate){
            const find = guess_list.find((guess2)=>{
                return guess2.guess == guess
            })
            current_guess = find;
        } else {
            last_guess = guess;
            const url = `/api/guess?guess=${guess}&number=${today_number}`;
            const result = await fetch(url)
            .then((res)=>{
                return res.json()
            })
            .then((json)=>json)
            
            console.log("🚀 ~ file: +page.svelte:149 ~ constsubmit_guess= ~ result:", result)
            if(result.guess){
                result.number = today_number;
                result.name = name;
                result.count = guess_list.length+1;
                current_guess = result;
                guess_list.push(result);
                guess_list = [...guess_list];
                sort_array(guess_list);
                socket.emit("guess_result_to_server", result);
                invalid_text = false;
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
            class_text = "grid grid-cols-4 gap-2";
        } else if(rank > 250 && rank <501){
            class_text = "grid grid-cols-4 gap-2";
        } else if(rank > 100 && rank <251){
            class_text = "grid grid-cols-4 gap-2";
        } else if(rank > 50 && rank <101){
            class_text = "grid grid-cols-4 gap-2";
        } else if(rank > 10 && rank <51){
            class_text = "grid grid-cols-4 gap-2";
        } else if(rank > 0 && rank <11){
            class_text = "grid grid-cols-4 gap-2";
        } else if(rank == "정답!"){
            class_text = "grid grid-cols-4 gap-2";
        } else {
            class_text = "grid grid-cols-4 gap-2 text-xs text-zinc-400";
        }
        
        return class_text;
    }

</script>
{#if step == 0}
<div class="w-full h-[100dvh] flex flex-col p-4 bg-zinc-900 text-zinc-100">
    <div>
        닉네임 뭐할거야
    </div>
    <div class="mb-6">
        <label for="large-input" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">이름</label>
        <input maxlength="8" type="text" on:keydown={keydown} bind:value={name} class="block w-full p-4 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 sm:text-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
    </div>
    <div class="">
        <button on:click={name_submit}  class="bg-zinc-800 text-white rounded-lg w-full py-4"> Submit </button>
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
    <div class="flex flex-col justify-center items-center my-8">
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
        <div class="mb-3">
            지금 접속중인 친구
        </div>
        <div class="flex flex-wrap">
            {#each user_list as user,index(index)}
            <!-- {@debug user_list} -->
            {#if user.socket_id == socket.id}
            <div class="rounded-full text-sm px-3 py-1 mx-3 bg-zinc-500 my-1">
                it's me {user.name}
            </div>
            
            {:else}
            <div class="rounded-full text-sm px-3 py-1 mx-3 bg-zinc-700 my-1">
                {user.name}
            </div>

            {/if}
            {/each}
        </div>
    </div>
    <div class="my-4">
        {#if invalid_text}
            <div class="font-bold text-rose-500 my-2 text-sm">
                '{last_guess}'는 알 수 없는 단어래😒
            </div>
        {/if}
        <input placeholder="단어를 입력하세요." bind:this={guess_input} type="text" on:keydown={keydown} bind:value={guess} class="block w-full p-3 border bg-zinc-800 border-zinc-600 text-sm rounded-lg =">
    </div>
    <div class="mb-6">
        <button on:click={submit_guess} class="bg-zinc-600 rounded-lg w-full py-4"> 이건가!? </button>
    </div>
    <div>
        목록
    </div>
    <div class="border-b pb-3 border-gray-100 text-sm">
        <div class="grid grid-cols-4 gap-2 my-2">
            <div class="flex">
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
        <div class="grid grid-cols-4 gap-2">
            <div class="flex">
                <div class="mr-2 w-5">
                    {current_guess.count}
                </div>
                <div>
                    {current_guess.name}
                </div>

            </div>
            <div class="text-blue-600 font-bold">
                {current_guess.guess}
            </div>
            <div>
                {(current_guess.sim*100).toFixed(1)}
            </div>
            <div>
                {#if current_guess.rank < 1000 && current_guess.rank > 500}
                <span class="font-bold">
                    {current_guess.rank}
                </span>
                {:else if current_guess.rank < 501 && current_guess.rank > 250}
                <span class="font-bold text-[#ffe5ec]">
                    {current_guess.rank}
                </span>
                {:else if current_guess.rank < 251 && current_guess.rank > 100}
                <span class="font-bold text-[#ffc2d1]">
                    {current_guess.rank}
                </span>
                {:else if current_guess.rank < 101 && current_guess.rank > 50}
                <span class="font-bold text-[#ffb3c6]">
                    {current_guess.rank}
                </span>
                {:else if current_guess.rank < 51 && current_guess.rank > 10}
                <span class="font-bold text-[#ff8fab] text-base">
                    {current_guess.rank}
                </span>
                {:else if current_guess.rank < 11 && current_guess.rank > 0}
                <span class="font-bold text-[#fb6f92] text-base">
                    {current_guess.rank}
                </span>
                {:else if current_guess.rank.includes("정답")}
                <span class="font-bold text-[#fb6f92] text-lg">
                    {current_guess.rank}
                </span>
                {:else}
                <span class="text-zinc-400 text-xs">
                    {current_guess.rank}
                </span>
                {/if}
            </div>
        </div>
        {/if}
    </div>
    <div class="text-sm overflow-y-scroll">
        {#each guess_list as guess, index (index)}
        <div class={guess_text_dynamic_class(guess.rank)}>
            <div class="flex">
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
                    {guess.rank}
                </span>
                {:else}
                <span class="text-zinc-400 text-xs">
                    {guess.rank}
                </span>
                {/if}
                
            </div>
        </div>
        {/each}
    </div>
</div>

{/if}
