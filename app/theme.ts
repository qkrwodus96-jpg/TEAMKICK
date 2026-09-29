"use client";
// 화면 모드(1.17): 시스템 · 밝게 · 어둡게. 이 기기에서만 기억한다(계정마다 다를 이유가 없다).
// 첫 칠하기 전에 layout 의 THEME 스크립트가 <html data-theme> 를 먼저 붙인다(깜빡임 방지). 여기서는 바꿀 때만 쓴다.
export type ThemeMode="system"|"light"|"dark";
export const THEME_KEY="teamkick_theme";
export function themeMode():ThemeMode{try{const v=localStorage.getItem(THEME_KEY);return v==="light"||v==="dark"?v:"system"}catch{return "system"}}
export function applyTheme(mode:ThemeMode=themeMode()){
 const dark=mode==="dark"||(mode==="system"&&window.matchMedia?.("(prefers-color-scheme: dark)").matches);
 document.documentElement.setAttribute("data-theme",dark?"dark":"light");
 document.querySelector('meta[name="theme-color"]')?.setAttribute("content",dark?"#0e1512":"#168b53");
}
export function setThemeMode(mode:ThemeMode){try{if(mode==="system")localStorage.removeItem(THEME_KEY);else localStorage.setItem(THEME_KEY,mode)}catch{}applyTheme(mode)}
