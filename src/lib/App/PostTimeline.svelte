<script lang="ts">
    import { Feed, getPostRoot, PostId, TimelineGroup } from "$/tools/api/feed";
    import { bigNumberAsUtf8 } from "$/utils/bytes";
    import { promiseQueue } from "$/utils/common/promiseQueue";
    import Post from "$lib/App/Post.svelte";
    import Timeline from "$lib/App/Timeline.svelte";
    import KButton from "$lib/kicho-ui/components/KButton.svelte";
    import { BigNumber } from "ethers";
    import { get } from "svelte/store";

    export let postId: PostId;

    let repliesFeed: Feed = null;
    let prefixPostIds: PostId[] = [];

    let loading = false;

    $: postId, updateReplies(postId);
    const updateReplies = promiseQueue(async (postId: PostId) => {
        if (loading) return;
        loading = true;

        const root = await getPostRoot({ postId });

        while (get(repliesFeed.loading)) await new Promise((r) => setTimeout(r, 100));

        prefixPostIds = [...root, postId];

        loading = false;
    });

    function scrollIntoViewIfNeeded(target: HTMLElement) {
        if (!target) return;
        if (target.getBoundingClientRect().bottom > window.innerHeight) target.scrollIntoView(false);
        if (target.getBoundingClientRect().top < 0) target.scrollIntoView();
    }

    const postElements: Record<string, HTMLElement> = {};
    $: currentPostsElement = postElements[postId._hex];
    let cache = null;
    $: (() => {
        if (cache === currentPostsElement) return;
        cache = currentPostsElement;
        scrollIntoViewIfNeeded(currentPostsElement);
    })();
</script>

<div class:loading class="post-reply-timeline">
    <div class="posts">
        {#if loading && prefixPostIds.length === 0}
            <Post postId={BigNumber.from(-1)} />
        {/if}
        {#each prefixPostIds as timelinePostId (timelinePostId._hex)}
            <div bind:this={postElements[timelinePostId._hex]} class="post root-post">
                <Post postId={timelinePostId} fullHeight={timelinePostId.eq(postId)}>
                    <svelte:fragment slot="before" let:postData>
                        {#if postData?.timelineGroup.eq(TimelineGroup.Topics)}
                            <div class="topic-button">
                                <KButton size="normal" color="master" href="#{bigNumberAsUtf8(postData.timelineKey)}">
                                    #{bigNumberAsUtf8(postData.timelineKey)}
                                </KButton>
                                <div>⌄</div>
                            </div>
                        {/if}
                    </svelte:fragment>
                </Post>
            </div>
        {/each}
        <b>Replies:</b>
        <Timeline bind:feed={repliesFeed} timelineId={{ group: TimelineGroup.Replies, key: postId }} let:postIds>
            {#each postIds as timelinePostId (timelinePostId._hex)}
                <div class="post">
                    <Post postId={timelinePostId} />
                </div>
            {/each}
        </Timeline>
    </div>
</div>

<style>
    .topic-button {
        display: grid;
        place-items: center;
    }

    .root-post {
        display: grid;
        gap: calc(var(--k-padding) * 5);
    }

    .root-post + .root-post::before {
        content: "";
        position: absolute;
        border-left: dashed 0.15em var(--k-color-slave);
        height: var(--gap);
        transform: translateY(-100%) translateX(calc(var(--k-padding) * 5));
    }

    .post-reply-timeline {
        display: grid;
        gap: calc(var(--k-padding) * 5);
    }

    .posts {
        display: grid;
        --gap: calc(var(--k-padding) * 3);
        gap: var(--gap);
    }

    .loading {
        opacity: 0.5;
        pointer-events: none;
    }
</style>
