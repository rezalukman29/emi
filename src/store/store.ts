import { configureStore } from '@reduxjs/toolkit';
import profileReducer from './profile'
import userPlanReducer from './userPlanSlice'

export const store = configureStore({
  reducer: {
    profile: profileReducer,
    userPlan: userPlanReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
