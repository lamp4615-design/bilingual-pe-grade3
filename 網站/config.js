// 網站設定。Apps Script 部署完成後，把「網頁應用程式網址」貼到 APPS_SCRIPT_URL。
// 這個網址不是密碼（真正的保護是老師密碼與班級代碼）。
window.APP_CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbz6EUiB9KLz0g_VJcRb83Wn65Ucf3iEp62vfRMx6PSMC0oxPcBZjURjLh-ZDNzv4qCu/exec",        // 例：https://script.google.com/macros/s/xxxx/exec
  TEACHER_CONSOLE_URL: "",    // 教師後台網址（Apps Script 部署成「只有我自己」的那一個 /exec 網址；只有你登入 Google 才開得了）
  CLAUDE_PROJECT_URL: "",     // 「雙語備課教練」Claude 專案的網址（選填）
  SITE_TITLE: "雙語體育共學站"
};
