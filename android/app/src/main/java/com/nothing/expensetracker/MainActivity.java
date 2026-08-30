package com.nothing.expensetracker;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NotificationBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        AppStateTracker.setAppInForeground(true);
    }

    @Override
    public void onPause() {
        super.onPause();
        AppStateTracker.setAppInForeground(false);
    }
}
