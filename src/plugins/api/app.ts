import type { BigNumberish } from "ethers"
import { BigNumber } from "ethers"
import type { Writable } from "svelte/store"
import { get, writable } from "svelte/store"
import { cachedPromise } from "../../../modules/cachedPromise"
import { decodeBigNumberArrayToString, stringToBigNumber } from "../common/stringToBigNumber"
import { appContract } from "../wallet"
import { listenContract } from "../wallet/listen"

export const enum TimelineGroup
{
    ProfilePosts = 0,
    ProfileReplies = 1,
    ProfileMentions = 2,
    AllPostsInGroup = 3,
    LastInternal = 3,
    Replies = 4,
    Topics = 5,
    LastDefault = 5
}

function encodeMetadataKeys(keys: string[]): [BigNumber, BigNumber][]
{
    return keys.map((key) => [stringToBigNumber(key), BigNumber.from(0)])
}

function decodeMetadataResponse(reponseMetadata: ReturnType<typeof encodeMetadataKeys>): PostData['metadata']
{
    const metadata: PostData['metadata'] = {}
    for (const item of reponseMetadata)
        metadata[decodeBigNumberArrayToString([item[0]]), decodeBigNumberArrayToString([item[1]])]
    return metadata
}

export type PostData = Omit<Awaited<ReturnType<typeof appContract.getPostData>>, 'metadata'> & { metadata: Record<string, string | BigNumber> }

export const getPost = cachedPromise<{ postId: BigNumber }, Writable<PostData>>(
    (params) => params.postId.toString(),
    async (params) =>
    {
        const response = await appContract.getPostData(params.postId, encodeMetadataKeys(['hidden']));
        return writable<PostData>({ ...response, metadata: decodeMetadataResponse(response.metadata) })
    }
)

async function setPostData(postData: PostData)
{
    const key = postData.id.toString()
    getPost._getCache(key) ? getPost._getCache(key).set(postData) : getPost._setCache(key, writable(postData))
}

export const getPostRoot = cachedPromise<{ postId: BigNumber }, BigNumber[]>(
    (params) => params.postId.toString(),
    async (params) =>
    {
        const result: BigNumber[] = []
        let postData = get(await getPost(params));
        while (postData?.post.timelineGroup.eq(TimelineGroup.Replies))
        {
            postData = get(await getPost({ postId: postData.post.timelineId }));
            result.unshift(postData.id);
        }

        return result
    }
)

export type TimelineId = { group: BigNumberish, id: BigNumberish }

export interface Timeline
{
    postIds: Writable<BigNumber[]>,
    length: Writable<BigNumber>,
    loadMore(): Promise<boolean | void>,
    newToLoad: Writable<BigNumber>,
    listen(): void
    unlisten(): void
    loading: Writable<boolean>
}

const timelineListeners: Record<string, { count: number, unlisten: () => void }> = {}
export async function getTimeline({ timelineId }: { timelineId: TimelineId }): Promise<Timeline>
{
    const postIds: Writable<BigNumber[]> = writable([])
    let loading: Writable<boolean> = writable(false)
    let newToLoad: Writable<BigNumber> = writable(BigNumber.from(0))

    const length = writable(await appContract.timelineLength(timelineId.group, timelineId.id));
    const firstLength = get(length)
    let pivot = get(length)

    const timelineKey = `${timelineId.group}:${timelineId.id}`

    function listen()
    {
        if (timelineListeners[timelineKey]) timelineListeners[timelineKey].count++
        else timelineListeners[timelineKey] = {
            count: 0, unlisten: listenContract(
                appContract, appContract.filters.TimelineAddPost(timelineId.group, timelineId.id),
                async (timelineGroup: BigNumber, timelineId: BigNumber, postId: BigNumber, timelineLength: BigNumber, timestamp: BigNumber) =>
                {
                    if (timelineLength.lte(get(length))) return
                    length.set(timelineLength)
                    newToLoad.set(timelineLength.sub(firstLength))
                })
        }
    }

    function unlisten()
    {
        const listener = timelineListeners[timelineKey]
        console.log('unlisten timeline', timelineKey, listener?.count)
        if (listener && --listener.count <= 0) listener.unlisten()
    }

    async function loadMore(): Promise<boolean | void>
    {
        if (get(loading)) return
        loading.set(true)
        try
        {
            const count = 64
            const promises: Promise<PostData>[] = []
            for (let i = 0; i < count; i++)
            {
                pivot = pivot.sub(1)
                if (pivot.lt(0)) break
                postIds.update((old) => [...old, BigNumber.from(-i - 1)])
                promises.push((async () =>
                {
                    const response = await appContract.getTimelinePostData(timelineId.group, timelineId.id, pivot, encodeMetadataKeys(['hidden']))
                    const postData: PostData = { ...response, metadata: decodeMetadataResponse(response.metadata) }
                    setPostData(postData)
                    return postData
                })())
            }
            await Promise.all(promises)
            postIds.update((old) => old.slice(0, old.length - promises.length))
            for (const promise of promises)
            {
                const postData = await promise
                postIds.update((old) => [...old, postData.id])
            }
            if (promises.length < count) return false
            return true
        }
        finally
        {
            loading.set(false)
        }
    }

    return {
        postIds,
        length,
        loadMore,
        newToLoad,
        listen,
        unlisten,
        loading
    }
}