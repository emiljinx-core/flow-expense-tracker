package com.nothing.expensetracker;

public final class AppStateTracker {

    private static boolean appInForeground = false;

    private AppStateTracker() {
    }

    public static void setAppInForeground(boolean value) {
        appInForeground = value;
    }

    public static boolean isAppInForeground() {
        return appInForeground;
    }
}