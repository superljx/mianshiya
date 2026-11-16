import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/types/user";

export type LoginStatus = "idle" | "loading" | "authenticated" | "anonymous" | "error";

export interface UserState {
  loginUser: User | null;
  status: LoginStatus;
}

const initialState: UserState = {
  loginUser: null,
  status: "idle",
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setLoginUser(state, action: PayloadAction<User | null>) {
      state.loginUser = action.payload;
      state.status = action.payload ? "authenticated" : "anonymous";
    },
    setLoginStatus(state, action: PayloadAction<LoginStatus>) {
      state.status = action.payload;
      if (action.payload === "anonymous" || action.payload === "error") {
        state.loginUser = null;
      }
    },
    clearLoginUser(state) {
      state.loginUser = null;
      state.status = "anonymous";
    },
  },
});

export const { setLoginUser, setLoginStatus, clearLoginUser } = userSlice.actions;
export default userSlice.reducer;
