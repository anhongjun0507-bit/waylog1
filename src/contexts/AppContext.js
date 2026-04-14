import { createContext, useContext } from "react";

// 현재 App.jsx 는 props 로 user / dark / toast 등을 계층적으로 전달한다.
// 점진적 전환을 위해 Context 를 도입하되, 지금은 Provider 에서 값을 주입만 하고
// 아직 사용하지 않는 컴포넌트는 props 를 그대로 받는다.
// 이후 화면 컴포넌트를 분리(#26 후속)할 때 props 대신 useAppContext() 로 옮길 예정.

const AppContext = createContext(null);

export const AppProvider = AppContext.Provider;

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside <AppProvider>");
  return ctx;
}

// 선택적으로 읽는 훅 — Provider 바깥에서도 안전하게 null 반환
export function useOptionalAppContext() {
  return useContext(AppContext);
}
