import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type ProfileState = {
  id: number,
  fullname: string;
  email: string;
  user_type: string;
};

const initialState: ProfileState = {
  id: 0,
  fullname: "",
  email: "",
  user_type: "",
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setProfile(state, action: PayloadAction<ProfileState>) {
      return { ...state, ...action.payload };
    },
  },
});

export const { setProfile } =
  profileSlice.actions;
export default profileSlice.reducer;
