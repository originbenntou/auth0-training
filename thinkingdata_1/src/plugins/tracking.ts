import ta from 'thinkingdata-browser'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  ta.init({
    appId: config.public.teAppId, // 送信先APP_ID
    serverUrl: config.public.teEndpoint, // 送信先パブリックネットワークURL
    autoTrack: {
      pageShow: true, // ページが表示されたときに自動でトラッキング
      pageHide: true, // ページが閉じられたときに自動でトラッキング
    },
  })

  const guestId = ta.getDistinctId() // ThinkingDataでゲストIDを自動採番

  return {
    provide: {
      getGuestId(): string {
        return guestId
      },
      taLogin(user: string) {
        ta.login(user)
      },
      taTrack(event: string, property: { [key: string]: string }) {
        ta.track(event, property)
      },
      taUserSet(user: { [key: string]: string }) {
        ta.userSet(user)
      },
    },
  }
})
