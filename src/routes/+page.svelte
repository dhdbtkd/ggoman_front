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
    let guess_list = [];
    let user_list = [];
    let guess_input;
    $: {user_list = [...user_list]}
    onMount(()=>{
        const differenceInMilliseconds = new Date().getTime() - standard.date.getTime();
        const differenceInDays = differenceInMilliseconds / (1000 * 60 * 60 * 24);
        console.log(Math.floor(differenceInDays));
        const day_difference = Math.floor(differenceInDays);
        today_number = standard.number+day_difference;
        
        socket = io("ws://localhost:8001")

        socket.on("connect", () => {
            if (socket.recovered) {
                // any event missed during the disconnection period will be received now
            } else {
                console.log(socket.id); // x8WIv7-mJelg7on_ALbx
                console.log(socket.connected);
                socket.emit("request_history", today_number)
            }
        });
        socket.on("user_list", (list)=>{
            user_list = [...list];
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

        const localstorage_name = window.localStorage.getItem('name', name);
        if(localstorage_name){ //localstorage에 name이 있는 유저의 경우 rejoin
            name = localstorage_name;
            step = 1;
            user_list.push({
                socket_id : socket.id,
                name : name
            });
            user_list = [...user_list];
            socket.emit('rejoin', name);
        }
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
            const url = `/api/guess?guess=${guess}`;
            const result = await fetch(url)
            .then((res)=>{
                return res.json()
            })
            .then((json)=>json)
            
            if(result.guess){
                result.number = today_number;
                result.name = name;
                result.count = guess_list.length+1;
                current_guess = result;
                guess_list.push(result);
                guess_list = [...guess_list];
                sort_array(guess_list);
                socket.emit("guess_result_to_server", result)
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
        window.localStorage.removeItem("name");
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
        <div class="flex">
            {#each user_list as user,index(index)}
            <!-- {@debug user_list} -->
            <div class="rounded-full text-sm px-3 py-1 mx-3 bg-zinc-700">
                {user.name}
            </div>
            {/each}
        </div>
    </div>
    <div class="mb-4">
        <label for="large-input" class="block mb-2 text-sm font-medium">Guess it</label>
        <input bind:this={guess_input} type="text" on:keydown={keydown} bind:value={guess} class="block w-full p-3 border bg-zinc-800 border-zinc-600 text-sm rounded-lg =">
    </div>
    <div class="mb-6">
        <button on:click={submit_guess} class="bg-zinc-600 rounded-lg w-full py-4"> Submit </button>
    </div>
    <div>
        목록
    </div>
    <div class="border-b pb-3 border-gray-100 text-sm">
        <div class="grid grid-cols-4 gap-2 my-2">
            <div class="flex">
                <div class="mr-2">
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
                <div class="mr-2">
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
                {current_guess.rank}
            </div>
        </div>
        {/if}
    </div>
    <div class="text-sm">
        {#each guess_list as guess, index (index)}
        <div class="grid grid-cols-4 gap-2">
            <div class="flex">
                <div class="mr-2">
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
                {guess.rank}
            </div>
        </div>
        {/each}
    </div>
</div>

{/if}
