<script lang="ts">
    import { profileContract, wallet } from "$/tools/wallet";
    import { catchContract } from "$/tools/wallet/catch";
    import { waitContractUntil } from "$/tools/wallet/listen";
    import { utf8AsBytes32 } from "$/utils/bytes";
    import KButton from "$lib/kicho-ui/components/KButton.svelte";
    import { globalTaskNotificationManager } from "$lib/kicho-ui/components/KTaskNotification.svelte";
    import KTextField from "$lib/kicho-ui/components/KTextField.svelte";
    import { createEventDispatcher } from "svelte";

    const dispatcher = createEventDispatcher();

    let nickname = "";
    let claming = false;
    async function setName() {
        claming = true;
        try {
            await globalTaskNotificationManager.append(
                profileContract.setProfile(utf8AsBytes32("nickname"), utf8AsBytes32(nickname)),
                "Awaiting Set Profile Confirmation"
            );
            dispatcher("done");
            await globalTaskNotificationManager.append(
                waitContractUntil(profileContract, profileContract.filters.ProfileSet(wallet.account, utf8AsBytes32("nickname")), () => true),
                "Setting Profile"
            );
        } catch (error) {
            catchContract(error);
        } finally {
            claming = false;
        }
    }
</script>

<form class="claim-name-container" on:submit|preventDefault={setName}>
    <KTextField radius="rounded" bind:value={nickname} placeholder="Pick a nickname" disabled={claming} label="Claim Nickname" />
    <KButton color="gradient" radius="rounded" loading={claming}>Claim</KButton>
</form>

<style>
    .claim-name-container {
        display: grid;
        gap: 0.5em;
    }
</style>
